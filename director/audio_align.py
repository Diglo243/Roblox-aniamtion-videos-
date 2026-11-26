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
UNM0, UNM1, STRONG, NUC = 0.5, 4.0, 12.0, 0.2  # tuned: every sentence start lands on a detected pause
HOP = 0.01


def ffprobe_duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", path],
                         capture_output=True, text=True, check=True).stdout
    return float(json.loads(out)["format"]["duration"])


def load_pcm(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0


def syllable_nuclei(x):
    """Times (s) of syllable nuclei = peaks of the 300-2500 Hz energy envelope."""
    hop = int(SR * HOP)
    n = len(x) // hop
    fr = x[: n * hop].reshape(n, hop)
    spec = np.abs(np.fft.rfft(fr * np.hanning(hop), axis=1))
    f = np.fft.rfftfreq(hop, 1 / SR)
    band = spec[:, (f > 300) & (f < 2500)].sum(1)
    w = np.hanning(7)
    le = np.log(np.convolve(band, w / w.sum(), "same") + 1e-6)
    thr = np.percentile(le, 40)
    out = []
    for i in range(2, n - 2):
        if le[i] == le[max(0, i - 7): i + 8].max() and le[i] > thr and le[i] - min(le[max(0, i - 12): i].min(), le[i: i + 12].min()) > 0.6:
            out.append(i * HOP)
    return np.array(out)


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


def align(words, speech, pauses, duration, nuclei=None):
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
    # second, rate-independent estimate of where each pause falls: count of syllable nuclei before it
    match_pos = list(pause_pos)
    if nuclei is not None and len(nuclei) > 10 and pause_pos:
        tot = len(nuclei)
        match_pos = [(1 - NUC) * pp + NUC * (np.searchsorted(nuclei, pauses[k][0]) / tot * T) for k, pp in enumerate(pause_pos)]

    wts = np.array([syllables(w["word"]) * 0.19 + 0.06 for w in words])
    # extra expected time just before punctuation (lengthening)
    tot = wts.sum()
    bpos = np.cumsum(wts) / tot * T  # speech-time at end of each word
    J = len(words) - 1  # boundaries between words (after word j)
    K = len(pause_pos)

    def strength(j):
        p = words[j]["punct"]
        if re.search(r"[.!?…]", p):
            return STRONG
        if re.search(r"[,;:]", p):
            return 1.4
        return 0.25

    # Segment DP over punctuation boundaries x pauses, with a speaking-rate prior:
    # state = (pause k matched to boundary j); transition from previous match (k', j').
    syl = np.array([syllables(w["word"]) for w in words], dtype=float)
    csyl = np.concatenate([[0.0], np.cumsum(syl)])
    rate = T / max(1.0, csyl[-1])  # speech seconds per syllable
    cand = [j for j in range(J) if words[j]["punct"]]
    def bstr(j):
        return strength(j)
    anchors = {}
    if K and cand:
        # nodes: start (-1,-1) ... end (K, J)
        nodes_k = list(range(K))
        INF = 1e18
        best = {(-1, -1): (0.0, None)}
        order = [(k, j) for k in nodes_k for j in cand] + [(K, J)]
        cand_idx = {j: i for i, j in enumerate(cand)}
        def seg_cost(k0, j0, k1, j1):
            t0 = pause_pos[k0] if k0 >= 0 else 0.0
            t1 = pause_pos[k1] if k1 < K else T
            s0 = csyl[j0 + 1] if j0 >= 0 else 0.0
            s1 = csyl[j1 + 1] if j1 < J else csyl[-1]
            d, n = max(t1 - t0, 0.05), max(s1 - s0, 0.5)
            c = 6.0 * np.log(d / (n * rate)) ** 2
            # unmatched punctuation inside the segment
            c += sum(bstr(j) * 0.35 for j in cand if j0 < j < j1)
            # unmatched pauses inside the segment
            c += sum(UNM0 + UNM1 * max(0.0, pause_len[k] - 0.25) for k in range(k0 + 1, k1))
            return c
        for (k, j) in order:
            bestc, arg = INF, None
            ci = cand_idx.get(j, len(cand))
            for (k0, j0), (c0, _) in list(best.items()):
                if k0 >= k or j0 >= j or k - k0 > 6:
                    continue
                if j0 >= 0 and ci - cand_idx[j0] > 8:
                    continue
                c = c0 + seg_cost(k0, j0, k, j) - (bstr(j) * 0.5 * min(1.0, pause_len[k] / 0.3) if k < K else 0)
                if c < bestc:
                    bestc, arg = c, (k0, j0)
            if arg is not None:
                best[(k, j)] = (bestc, arg)
        node = best.get((K, J), (0, None))[1]
        while node and node != (-1, -1):
            anchors[node[1]] = node[0]
            node = best[node][1]

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
        times = align(words, speech, pauses, duration, syllable_nuclei(x))
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
