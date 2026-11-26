"""Voice-over analysis: duration, pauses, and word-level timing for the script.

Strategy
1. If faster-whisper + a local model are available (env WHISPER_MODEL=path or name),
   transcribe with word timestamps and map them onto the script words (difflib).
2. Otherwise: energy-based voice activity detection + a monotonic dynamic-programming
   alignment that snaps punctuation boundaries of the script onto detected pauses,
   then distributes words inside each speech stretch by syllable weight.
"""
import json
import os
import re
import subprocess
import sys
import unicodedata
import difflib

import numpy as np

SR = 16000
HOP = 0.01


def ffprobe_duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", path],
                         capture_output=True, text=True, check=True).stdout
    return float(json.loads(out)["format"]["duration"])


def load_pcm(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0


def vad(x, min_pause=0.16, min_speech=0.06):
    """Return list of speech intervals [(s,e)] and pauses [(s,e)] in seconds."""
    hop = int(SR * HOP)
    n = len(x) // hop
    if n == 0:
        return [], []
    frames = x[: n * hop].reshape(n, hop)
    e = 10 * np.log10(np.mean(frames ** 2, axis=1) + 1e-10)
    # smooth
    k = 5
    e = np.convolve(e, np.ones(k) / k, mode="same")
    floor = np.percentile(e, 8)
    peak = np.percentile(e, 95)
    thr = floor + max(6.0, 0.28 * (peak - floor))
    sp = e > thr
    # build intervals
    ints = []
    i = 0
    while i < n:
        if sp[i]:
            j = i
            while j < n and sp[j]:
                j += 1
            ints.append([i * HOP, j * HOP])
            i = j
        else:
            i += 1
    # merge gaps shorter than min_pause
    merged = []
    for s, t in ints:
        if merged and s - merged[-1][1] < min_pause:
            merged[-1][1] = t
        else:
            merged.append([s, t])
    merged = [m for m in merged if m[1] - m[0] >= min_speech]
    pauses = [(merged[i][1], merged[i + 1][0]) for i in range(len(merged) - 1)]
    return [tuple(m) for m in merged], pauses


VOWELS = "aeiouyàâäéèêëîïôöùûüœæ"


def syllables(w):
    w = w.lower()
    groups = re.findall(f"[{VOWELS}]+", w)
    n = len(groups)
    if w.endswith("e") and n > 1 and not w.endswith(("ée", "ie")):
        n -= 1  # silent final e (French)
    if re.fullmatch(r"\d+", w):
        n = max(2, len(w))
    return max(1, n)


def tokenize_script(text):
    """Return list of words with trailing punctuation info."""
    text = text.replace("’", "'").replace("…", "...")
    toks = []
    for m in re.finditer(r"[^\s]+", text):
        raw = m.group(0)
        core = re.sub(r"^[\"«“(\[—–-]+|[\"»”)\]]+$", "", raw)
        punct = ""
        mm = re.search(r"([.!?…,;:]+)[\"»”)\]]*$", core)
        if mm:
            punct = mm.group(1)
            core = core[: mm.start()]
        core = re.sub(r"[\"»”«“]", "", core)
        if not core and toks and punct:
            toks[-1]["punct"] += punct
            continue
        if not core:
            continue
        toks.append({"word": core, "display": raw.strip("«»\"“”"), "punct": punct, "pos": m.start()})
    return toks


def _norm(w):
    w = unicodedata.normalize("NFD", w.lower())
    w = "".join(c for c in w if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]", "", w)


def try_whisper(audio, words):
    model_name = os.environ.get("WHISPER_MODEL")
    if not model_name:
        return None
    try:
        from faster_whisper import WhisperModel
    except Exception:
        return None
    try:
        model = WhisperModel(model_name, device="cpu", compute_type="int8")
        segs, _ = model.transcribe(audio, word_timestamps=True, language=os.environ.get("WHISPER_LANG"))
        hyp = [(w.word.strip(), w.start, w.end) for s in segs for w in s.words]
    except Exception as e:
        print("[align] whisper failed:", e, file=sys.stderr)
        return None
    a = [_norm(w["word"]) for w in words]
    b = [_norm(h[0]) for h in hyp]
    sm = difflib.SequenceMatcher(a=a, b=b, autojunk=False)
    times = [None] * len(words)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal" or (tag == "replace" and i2 - i1 == j2 - j1):
            for k in range(i2 - i1):
                times[i1 + k] = (hyp[j1 + k][1], hyp[j1 + k][2])
    # interpolate gaps
    known = [i for i, t in enumerate(times) if t]
    if len(known) < max(2, len(words) // 3):
        return None
    for i in range(len(words)):
        if times[i] is None:
            prev = max([k for k in known if k < i], default=None)
            nxt = min([k for k in known if k > i], default=None)
            s = times[prev][1] if prev is not None else 0.0
            e = times[nxt][0] if nxt is not None else s + 0.3
            span = (nxt if nxt is not None else len(words)) - (prev if prev is not None else -1)
            off = i - (prev if prev is not None else -1)
            st = s + (e - s) * (off - 1) / span
            times[i] = (st, s + (e - s) * off / span)
    return times


def align(words, speech, pauses, duration):
    """DP alignment of punctuation boundaries to pauses (fallback aligner)."""
    if not speech:
        speech = [(0.0, duration)]
    # speech-time axis
    cum = [0.0]
    for s, e in speech:
        cum.append(cum[-1] + (e - s))
    T = cum[-1]
    pause_pos = [cum[i + 1] for i in range(len(speech) - 1)]  # speech-time at each pause
    pause_len = [p[1] - p[0] for p in pauses]

    wts = np.array([syllables(w["word"]) * 0.19 + 0.06 for w in words])
    # extra expected time just before punctuation (lengthening)
    tot = wts.sum()
    bpos = np.cumsum(wts) / tot * T  # speech-time at end of each word
    J = len(words) - 1  # boundaries between words (after word j)
    K = len(pause_pos)

    def strength(j):
        p = words[j]["punct"]
        if re.search(r"[.!?…]", p):
            return 3.0
        if re.search(r"[,;:]", p):
            return 1.4
        return 0.25

    if K and J:
        INF = 1e18
        # dp[k][j] = best cost having matched pauses[:k] and boundaries[:j]
        dp = np.full((K + 1, J + 1), INF)
        bt = np.zeros((K + 1, J + 1), dtype=np.int8)
        dp[0, :] = [sum(strength(jj) * 0.35 for jj in range(j)) for j in range(J + 1)]
        for k in range(1, K + 1):
            dp[k, 0] = dp[k - 1, 0] + 1.2 + 0.4 / max(pause_len[k - 1], 0.05) * 0.1
        unm_pause = lambda k: 0.6 + 0.6 * min(pause_len[k], 1.0)
        for k in range(1, K + 1):
            for j in range(1, J + 1):
                c_match = dp[k - 1, j - 1] + abs(pause_pos[k - 1] - bpos[j - 1]) * 1.6 - strength(j - 1) * 0.5 * min(1.0, pause_len[k - 1] / 0.3)
                c_skipb = dp[k, j - 1] + strength(j - 1) * 0.35
                c_skipp = dp[k - 1, j] + unm_pause(k - 1)
                best = min(c_match, c_skipb, c_skipp)
                dp[k, j] = best
                bt[k, j] = 0 if best == c_match else (1 if best == c_skipb else 2)
        k, j = K, J
        anchors = {}
        while k > 0 and j > 0:
            if bt[k, j] == 0:
                anchors[j - 1] = k - 1
                k -= 1
                j -= 1
            elif bt[k, j] == 1:
                j -= 1
            else:
                k -= 1
    else:
        anchors = {}

    # piecewise-linear warp from weight axis -> speech-time axis
    xs = [0.0] + [bpos[j] for j in sorted(anchors)] + [T]
    ys = [0.0] + [pause_pos[anchors[j]] for j in sorted(anchors)] + [T]
    starts_w = np.concatenate([[0.0], bpos[:-1]])
    ends_w = bpos
    s_sp = np.interp(starts_w, xs, ys)
    e_sp = np.interp(ends_w, xs, ys)

    def to_real(st, right):
        # map speech-time to real time; exactly on a pause boundary, a word START goes to the
        # next speech stretch (right=True) and a word END stays in the previous one.
        for i in range(len(speech)):
            b = cum[i + 1]
            if (st < b - 1e-6) if right else (st <= b + 1e-6):
                return speech[i][0] + max(0.0, st - cum[i])
        return speech[-1][1]

    out = []
    for i in range(len(words)):
        s = to_real(s_sp[i], True)
        e = to_real(e_sp[i], False)
        if e <= s:
            e = s + 0.08
        out.append((round(s, 3), round(e, 3)))
    return out


def analyze(audio_path, script_text):
    duration = ffprobe_duration(audio_path)
    x = load_pcm(audio_path)
    speech, pauses = vad(x)
    words = tokenize_script(script_text)
    times = try_whisper(audio_path, words)
    method = "whisper"
    if times is None:
        times = align(words, speech, pauses, duration)
        method = "vad-dp"
    for w, (s, e) in zip(words, times):
        w["start"], w["end"] = float(s), float(e)
    return {
        "duration": duration,
        "method": method,
        "speech": speech,
        "pauses": pauses,
        "voice_start": speech[0][0] if speech else 0.0,
        "voice_end": speech[-1][1] if speech else duration,
        "words": words,
    }


if __name__ == "__main__":
    a = analyze(sys.argv[1], open(sys.argv[2], encoding="utf-8").read())
    print(json.dumps({k: v for k, v in a.items() if k != "words"}, indent=1)[:2000])
    for w in a["words"][:40]:
        print(f'{w["start"]:7.2f} {w["end"]:7.2f} {w["word"]}{w["punct"]}')
