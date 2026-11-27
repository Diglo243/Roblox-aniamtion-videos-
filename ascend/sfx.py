#!/usr/bin/env python3
"""Ascend.Mind — effects-only soundtrack (no background music), mastered quiet.

Derived automatically from the episode: footsteps for every step climbed (per character),
whoosh + bumps when someone falls, thuds on collapse / landing, a "pop" for each pop text,
and at the summit a soft impact + sparkle + the channel's sound logo (3 golden bells, quiet).

Loudness: peaks normalised to `sfx_peak_db` (default -9 dBFS) so it never feels loud.

usage: python3 ascend/sfx.py <episode.json> <out.wav>
"""
import json
import os
import sys
import wave

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from music import SR, add, bell, kick, lowpass, note, reverb  # noqa: E402

rng = np.random.default_rng(11)


def step_tap(vel=1.0, bright=0.5):
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    nz = lowpass(rng.standard_normal(n), 0.12 + 0.25 * bright) * np.exp(-t * 55)
    thump = np.sin(2 * np.pi * (95 + 40 * bright) * t) * np.exp(-t * 40)
    return vel * (nz * 1.6 + thump * 0.6)


def whoosh(dur=0.7, vel=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    nz = rng.standard_normal(n)
    out = np.zeros(n)
    acc = 0.0
    for i in range(n):
        a = 0.02 + 0.2 * np.sin(np.pi * i / n) ** 2
        acc += a * (nz[i] - acc)
        out[i] = acc
    return vel * out * np.sin(np.pi * t / dur) ** 1.5 * 2.2


def thud(vel=1.0):
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    nz = lowpass(rng.standard_normal(n), 0.08) * np.exp(-t * 25)
    return vel * (kick(1.0, 80, 38, 0.45) * 0.9 + nz * 1.5)


def pop(vel=1.0, f0=500):
    n = int(0.18 * SR)
    t = np.arange(n) / SR
    f = f0 * (1 + 1.2 * np.exp(-t * 30))
    return vel * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 22)


def sparkle(dur=1.6, vel=1.0):
    n = int(dur * SR)
    out = np.zeros(n)
    for k in range(18):
        f = note(int(rng.integers(84, 100)))
        s = np.sin(2 * np.pi * f * np.arange(int(0.4 * SR)) / SR) * np.exp(-np.arange(int(0.4 * SR)) / SR * 12)
        i = int(rng.random() * (n - len(s)))
        out[i:i + len(s)] += s * (0.3 + 0.7 * rng.random()) * (1 - i / n)
    return vel * out


def pchip(keys):
    x = np.array([k[0] for k in keys], float)
    y = np.array([k[1] for k in keys], float)
    if len(x) == 1:
        return lambda t: y[0]
    h = np.diff(x)
    d = np.diff(y) / h
    m = np.zeros(len(x))
    m[0], m[-1] = d[0] * 0.5, d[-1] * 0.5
    for i in range(1, len(x) - 1):
        if d[i - 1] * d[i] > 0:
            w1, w2 = 2 * h[i] + h[i - 1], h[i] + 2 * h[i - 1]
            m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])

    def f(t):
        if t <= x[0]:
            return y[0]
        if t >= x[-1]:
            return y[-1]
        i = int(np.searchsorted(x, t) - 1)
        s = (t - x[i]) / h[i]
        return ((2 * s**3 - 3 * s**2 + 1) * y[i] + (s**3 - 2 * s**2 + s) * h[i] * m[i]
                + (-2 * s**3 + 3 * s**2) * y[i + 1] + (s**3 - s**2) * h[i] * m[i + 1])
    return f


def act_at(acts, t):
    cur = "climb"
    for a in acts:
        if a[0] <= t:
            cur = a[1]
    return cur


def build(ep):
    dur = float(ep["duration"])
    n = int(dur * SR)
    dry = np.zeros(n)
    summit = float(ep.get("summitAt", dur - 3))
    for li, lane in enumerate(ep.get("lanes", [])):
        S = pchip(lane.get("keys", [[0, 0]]))
        acts = sorted(lane.get("acts", []), key=lambda a: a[0])
        # footsteps: one tap per step crossed while walking/climbing (going up or on flat)
        last = np.floor(S(0))
        side = 0
        for i in range(1, int(dur * 120)):
            t = i / 120
            s = S(t)
            k = np.floor(s)
            if k != last:
                kind = act_at(acts, t)
                if kind in ("climb", "stand", "look_back", "celebrate") and k > last:
                    speed = (S(t + 0.05) - S(t - 0.05)) / 0.1
                    add(dry, step_tap(0.5 + 0.08 * side, 0.3 + 0.1 * li + 0.1 * min(1, speed / 3)), t)
                    side ^= 1
                elif kind == "fall":
                    add(dry, thud(0.28), t)
                last = k
        for a in acts:
            t0, kind = float(a[0]), a[1]
            if kind == "fall":
                add(dry, whoosh(0.8, 0.35), t0 - 0.1)
            elif kind in ("collapse", "lie"):
                add(dry, thud(0.7 if kind == "lie" else 0.55), t0)
            elif kind == "celebrate":
                for j in range(3):
                    add(dry, step_tap(0.25, 0.6), t0 + 0.3 + j * 0.59)
    for f in ep.get("fx", []):
        if f.get("type") == "pop":
            add(dry, pop(0.45, f.get("pitch", 520)), float(f["t"]))
        elif f.get("type") == "whoosh":
            add(dry, whoosh(f.get("dur", 0.6), 0.3), float(f["t"]))
    # summit: soft impact, sparkle, sound logo
    add(dry, kick(0.6, 90, 34, 1.2), summit)
    add(dry, sparkle(1.8, 0.18), summit + 0.05)
    for k, m in enumerate([81, 85, 88]):
        add(dry, bell(note(m), 3, 0.32), summit + 0.25 + k * 0.22)
    mix = reverb(dry, 1.4, 0.22)
    fo = int(0.4 * SR)
    mix[-fo:] *= np.linspace(1, 0, fo)
    peak = 10 ** (ep.get("sfx_peak_db", -9) / 20)
    mix = mix / (np.max(np.abs(mix)) + 1e-9) * peak
    return np.stack([mix, mix], 1)


def main():
    ep = json.load(open(sys.argv[1]))
    data = build(ep)
    with wave.open(sys.argv[2], "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((data * 32767).astype("<i2").tobytes())
    print("[sfx]", sys.argv[2])


if __name__ == "__main__":
    main()
