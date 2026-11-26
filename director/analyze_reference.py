"""Reference-video analysis -> style profile used to drive editing rhythm, captions and grade.

Measures: duration / resolution / fps, every hard cut (shot list + average shot length),
pacing curve (cuts per 5 s window), camera/subject motion energy per shot, caption
placement (yellow text detection: vertical position, text height, width -> words per caption,
caption change rate), colour stats (brightness / saturation), and writes a contact sheet
(one frame per shot) + caption crops so the director can inspect the reference visually.
"""
import json
import os
import re
import subprocess
import sys

import numpy as np
from PIL import Image

DEFAULT_PROFILE = {
    "source": "default (no reference video provided)",
    "duration": None,
    "avg_shot": 2.1,
    "median_shot": 1.9,
    "min_shot": 0.9,
    "max_shot": 4.0,
    "cuts_per_min": 28,
    "pacing": [],
    "motion": 0.5,
    "caption": {"present": True, "y": 0.60, "height": 0.034, "words": 2, "uppercase": True,
                 "color": "#FFE500", "outline": 9, "mode": "group", "pop": True},
    "grade": {"saturation": 1.12, "contrast": 1.04, "brightness": 0.0},
}


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def probe(path):
    out = run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
               "stream=width,height,r_frame_rate:format=duration", "-of", "json", path]).stdout
    j = json.loads(out)
    st = j["streams"][0]
    num, den = st["r_frame_rate"].split("/")
    return float(j["format"]["duration"]), int(st["width"]), int(st["height"]), float(num) / float(den)


def detect_cuts(path, thr=0.30):
    r = run(["ffmpeg", "-hide_banner", "-i", path, "-vf", f"scale=270:-2,select='gt(scene,{thr})',showinfo", "-an", "-f", "null", "-"])
    return [float(m) for m in re.findall(r"pts_time:([0-9.]+)", r.stderr)]


def sample_frames(path, fps, w=270):
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vf", f"fps={fps},scale={w}:-2", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                       capture_output=True, check=True).stdout
    return r


def analyze(path, workdir):
    os.makedirs(workdir, exist_ok=True)
    dur, W, H, fps = probe(path)
    cuts = [c for c in detect_cuts(path) if 0.2 < c < dur - 0.2]
    # drop cuts closer than 0.25s (flashes)
    clean = []
    for c in cuts:
        if not clean or c - clean[-1] > 0.25:
            clean.append(c)
    bounds = [0.0] + clean + [dur]
    shots = [round(bounds[i + 1] - bounds[i], 3) for i in range(len(bounds) - 1)]

    # frames at 4 fps for motion / captions / colour
    sw = 270
    sh = int(round(H * sw / W / 2) * 2)
    raw = sample_frames(path, 4, sw)
    n = len(raw) // (sw * sh * 3)
    fr = np.frombuffer(raw[: n * sw * sh * 3], np.uint8).reshape(n, sh, sw, 3).astype(np.float32)

    # colour
    mx, mn = fr.max(axis=3), fr.min(axis=3)
    sat = float(np.mean((mx - mn) / (mx + 1e-3)))
    bri = float(np.mean(fr) / 255)

    # motion energy (mean abs diff between consecutive samples, excluding cut transitions)
    diffs = np.mean(np.abs(np.diff(fr, axis=0)), axis=(1, 2, 3)) / 255 if n > 1 else np.zeros(1)
    motion = float(np.median(diffs)) if len(diffs) else 0.0

    # caption detection: saturated yellow pixels adjacent to dark pixels
    R, G, B = fr[..., 0], fr[..., 1], fr[..., 2]
    yellow = (R > 190) & (G > 165) & (B < 120) & ((R - B) > 110)
    dark = (R + G + B) < 120
    dark_n = np.zeros_like(dark)
    dark_n[:, 2:, :] |= dark[:, :-2, :]
    dark_n[:, :-2, :] |= dark[:, 2:, :]
    dark_n[:, :, 2:] |= dark[:, :, :-2]
    dark_n[:, :, :-2] |= dark[:, :, 2:]
    cap = yellow & dark_n
    rows = cap.sum(axis=2)  # n x sh
    present = rows.sum(axis=1) > (sw * 0.02)
    cap_info = dict(DEFAULT_PROFILE["caption"])
    ys, hs, ws = [], [], []
    sigs = []
    for i in range(n):
        if not present[i]:
            sigs.append(None)
            continue
        r = rows[i]
        thr = max(2, r.max() * 0.25)
        idx = np.where(r > thr)[0]
        if len(idx) == 0:
            sigs.append(None)
            continue
        # largest contiguous band
        bands, s = [], idx[0]
        for a, b in zip(idx[:-1], idx[1:]):
            if b - a > 3:
                bands.append((s, a))
                s = b
        bands.append((s, idx[-1]))
        y0, y1 = max(bands, key=lambda bb: rows[i][bb[0]:bb[1] + 1].sum())
        cols = np.where(cap[i, y0:y1 + 1].sum(axis=0) > 0)[0]
        if len(cols) < 3:
            sigs.append(None)
            continue
        ys.append((y0 + y1) / 2 / sh)
        hs.append((y1 - y0 + 1) / sh)
        ws.append((cols[-1] - cols[0] + 1) / sw)
        sigs.append(cap[i, y0:y1 + 1].sum(axis=0) > 0)
    if ys:
        cap_info["present"] = float(np.mean(present)) > 0.25
        cap_info["y"] = round(float(np.median(ys)), 3)
        line_h = float(np.median(hs))
        n_lines = 1
        cap_info["height"] = round(line_h / n_lines, 4)
        # chars per caption ~ width / (0.62 * letter height); words ~ chars / 5.5
        letter_h = cap_info["height"] * H
        chars = float(np.median(ws)) * W / max(1.0, 0.62 * letter_h)
        cap_info["words"] = int(np.clip(round(chars / 5.5), 1, 5))
        cap_info["mode"] = "word" if cap_info["words"] <= 1 else "group"
        # caption change rate -> seconds per caption
        changes = sum(1 for a, b in zip(sigs[:-1], sigs[1:]) if a is not None and b is not None and (len(a) != len(b) or np.mean(a != b) > 0.25))
        cap_info["changes_per_sec"] = round(changes / max(1e-3, dur), 2)
    else:
        cap_info["present"] = False

    # pacing curve: cuts per 5-second window
    pacing = [sum(1 for c in clean if k <= c < k + 5) for k in range(0, int(dur) + 1, 5)]

    # contact sheet: middle frame of each shot (max 48)
    mids = [(bounds[i] + bounds[i + 1]) / 2 for i in range(len(bounds) - 1)][:48]
    thumbs = []
    for k, t in enumerate(mids):
        out = os.path.join(workdir, f"shot_{k:02d}.jpg")
        run(["ffmpeg", "-y", "-v", "error", "-ss", f"{t:.3f}", "-i", path, "-frames:v", "1", "-vf", "scale=216:-2", out])
        if os.path.exists(out):
            thumbs.append(out)
    if thumbs:
        ims = [Image.open(p).convert("RGB") for p in thumbs]
        tw, th = ims[0].size
        cols = 8
        rows_n = (len(ims) + cols - 1) // cols
        sheet = Image.new("RGB", (cols * tw, rows_n * th), "black")
        for k, im in enumerate(ims):
            sheet.paste(im.resize((tw, th)), ((k % cols) * tw, (k // cols) * th))
        sheet.save(os.path.join(workdir, "contact_sheet.jpg"), quality=88)

    sh_arr = np.array(shots) if shots else np.array([dur])
    prof = {
        "source": os.path.basename(path),
        "duration": round(dur, 3), "width": W, "height": H, "fps": round(fps, 3),
        "num_shots": len(shots), "shots": shots, "cuts": [round(c, 3) for c in clean],
        "avg_shot": round(float(sh_arr.mean()), 3),
        "median_shot": round(float(np.median(sh_arr)), 3),
        "min_shot": round(float(np.percentile(sh_arr, 10)), 3),
        "max_shot": round(float(np.percentile(sh_arr, 90)), 3),
        "cuts_per_min": round(len(clean) / dur * 60, 1),
        "pacing": pacing,
        "motion": round(motion * 100, 3),
        "caption": cap_info,
        "grade": {"saturation": round(float(np.clip(1.0 + (sat - 0.38) * 0.8, 0.95, 1.3)), 3),
                  "contrast": 1.04, "brightness": round(float(np.clip((bri - 0.5) * 0.1, -0.05, 0.05)), 3)},
        "color": {"mean_saturation": round(sat, 3), "mean_brightness": round(bri, 3)},
    }
    # sanity clamps so the edit stays watchable even with odd references
    prof["median_shot"] = float(np.clip(prof["median_shot"], 0.7, 6.0))
    prof["min_shot"] = float(np.clip(prof["min_shot"], 0.5, prof["median_shot"]))
    prof["max_shot"] = float(np.clip(prof["max_shot"], prof["median_shot"], 8.0))
    return prof


def load_or_default(path, workdir):
    if path and os.path.exists(path):
        p = analyze(path, workdir)
    else:
        p = json.loads(json.dumps(DEFAULT_PROFILE))
    with open(os.path.join(workdir, "reference_profile.json"), "w") as f:
        json.dump(p, f, indent=1, ensure_ascii=False)
    return p


if __name__ == "__main__":
    wd = sys.argv[2] if len(sys.argv) > 2 else "work/reference"
    p = load_or_default(sys.argv[1], wd)
    print(json.dumps({k: v for k, v in p.items() if k not in ("shots", "cuts")}, indent=1, ensure_ascii=False))
