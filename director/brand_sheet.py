"""Compose the brand character sheet + one vertical card per character from rendered stills."""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ST = sys.argv[1]  # folder with <id>__front_b.jpg etc.
brand = {k: v for k, v in json.load(open(os.path.join(ROOT, "assets/brand/cast.json"))).items() if not k.startswith("_")}
F = lambda name, s: ImageFont.truetype(os.path.join(ROOT, "assets/fonts", name), s)
TITLE, BODY = "LuckiestGuy-Regular.ttf", "Poppins-800.ttf"
EXPR = [("joy", "joie"), ("shocked", "choc"), ("angry", "colère"), ("cry", "pleurs"), ("smug", "malin")]
VIOLET, ORANGE, YELLOW = (123, 63, 228), (255, 122, 26), (255, 210, 63)


def crop(img, cx=0.5, w=0.62, top=0.08, bottom=0.92):
    W, H = img.size
    x0 = int(W * (cx - w / 2)); return img.crop((x0, int(H * top), x0 + int(W * w), int(H * bottom)))


def outlined(d, xy, text, font, fill, stroke=8, anchor="la"):
    d.text(xy, text, font=font, fill=fill, stroke_width=stroke, stroke_fill=(20, 12, 40), anchor=anchor)


def wrap(d, text, font, maxw):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if d.textlength(t, font=font) > maxw and cur:
            lines.append(cur); cur = w
        else:
            cur = t
    return lines + [cur]


rows = [k for k, v in brand.items() if v.get("appearance")]
RH, PW = 520, 520
sheet = Image.new("RGB", (PW + 2 * 300 + 5 * 230 + 80, 260 + RH * (len(rows) + 1)), (32, 18, 64))
d = ImageDraw.Draw(sheet)
outlined(d, (sheet.width // 2, 70), "LA BANDE", F(TITLE, 120), YELLOW, 10, "mt")
d.text((sheet.width // 2, 205), "les personnages officiels de la chaîne", font=F(BODY, 40), fill=(255, 255, 255), anchor="mt")
for i, k in enumerate(rows + ["pixel"]):
    v = brand[k]; y = 260 + i * RH
    d.rounded_rectangle((30, y + 10, sheet.width - 30, y + RH - 10), 30, fill=(48, 28, 92))
    outlined(d, (60, y + 50), v["name"].upper(), F(TITLE, 78), ORANGE if i % 2 else YELLOW, 7)
    for j, line in enumerate(wrap(d, v["tagline"], F(BODY, 30), PW - 60)):
        d.text((62, y + 160 + j * 42), line, font=F(BODY, 30), fill=(235, 230, 255))
    x = PW + 20
    views = [("front", "face"), ("34", "3/4")]
    for vid, lbl in views:
        p = os.path.join(ST, f"{k}__{vid}_b.jpg")
        if os.path.exists(p):
            im = crop(Image.open(p), 0.5, 0.72 if k != "pixel" else 0.95, 0.12, 0.9); im = im.resize((int(im.width * (RH - 70) / im.height), RH - 70))
            im = im.crop(((im.width - 280) // 2, 0, (im.width - 280) // 2 + 280, im.height)); sheet.paste(im, (x, y + 35)); x += 300
    if k != "pixel":
        for e, lbl in EXPR:
            p = os.path.join(ST, f"{k}__{e}_b.jpg")
            im = crop(Image.open(p), 0.5, 0.95, 0.2, 0.75).resize((210, 270)); sheet.paste(im, (x, y + 90))
            d.text((x + 105, y + 375), lbl, font=F(BODY, 28), fill=YELLOW, anchor="mt"); x += 230
sheet.save(os.path.join(ROOT, "assets/brand/brand_sheet.png"))

# vertical 1080x1920 cards (TikTok "meet the cast" format)
for k in rows + ["pixel"]:
    v = brand[k]
    bg = Image.open(os.path.join(ST, f"{k}__front_b.jpg")).resize((1080, 1920))
    c = bg.copy(); d = ImageDraw.Draw(c)
    outlined(d, (540, 120), v["name"].upper(), F(TITLE, 150), YELLOW, 12, "mt")
    for j, line in enumerate(wrap(d, v["tagline"], F(BODY, 46), 900)):
        outlined(d, (540, 320 + j * 64), line, F(BODY, 46), (255, 255, 255), 6, "mt")
    if k != "pixel":
        x = 40
        for e, lbl in EXPR:
            im = crop(Image.open(os.path.join(ST, f"{k}__{e}_b.jpg")), 0.5, 0.95, 0.2, 0.75).resize((184, 236))
            d.rounded_rectangle((x - 6, 1610 - 6, x + 190, 1610 + 242), 18, fill=VIOLET); c.paste(im, (x, 1610)); x += 204
    c.save(os.path.join(ROOT, f"assets/brand/cards/{k}.png"))
print("ok", sheet.size)
