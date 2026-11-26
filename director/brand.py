"""Brand cast: the recurring characters of the TikTok account (assets/brand/cast.json).

apply(sb, project_cast) gives every character of a storyboard the look of the matching brand
character, unless the project's own cast.json pins an explicit "appearance":
  narrator "hero" -> brand hero (Nino), mother -> Maman Sofia, father -> Papa Bruno,
  grandmother / old woman -> Mamie Rose, rival / bully / rich -> Max, girl friend / sister -> Lila.
Shots may also use brand ids directly ("nino", "lila", ...). The mascot (Pixel) gets a cameo in
the first and last shots that have characters.
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRAND_P = os.path.join(ROOT, "assets", "brand", "cast.json")


def load():
    if not os.path.exists(BRAND_P):
        return {}
    d = json.load(open(BRAND_P, encoding="utf-8"))
    return {k: v for k, v in d.items() if not k.startswith("_")}


def _by_role(brand):
    return {v.get("brand_role"): k for k, v in brand.items()}


def match(cid, c, roles):
    role, g = c.get("role", ""), c.get("gender", "m")
    n = cid.lower()
    if n in ("hero", "narrateur", "moi") or c.get("narrator"):
        return roles.get("hero")
    if role == "mother" or n in ("mere", "maman"):
        return roles.get("mother")
    if role == "father" or n in ("pere", "papa"):
        return roles.get("father")
    if (role == "old" and g == "f") or n in ("mamie", "grand-mere", "grandmere"):
        return roles.get("grandma")
    if role in ("bully", "rich") or n in ("brute", "riche", "rival"):
        return roles.get("rival")
    if n in ("amie", "soeur", "copine", "meilleure_amie"):
        return roles.get("friend_f")
    return None


def apply(sb, project_cast=None, mascot=True):
    brand = load()
    if not brand:
        return sb
    roles = _by_role(brand)
    project_cast = project_cast or {}
    used = set()
    # brand ids used directly in shots
    for sh in sb["shots"]:
        for a in sh.get("actors", []):
            if a["id"] in brand and a["id"] not in sb["cast"]:
                b = brand[a["id"]]
                sb["cast"][a["id"]] = {"name": b["name"], "gender": b.get("gender", "m"), "role": "", "appearance": b.get("appearance")}
    for cid, c in sb["cast"].items():
        if project_cast.get(cid, {}).get("appearance") or c.get("appearance") and cid in project_cast:
            continue
        key = match(cid, c, roles)
        if key and key not in used and brand[key].get("appearance"):
            c["appearance"] = json.loads(json.dumps(brand[key]["appearance"]))
            c["brand"] = key
            used.add(key)
    if mascot and roles.get("pet"):
        kind = brand[roles["pet"]].get("kind", "cat")
        with_actors = [s for s in sb["shots"] if s.get("actors")]
        for s in ([with_actors[0], with_actors[-1]] if with_actors else []):
            if not any(p.get("kind") == kind for p in s.get("pets", [])):
                s.setdefault("pets", []).append({"kind": kind, "pos": [3.0, 2.0], "facing": -0.4})
    return sb
