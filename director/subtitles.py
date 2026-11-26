"""Word-synchronised TikTok captions (ASS, burned with libass): bold yellow text, thick black
outline, short word groups that pop in, positioned from the reference profile inside the
TikTok safe zone (top 12% / bottom 22% / right 14% reserved for the app UI)."""
import re


def _fmt(t):
    t = max(0.0, t)
    h = int(t // 3600)
    m = int(t % 3600 // 60)
    s = t % 60
    return f"{h}:{m:02d}:{s:05.2f}"


def _hex_to_ass(hexcol):
    hexcol = hexcol.lstrip("#")
    r, g, b = hexcol[0:2], hexcol[2:4], hexcol[4:6]
    return f"&H00{b}{g}{r}".upper()


def group_words(words, n_words=2, max_chars=16):
    groups, cur = [], []
    for w in words:
        cur.append(w)
        chars = sum(len(x["display"]) + 1 for x in cur)
        end_punct = bool(re.search(r"[.!?…,;:]", w["punct"]))
        if len(cur) >= n_words or chars >= max_chars or end_punct:
            groups.append(cur)
            cur = []
    if cur:
        groups.append(cur)
    return groups


def clean(txt, upper=True):
    txt = txt.replace("œ", "oe").replace("Œ", "OE").replace("«", "").replace("»", "").replace("“", "").replace("”", "").replace('"', "")
    txt = re.sub(r"\s+", " ", txt).strip()
    txt = txt.replace("{", "(").replace("}", ")")
    return txt.upper() if upper else txt


def build_ass(words, profile, duration, W=1080, H=1920):
    cap = profile.get("caption", {})
    n = int(cap.get("words", 2))
    y = min(0.78, max(0.30, float(cap.get("y", 0.60))))
    size = int(cap["size"]) if cap.get("size") else int(round(min(160, max(80, float(cap.get("height", 0.034)) * H / 0.54))))  # Luckiest Guy cap-height ~0.54 em
    outline = int(cap.get("outline", 9))
    color = _hex_to_ass(cap.get("color", "#FFE500"))
    pop = cap.get("pop", True)
    upper = cap.get("uppercase", True)
    mode = cap.get("mode", "group")
    font = cap.get("font", "Luckiest Guy")
    if mode == "word":
        n = 1
    groups = group_words(words, n_words=n, max_chars=14 if n <= 2 else 20)
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,{font},{size},{color},&H00FFFFFF,&H00000000,&H96000000,0,0,0,0,100,100,{cap.get("spacing", 1)},0,1,{outline},{cap.get("shadow", 4)},5,110,150,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = []
    px, py = int(W * cap.get("x", 0.47)), int(H * y)
    char_w = cap.get("char_w", 0.6)  # average glyph width / font size
    max_w = W * cap.get("max_width", 0.62)
    for gi, g in enumerate(groups):
        st = g[0]["start"]
        nxt = groups[gi + 1][0]["start"] if gi + 1 < len(groups) else None
        en = g[-1]["end"] + 0.25
        if nxt is not None and nxt - g[-1]["end"] < 0.6:
            en = nxt
        if nxt is not None:
            en = min(en, nxt)
        en = min(en, duration)
        if en - st < 0.12:
            en = st + 0.12
        txt = clean(" ".join(w["display"] for w in g), upper)
        if cap.get("lowercase"):
            txt = txt.lower()
        if cap.get("strip_punct"):
            txt = re.sub(r"[.,;:!?…]+", "", txt).strip() or txt
        fit = ""
        est = len(txt) * size * char_w
        if est > max_w:
            fit = f"\\fs{int(size * max_w / est)}"
        if pop == "soft":
            anim = r"{\fscx88\fscy88\t(0,60,\fscx100\fscy100)" + fit + "}"
        elif pop:
            anim = r"{\fscx55\fscy55\t(0,70,\fscx114\fscy114)\t(70,140,\fscx100\fscy100)" + fit + "}"
        else:
            anim = "{" + fit + "}" if fit else ""
        lines.append(f"Dialogue: 0,{_fmt(st)},{_fmt(en)},Cap,,0,0,0,,{{\\pos({px},{py})}}{anim}{txt}")
    return head + "\n".join(lines) + "\n", groups
