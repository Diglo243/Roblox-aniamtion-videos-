"""Automatic quality control of the exported video."""
import json
import os
import re
import subprocess

from PIL import Image


def _probe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", path],
                         capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def run(final, audio, sb, timing, qc_dir):
    os.makedirs(qc_dir, exist_ok=True)
    checks = {}
    j = _probe(final)
    v = next(s for s in j["streams"] if s["codec_type"] == "video")
    a = next((s for s in j["streams"] if s["codec_type"] == "audio"), None)
    num, den = v["r_frame_rate"].split("/")
    fps = float(num) / float(den)
    checks["format_9_16"] = {"ok": v["width"] == 1080 and v["height"] == 1920, "detail": f'{v["width"]}x{v["height"]}'}
    checks["fps_30"] = {"ok": abs(fps - 30) < 0.01, "detail": f"{fps:.3f} fps"}
    checks["codec"] = {"ok": v["codec_name"] == "h264" and v.get("pix_fmt") == "yuv420p" and a is not None and a["codec_name"] == "aac",
                       "detail": f'{v["codec_name"]}/{v.get("profile")}/{v.get("pix_fmt")} + {a["codec_name"] if a else "NO AUDIO"}'}
    vdur, adur = float(v.get("duration", j["format"]["duration"])), float(a["duration"]) if a else 0
    checks["duration_sync"] = {"ok": abs(vdur - timing["duration"]) < 0.1 and abs(adur - timing["duration"]) < 0.1,
                               "detail": f"video {vdur:.2f}s / audio {adur:.2f}s / voice-over {timing['duration']:.2f}s"}
    # black frames
    r = subprocess.run(["ffmpeg", "-v", "info", "-i", final, "-vf", "scale=270:-2,blackdetect=d=0.15:pic_th=0.97", "-an", "-f", "null", "-"],
                       capture_output=True, text=True)
    blacks = re.findall(r"black_start:([0-9.]+) black_end:([0-9.]+)", r.stderr)
    checks["no_black_frames"] = {"ok": not blacks, "detail": f"{len(blacks)} black segment(s) {blacks[:3]}"}
    # every sentence illustrated
    sents = sorted(set(s["sentence"] for s in sb["shots"]))
    n_sent = max(sents) + 1 if sents else 0
    checks["all_sentences_illustrated"] = {"ok": sents == list(range(n_sent)), "detail": f"{len(sents)}/{n_sent} sentences have shots"}
    # consistent cast (each character defined once, same appearance seed)
    used = sorted(set(a["id"] for s in sb["shots"] for a in s["actors"]))
    checks["cast_consistency"] = {"ok": all(u in sb["cast"] for u in used), "detail": f"{len(used)} characters used: {', '.join(used)}"}
    # shot length sanity
    lens = [s["frames"] / 30 for s in sb["shots"]]
    checks["shot_rhythm"] = {"ok": min(lens) >= 0.3 and max(lens) <= 8, "detail": f"{len(lens)} shots, min {min(lens):.2f}s, max {max(lens):.2f}s, avg {sum(lens) / len(lens):.2f}s"}
    # captions cover every word
    checks["captions"] = {"ok": all(w.get("start") is not None for w in timing["words"]), "detail": f'{len(timing["words"])} words timed ({timing["method"]})'}
    # contact sheet: middle frame of every shot
    thumbs = []
    for s in sb["shots"]:
        t = (s["start"] + s["end"]) / 2
        p = os.path.join(qc_dir, f'{s["id"]}.jpg')
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", f"{t:.3f}", "-i", final, "-frames:v", "1", "-vf", "scale=216:384", p])
        if os.path.exists(p):
            thumbs.append(p)
    if thumbs:
        cols = 9
        rows = (len(thumbs) + cols - 1) // cols
        sheet = Image.new("RGB", (cols * 216, rows * 384))
        for i, p in enumerate(thumbs):
            sheet.paste(Image.open(p), ((i % cols) * 216, (i // cols) * 384))
        sheet.save(os.path.join(qc_dir, "contact_sheet.jpg"), quality=85)
        for p in thumbs:
            os.remove(p)
    return {"passed": all(c["ok"] for c in checks.values()), "checks": checks}
