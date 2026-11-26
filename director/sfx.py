"""Procedurally synthesised sound effects (no external assets) + low-level mixing under the voice-over.

Every effect is generated deterministically with numpy, normalised to -1 dBFS peak, then placed on
the timeline at a LOW gain (default -24 dB) so the narration always stays clearly on top.
"""
import os
import subprocess
import wave

import numpy as np

SR = 48000


def _t(d):
    return np.arange(int(SR * d)) / SR


def _env(n, a=0.01, r=0.2, curve=2.0):
    e = np.ones(n)
    na, nr = max(1, int(a * SR)), max(1, int(r * SR))
    e[:na] = np.linspace(0, 1, na)
    e[-nr:] *= np.linspace(1, 0, nr) ** curve
    return e


def _noise(n, seed):
    return np.random.default_rng(seed).standard_normal(n)


def _lp(x, alpha):
    """one-pole low-pass, alpha in (0,1] (array allowed for sweeps)"""
    y = np.empty_like(x)
    acc = 0.0
    al = np.broadcast_to(alpha, x.shape)
    for i in range(len(x)):
        acc += al[i] * (x[i] - acc)
        y[i] = acc
    return y


def _norm(x, peak=0.89):
    m = np.max(np.abs(x)) + 1e-9
    return x / m * peak


def whoosh(d=0.55, seed=1):
    n = int(SR * d)
    sweep = np.linspace(0.02, 0.35, n) ** 1.5
    x = _lp(_noise(n, seed), sweep) - _lp(_lp(_noise(n, seed), sweep), 0.02)
    return _norm(x * np.sin(np.linspace(0, np.pi, n)) ** 2)


def boom(d=1.6, seed=2):
    t = _t(d)
    f = 70 * np.exp(-t * 2.5) + 35
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2)
    x += _lp(_noise(len(t), seed), 0.03) * np.exp(-t * 3) * 3
    return _norm(x)


def rumble(d=2.5, seed=3):
    n = int(SR * d)
    x = _lp(_lp(_noise(n, seed), 0.008), 0.01)
    x *= 1 + 0.5 * np.sin(2 * np.pi * 7 * _t(d))
    return _norm(x * _env(n, 0.4, 0.8, 1.0))


def crack(d=0.9, seed=4):
    n = int(SR * d)
    x = np.zeros(n)
    rng = np.random.default_rng(seed)
    for k in range(9):
        p = int(rng.uniform(0, 0.5) * SR)
        L = int(0.05 * SR)
        x[p:p + L] += _noise(L, seed + k)[: max(0, min(L, n - p))] * np.exp(-np.arange(min(L, n - p)) / (0.01 * SR))
    x = x - _lp(x, 0.05)
    return _norm(x + rumble(d, seed) * 0.3)


def ding(d=1.4, f=1320, seed=5):
    t = _t(d)
    x = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * (2.5 + m)) for m, a in ((1, 1), (2.76, 0.4), (5.4, 0.15)))
    return _norm(x * _env(len(t), 0.002, 0.05))


def cash(d=1.0, seed=6):
    a = ding(0.8, 2093)
    b = ding(0.8, 2637)
    x = np.zeros(int(SR * d))
    x[: len(a)] += a
    o = int(0.09 * SR)
    x[o:o + len(b)] += b[: len(x) - o]
    return _norm(x)


def pop(d=0.18, seed=7):
    t = _t(d)
    f = 900 * np.exp(-t * 18) + 300
    return _norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 28))


def sparkle(d=1.2, seed=8):
    rng = np.random.default_rng(seed)
    x = np.zeros(int(SR * d))
    for k in range(10):
        s = ding(0.5, rng.uniform(2200, 4200))
        o = int(rng.uniform(0, d - 0.5) * SR)
        x[o:o + len(s)] += s * rng.uniform(0.3, 1)
    return _norm(x)


def alarm(d=2.0, seed=9):
    t = _t(d)
    f = 650 + 250 * (np.sin(2 * np.pi * 1.2 * t) > 0)
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.5 + np.sin(2 * np.pi * np.cumsum(f) / SR)
    return _norm(_lp(x, 0.2) * _env(len(t), 0.05, 0.3))


def engine(d=2.5, seed=10):
    t = _t(d)
    x = np.sign(np.sin(2 * np.pi * 42 * t)) + 0.5 * np.sin(2 * np.pi * 84 * t)
    x = _lp(x + _lp(_noise(len(t), seed), 0.05) * 0.6, 0.04)
    return _norm(x * _env(len(t), 0.3, 0.6, 1.0))


def wind(d=3.0, seed=11):
    n = int(SR * d)
    mod = 0.02 + 0.03 * (1 + np.sin(2 * np.pi * 0.4 * _t(d)))
    x = _lp(_noise(n, seed), mod) - _lp(_noise(n, seed), 0.004)
    return _norm(x * _env(n, 0.6, 0.8, 1.0))


def shutter(d=0.25, seed=12):
    n = int(SR * d)
    x = np.zeros(n)
    for o in (0, int(0.07 * SR)):
        L = int(0.03 * SR)
        x[o:o + L] += (_noise(L, seed + o) - _lp(_noise(L, seed + o), 0.1)) * np.exp(-np.arange(L) / (0.006 * SR))
    return _norm(x)


def heartbeat(d=1.6, seed=13):
    t = _t(d)
    x = np.zeros(len(t))
    for o in (0.0, 0.25, 0.8, 1.05):
        i = int(o * SR)
        L = int(0.18 * SR)
        tt = np.arange(L) / SR
        x[i:i + L] += np.sin(2 * np.pi * 55 * tt) * np.exp(-tt * 22)
    return _norm(x)


def riser(d=1.5, seed=14):
    t = _t(d)
    f = 200 * np.exp(t / d * np.log(6))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.4 + _lp(_noise(len(t), seed), np.linspace(0.02, 0.4, len(t))) * 0.6
    return _norm(x * np.linspace(0, 1, len(t)) ** 2)


def cheer(d=2.5, seed=15):
    n = int(SR * d)
    rng = np.random.default_rng(seed)
    x = np.zeros(n)
    for k in range(40):  # many short "voices" = band-passed noise bursts with pitch wobble
        L = int(rng.uniform(0.3, 1.2) * SR)
        o = int(rng.uniform(0, d - 0.3) * SR)
        L = min(L, n - o)
        f0 = rng.uniform(250, 700)
        tt = np.arange(L) / SR
        v = np.sin(2 * np.pi * np.cumsum(f0 * (1 + 0.1 * np.sin(2 * np.pi * 5 * tt))) / SR) * _lp(_noise(L, seed + k), 0.05)
        x[o:o + L] += v * np.sin(np.linspace(0, np.pi, L))
    x += _lp(_noise(n, seed), 0.15) * 0.3
    return _norm(x * _env(n, 0.2, 0.6, 1.0))


LIBRARY = {"whoosh": whoosh, "boom": boom, "rumble": rumble, "crack": crack, "ding": ding, "cash": cash, "pop": pop,
           "sparkle": sparkle, "alarm": alarm, "engine": engine, "wind": wind, "shutter": shutter, "heartbeat": heartbeat,
           "riser": riser, "cheer": cheer}


def write_wav(path, x):
    x = np.clip(x, -1, 1)
    st = np.stack([x, x], axis=1)
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((st * 32767).astype(np.int16).tobytes())


def render_bed(events, duration, out_path, default_gain_db=-24.0):
    """events: list of {name, t (s), gain (dB, optional)} -> stereo wav bed of exact duration."""
    n = int(round(duration * SR))
    bed = np.zeros(n)
    cache = {}
    for ev in events:
        name = ev["name"]
        if name not in LIBRARY:
            continue
        key = (name, ev.get("dur"))
        if key not in cache:
            fn = LIBRARY[name]
            cache[key] = fn(ev["dur"]) if ev.get("dur") else fn()
        snd = cache[key] * 10 ** (ev.get("gain", default_gain_db) / 20)
        o = int(max(0, ev["t"]) * SR)
        L = min(len(snd), n - o)
        if L > 0:
            bed[o:o + L] += snd[:L]
    write_wav(out_path, bed)
    return out_path
