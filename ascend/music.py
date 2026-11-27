#!/usr/bin/env python3
"""Ascend.Mind — procedural soundtrack (royalty-free, generated) for an episode.

Dark cinematic bed in A minor (drone + heartbeat + piano arpeggio), a riser into the summit,
an impact, then the channel's SOUND LOGO: three rising golden bell notes (A5 - C#6 - E6) over a
major pad. Event thuds are added automatically on collapse / fall / lie actions.

usage: python3 ascend/music.py <episode.json> <out.wav>
"""
import json
import sys

import numpy as np

SR = 44100
rng = np.random.default_rng(7)


def note(n):  # MIDI -> Hz
    return 440.0 * 2 ** ((n - 69) / 12)


def env(n, a, d, sustain=0.0, r=0.0):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * (sustain + (1 - sustain) * np.exp(-t / max(d, 1e-4)))
    if r > 0:
        rel = int(r * SR)
        e[-rel:] *= np.linspace(1, 0, rel)
    return e


def add(buf, sig, t):
    i = int(t * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i]


def piano(f, dur, vel=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = sum(a * np.sin(2 * np.pi * f * k * t * (1 + 0.0004 * k)) * np.exp(-t * (1.2 + k * 0.9)) for k, a in [(1, 1), (2, 0.45), (3, 0.22), (4, 0.12), (5, 0.06)])
    return vel * s * env(n, 0.004, 1.6, 0, 0.05)


def bell(f, dur, vel=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * dcy) for r, a, dcy in [(1, 1, 1.1), (2.76, 0.5, 2.2), (5.4, 0.25, 4), (8.9, 0.12, 6), (0.5, 0.3, 1.5)])
    return vel * s * env(n, 0.002, 10, 0, 0.1)


def pad(freqs, dur, vel=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for f in freqs:
        for det in (-0.12, 0, 0.12):
            ff = f * 2 ** (det / 12)
            s += np.sign(np.sin(2 * np.pi * ff * t + rng.random() * 6)) * 0.15 + np.sin(2 * np.pi * ff * t) * 0.6
    # soften: one-pole lowpass
    out = np.zeros_like(s)
    a = 0.06
    acc = 0.0
    for i in range(0, n, 1):
        acc += a * (s[i] - acc)
        out[i] = acc
    return vel * out / (len(freqs) * 3) * env(n, dur * 0.35, 1e9, 1, dur * 0.4)


def kick(vel=1.0, f0=110, f1=38, dur=0.5):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return vel * np.sin(ph) * np.exp(-t * 7)


def boom(vel=1.0):
    n = int(2.5 * SR)
    t = np.arange(n) / SR
    f = 30 + 80 * np.exp(-t * 10)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6)
    nz = rng.standard_normal(n) * np.exp(-t * 9) * 0.3
    return vel * (s + lowpass(nz, 0.05))


def lowpass(x, a):
    y = np.zeros_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += a * (x[i] - acc)
        y[i] = acc
    return y


def riser(dur, vel=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    nz = rng.standard_normal(n)
    # sweep: progressively less filtering
    out = np.zeros(n)
    acc = 0.0
    for i in range(n):
        a = 0.01 + 0.25 * (i / n) ** 2
        acc += a * (nz[i] - acc)
        out[i] = acc
    tone = np.sin(2 * np.pi * np.cumsum(220 + 660 * (t / dur) ** 2) / SR) * 0.15
    return vel * (out * 2.5 + tone) * (t / dur) ** 2


def reverb(x, secs=2.2, mix=0.28):
    n = int(secs * SR)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / SR * 3.2)
    ir = lowpass(ir, 0.25)
    ir /= np.sqrt(np.sum(ir ** 2))
    m = len(x) + n
    size = 1 << (m - 1).bit_length()
    wet = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[: len(x)]
    return x * (1 - mix) + wet * mix * 1.4


def build(ep):
    dur = float(ep["duration"])
    n = int((dur + 0.0) * SR)
    music = np.zeros(n)
    hits = np.zeros(n)
    bpm = ep.get("bpm", 100)
    beat = 60 / bpm
    summit = float(ep.get("summitAt", dur - 3))
    # chords: Am F C G (A minor), each 4 beats
    prog = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
    t, bi = 0.0, 0
    while t < summit - 0.05:
        ch = prog[(bi // 4) % 4]
        if bi % 4 == 0:
            add(music, pad([note(m - 12) for m in ch], beat * 4 + 1.5, 0.55), t)
            add(music, piano(note(ch[0] - 24), beat * 4, 0.5), t)
        # arpeggio 8ths
        for k in range(2):
            nn = ch[(bi * 2 + k) % 3] + (12 if (bi * 2 + k) % 6 >= 3 else 0)
            add(music, piano(note(nn + 12), 1.4, 0.22 + 0.1 * min(1, t / summit)), t + k * beat / 2)
        # heartbeat kick, growing
        g = 0.35 + 0.65 * min(1, t / summit)
        add(hits, kick(0.9 * g), t)
        if bi % 2 == 1:
            add(hits, kick(0.5 * g, 90, 40, 0.35), t + beat * 0.28)
        t += beat
        bi += 1
    add(music, riser(2.4, 0.45), summit - 2.4)
    add(hits, boom(1.0), summit)
    # sound logo: A5 C#6 E6 golden bells + A major pad
    for k, m in enumerate([81, 85, 88]):
        add(music, bell(note(m), 4, 0.45), summit + 0.25 + k * 0.22)
    add(music, pad([note(57), note(61), note(64), note(69)], max(1.0, dur - summit + 0.5), 0.9), summit)
    add(music, piano(note(45), 4, 0.6), summit)
    # event thuds
    for lane in ep.get("lanes", []):
        for a in lane.get("acts", []):
            if a[1] in ("collapse", "fall", "lie"):
                add(hits, kick(0.5, 70, 35, 0.4), float(a[0]) + 0.05)
    mix = reverb(music, 2.6, 0.35) + reverb(hits, 1.2, 0.15)
    # fade in/out
    fi = int(0.08 * SR)
    mix[:fi] *= np.linspace(0, 1, fi)
    fo = int(0.6 * SR)
    mix[-fo:] *= np.linspace(1, 0, fo)
    mix /= np.max(np.abs(mix)) + 1e-9
    mix *= 0.89
    return np.stack([mix, mix], 1)


def main():
    ep = json.load(open(sys.argv[1]))
    out = sys.argv[2]
    data = build(ep)
    import wave
    with wave.open(out, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((data * 32767).astype("<i2").tobytes())
    print("[music]", out)


if __name__ == "__main__":
    main()
