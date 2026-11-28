#!/usr/bin/env python3
"""Roblox-style 3D TikTok video director — full automatic pipeline.

    python3 director/run.py projects/<name> [--from STAGE] [--workers N] [--keep-storyboard]

projects/<name>/input/   script.txt (or .md)  +  voice-over (mp3/wav/m4a/...)  +  reference video (mp4/mov/webm)
projects/<name>/work/    reference analysis, timing, storyboard, rendered shots, subtitles, QC
projects/<name>/output/final_tiktok_video.mp4   (1080x1920, 30 fps, H.264 High + AAC)

Stages: analyze -> storyboard -> render -> assemble -> qc
"""
import argparse
import glob
import json
import os
import shutil
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

import analyze_reference  # noqa: E402
import audio_align  # noqa: E402
import storyboard as sbmod  # noqa: E402
import subtitles  # noqa: E402

STAGES = ["analyze", "storyboard", "render", "assemble", "qc"]
AUDIO_EXT = (".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".opus")
VIDEO_EXT = (".mp4", ".mov", ".webm", ".mkv", ".avi", ".m4v")


def log(*a):
    print("[director]", *a, flush=True)


def find_inputs(proj):
    inp = os.path.join(proj, "input")
    files = sorted(glob.glob(os.path.join(inp, "*")))
    script = next((f for f in files if f.lower().endswith((".txt", ".md"))), None)
    audio = next((f for f in files if f.lower().endswith(AUDIO_EXT)), None)
    ref = next((f for f in files if f.lower().endswith(VIDEO_EXT)), None)
    missing = [n for n, f in (("script (.txt)", script), ("voice-over (audio)", audio)) if not f]
    if missing:
        sys.exit(f"Missing input(s) in {inp}: {', '.join(missing)}")
    if not ref:
        log("WARNING: no reference video found -> using the default Roblox-story style profile")
    return script, audio, ref


def jdump(obj, path):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=1, ensure_ascii=False)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("project")
    ap.add_argument("--from", dest="start", default="analyze", choices=STAGES)
    ap.add_argument("--to", dest="stop", default="qc", choices=STAGES)
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--keep-storyboard", action="store_true", help="do not regenerate an existing (hand-edited) storyboard.json")
    args = ap.parse_args()
    proj = os.path.abspath(args.project)
    name = os.path.basename(proj.rstrip("/"))
    work = os.path.join(proj, "work")
    out_dir = os.path.join(proj, "output")
    os.makedirs(work, exist_ok=True)
    os.makedirs(out_dir, exist_ok=True)
    script_p, audio_p, ref_p = find_inputs(proj)
    script = open(script_p, encoding="utf-8").read()
    run_stages = STAGES[STAGES.index(args.start): STAGES.index(args.stop) + 1]
    t_start = time.time()

    prof_p = os.path.join(work, "reference", "reference_profile.json")
    timing_p = os.path.join(work, "timing.json")
    sb_p = os.path.join(work, "storyboard.json")
    seg_dir = os.path.join(work, "shots")
    final_p = os.path.join(out_dir, "final_tiktok_video.mp4")

    # ------------------------------------------------------------ analyze
    if "analyze" in run_stages:
        log("1/5 analysing reference video:", ref_p or "(none)")
        os.makedirs(os.path.join(work, "reference"), exist_ok=True)
        prof = analyze_reference.load_or_default(ref_p, os.path.join(work, "reference"))
        log(f"    shots={prof.get('num_shots')} median_shot={prof['median_shot']}s cuts/min={prof.get('cuts_per_min')} "
            f"caption y={prof['caption'].get('y')} words/caption={prof['caption'].get('words')}")
        log("2/5 analysing voice-over:", audio_p)
        timing = audio_align.analyze(audio_p, script)
        jdump(timing, timing_p)
        log(f"    duration={timing['duration']:.2f}s words={len(timing['words'])} pauses={len(timing['pauses'])} method={timing['method']}")
    prof = json.load(open(prof_p))
    style_p = os.path.join(proj, "style.json")  # director's manual corrections of the measured style
    brand_style_p = os.path.join(ROOT, "assets", "brand", "style.json")  # channel-wide defaults (captions, rhythm)
    for sp in (brand_style_p, style_p):
        if not os.path.exists(sp):
            continue
        st = json.load(open(sp))
        if sp == style_p and st.get("brand_style") is False:
            continue
        for k, v in st.items():
            if k.startswith("_"):
                continue
            if isinstance(v, dict) and isinstance(prof.get(k), dict):
                prof[k].update(v)
            else:
                prof[k] = v
    timing = json.load(open(timing_p))

    # ---------------------------------------------------------- storyboard
    if "storyboard" in run_stages and not (args.keep_storyboard and os.path.exists(sb_p)):
        log("3/5 building storyboard (scene breakdown, cast, camera plan)")
        cast_p = os.path.join(proj, "cast.json")
        cast_override = json.load(open(cast_p)) if os.path.exists(cast_p) else None
        dir_p = os.path.join(proj, "direction.json")
        if os.path.exists(dir_p):
            log("    using hand-directed shot list:", dir_p)
            sb = sbmod.build_from_direction(json.load(open(dir_p, encoding="utf-8")), timing, prof)
            if cast_override:
                sb["cast"].update(cast_override)
        else:
            sb = sbmod.build_storyboard(script, timing, prof, cast_override)
        if prof.get("brand", True):
            import brand
            sb = brand.apply(sb, cast_override, mascot=prof.get("mascot", True))
            log("    brand cast:", ", ".join(f"{k}->{v['brand']}" for k, v in sb["cast"].items() if v.get("brand")) or "(no match)")
        jdump(sb, sb_p)
        if not os.path.exists(cast_p):
            jdump(sb["cast"], cast_p)  # editable: names, gender, role, optional "appearance"
        with open(os.path.join(work, "storyboard.txt"), "w", encoding="utf-8") as f:
            for s in sb["shots"]:
                f.write(f'{s["id"]} {s["start"]:6.2f}-{s["end"]:6.2f}  {s["env"]:<11} {s["time"]:<6} {s["camera"]["type"]:<10} '
                        + " | ".join(f'{a["id"]}:{a.get("action")}/{a.get("emotion")}' for a in s["actors"])
                        + f'  fx={",".join(s["fx"])}\n      « {s.get("text", "")} »\n')
        log(f"    {len(sb['shots'])} shots, {len(sb['cast'])} characters, avg shot {timing['duration'] / len(sb['shots']):.2f}s")
    sb = json.load(open(sb_p))

    # --------------------------------------------------------------- render
    if "render" in run_stages:
        log(f"4/5 rendering {len(sb['shots'])} shots in 3D (workers={args.workers})")
        r = subprocess.run(["node", os.path.join(HERE, "render.js"), sb_p, seg_dir, "--workers", str(args.workers)], cwd=ROOT)
        if r.returncode:
            sys.exit("render failed")

    # ------------------------------------------------------------- assemble
    if "assemble" in run_stages:
        log("5/5 assembling: shots + captions + voice-over -> H.264/AAC")
        ass, groups = subtitles.build_ass(timing["words"], prof, timing["duration"])
        ass_p = os.path.join(work, "captions.ass")
        open(ass_p, "w", encoding="utf-8").write(ass)
        lst = os.path.join(work, "concat.txt")
        with open(lst, "w") as f:
            for s in sb["shots"]:
                seg = os.path.join(seg_dir, f'{s["id"]}.mp4')
                if not os.path.exists(seg):
                    sys.exit(f"missing rendered shot {seg}")
                f.write(f"file '{seg}'\n")
        raw = os.path.join(work, "video_raw.mp4")
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", raw], check=True)
        audio_in = audio_p
        amix = None
        if sb.get("sfx"):
            import sfx as sfxmod
            bed = os.path.join(work, "sfx_bed.wav")
            sfxmod.render_bed(sb["sfx"], timing["duration"], bed, prof.get("sfx_gain_db", -24.0))
            amix = bed
            log(f"    {len(sb['sfx'])} sound effects mixed at low level ({prof.get('sfx_gain_db', -24.0)} dB)")
        g = prof.get("grade", {})
        vf = (f"eq=saturation={g.get('saturation', 1.12)}:contrast={g.get('contrast', 1.04)}:brightness={g.get('brightness', 0.0)},"
              f"vignette=angle=0.55,ass=captions.ass:fontsdir={os.path.join(ROOT, 'assets', 'fonts')},format=yuv420p")
        dur = timing["duration"]
        inputs = ["-i", raw, "-i", audio_in] + (["-i", amix] if amix else [])
        # sound effects are ducked under the voice (sidechain) so they never cover it
        afc = (";[1:a]aresample=48000,aformat=channel_layouts=stereo,asplit=2[vo][vsc];[2:a]aresample=48000,aformat=channel_layouts=stereo[fx];"
               "[fx][vsc]sidechaincompress=threshold=0.015:ratio=5:attack=15:release=350:makeup=1[fxd];"
               "[vo][fxd]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]") if amix else ""
        cmd = ["ffmpeg", "-y", "-v", "error"] + inputs + ["-filter_complex", f"[0:v]{vf}[v]{afc}",
               "-map", "[v]", "-map", "[a]" if amix else "1:a:0", "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-profile:v", "high", "-level", "4.2",
               "-r", "30", "-g", "60", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
               "-movflags", "+faststart", "-t", f"{dur:.3f}", final_p]
        subprocess.run(cmd, check=True, cwd=work)
        repo_out = os.path.join(ROOT, "output", name)
        os.makedirs(repo_out, exist_ok=True)
        shutil.copy2(final_p, os.path.join(repo_out, "final_tiktok_video.mp4"))
        log("    ->", final_p)

    # ------------------------------------------------------------------- qc
    if "qc" in run_stages:
        import qc
        rep = qc.run(final_p, audio_p, sb, timing, os.path.join(work, "qc"))
        jdump(rep, os.path.join(work, "qc", "qc_report.json"))
        for k, v in rep["checks"].items():
            log(f"    QC {'OK ' if v['ok'] else 'FAIL'} {k}: {v['detail']}")
        log("QC", "PASSED" if rep["passed"] else "FAILED")
    log(f"done in {time.time() - t_start:.0f}s")


if __name__ == "__main__":
    main()
