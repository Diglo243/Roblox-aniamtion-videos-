#!/usr/bin/env python3
"""Ascend.Mind — one command per video.

usage: python3 ascend/make.py ascend/episodes/<episode>.json [--workers 4]
→ output/ascend/<episode>.mp4  (1080x1920, 30 fps, H.264 + AAC, YouTube Shorts / TikTok ready)
"""
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    ep = sys.argv[1]
    name = os.path.splitext(os.path.basename(ep))[0]
    out_dir = os.path.join(ROOT, "output", "ascend")
    work = os.path.join(out_dir, "work")
    os.makedirs(work, exist_ok=True)
    silent = os.path.join(work, name + "_video.mp4")
    wav = os.path.join(work, name + "_music.wav")
    extra = sys.argv[2:]
    subprocess.run(["node", os.path.join(ROOT, "ascend", "render.js"), ep, silent] + extra, check=True)
    subprocess.run([sys.executable, os.path.join(ROOT, "ascend", "music.py"), ep, wav], check=True)
    final = os.path.join(out_dir, name + ".mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", silent, "-i", wav, "-map", "0:v", "-map", "1:a",
                    "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-profile:v", "high", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", final], check=True)
    print("[make] ->", final)


if __name__ == "__main__":
    main()
