"""Script + word timings + reference profile  ->  storyboard (cast + timed shot list).

Rule-based French/English scene understanding:
  * characters  : narrator ("je"), proper names, role nouns (mère, prof, policier...), crowds,
                  pronoun resolution (il/elle/lui) to the last compatible character
  * location    : keyword lexicon with persistence between sentences
  * time of day : jour / soir / nuit markers with persistence
  * action, emotion, symbol, props, FX : ordered rule table
  * shots       : each sentence is split into sub-shots whose length follows the reference
                  editing rhythm; camera grammar depends on the beat type (establish, emotion,
                  shock, dialogue, action, suspense, ending) and never repeats back-to-back.
"""
import json
import math
import re
import unicodedata

FPS = 30


def strip_accents(s):
    s = unicodedata.normalize("NFD", s)
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


def norm(s):
    s = s.lower().replace("’", "'").replace("œ", "oe").replace("æ", "ae")
    return strip_accents(s)


# ------------------------------------------------------------------ lexicons
LOCATIONS = [  # (regex on normalised text, env, interior?)  -- earlier = more specific
    (r"\b(en classe|salle de classe|classroom|en cours|au cours|tableau noir|la maitresse|le prof\b)", "classroom", True),
    (r"\b(couloir|casier|hallway|corridor|lockers?)\b", "hallway", True),
    (r"\b(chambre|bedroom|mon lit|son lit|au lit)\b", "bedroom", True),
    (r"\b(cuisine|kitchen|frigo|diner|dejeuner|petit-dejeuner|repas|dinner|breakfast)\b", "kitchen", True),
    (r"\b(magasin|supermarche|boutique|epicerie|caisse|store|shop|mall)\b", "store", True),
    (r"\b(hopital|urgences|clinique|hospital)\b", "hospital", True),
    (r"\b(salon|canape|television|tele|a la maison|chez moi|chez nous|chez lui|chez elle|at home|living room|inside the house)\b", "living_room", True),
    (r"\b(devant (la|ma|sa|notre) maison|jardin|pelouse|porte d'entree|front yard|in front of (the|my|his|her) house)\b", "house_ext", False),
    (r"\b(recre|recreation|cour de l'ecole|devant l'ecole|a l'ecole|l'ecole|ecole|college|lycee|school)\b", "school_ext", False),
    (r"\b(parc|aire de jeux|park|playground)\b", "park", False),
    (r"\b(foret|bois|forest|woods)\b", "forest", False),
    (r"\b(plage|mer|ocean|beach|sea)\b", "beach", False),
    (r"\b(ville|centre-ville|restaurant|banque|city|downtown|bank)\b", "city", False),
    (r"\b(rue|quartier|trottoir|dehors|chemin|route|street|outside|road|neighborhood)\b", "street", False),
    (r"\b(maison|house|home)\b", "living_room", True),
]

ROLES = [  # (regex, id, gender, role)
    (r"\b(ma|sa|ta|notre|la|leur) (mere|maman)\b|\bmaman\b|\b(my|his|her) (mom|mother)\b", "mere", "f", "mother"),
    (r"\b(mon|son|ton|notre|le|leur) (pere|papa)\b|\bpapa\b|\b(my|his|her) (dad|father)\b", "pere", "m", "father"),
    (r"\b(grand-mere|mamie|grandma|grandmother)\b", "mamie", "f", "old"),
    (r"\b(grand-pere|papi|grandpa|grandfather)\b", "papi", "m", "old"),
    (r"\b(maitresse|professeure|institutrice|teacher)\b", "prof", "f", "teacher_f"),
    (r"\b(prof|professeur|maitre|instituteur)\b", "prof_m", "m", "teacher"),
    (r"\b(directeur|principal)\b", "directeur", "m", "teacher"),
    (r"\b(directrice)\b", "directrice", "f", "teacher_f"),
    (r"\b(policier|policiers|police|gendarme|officer|cop)\b", "policier", "m", "police"),
    (r"\b(docteur|medecin|doctor|infirmi\w*|nurse)\b", "docteur", "m", "doctor"),
    (r"\b(ma|sa|ta) (soeur|sœur)\b|\bsister\b", "soeur", "f", "child"),
    (r"\b(mon|son|ton) (frere|petit frere|grand frere)\b|\bbrother\b", "frere", "m", "child"),
    (r"\b(bebe|baby)\b", "bebe", "m", "baby"),
    (r"\b(voisine)\b", "voisine", "f", ""),
    (r"\b(voisin|neighbou?r)\b", "voisin", "m", ""),
    (r"\b(caissiere|vendeuse|cashier)\b", "caissiere", "f", ""),
    (r"\b(caissier|vendeur|patron|boss)\b", "patron", "m", ""),
    (r"\b(meilleure amie|ma copine|mon amie|best friend)\b", "amie", "f", ""),
    (r"\b(meilleur ami|mon copain|mon ami|mon pote)\b", "ami", "m", ""),
    (r"\b(un|le|ce) (garcon|homme|monsieur|type|gars|boy|man|guy)\b", "garcon", "m", ""),
    (r"\b(une|la|cette) (fille|femme|dame|girl|woman|lady)\b", "fille", "f", ""),
    (r"\b(brute|harceleur|caid|bully)\b", "brute", "m", "bully"),
    (r"\b(milliardaire|millionnaire|billionaire)\b", "riche", "m", "rich"),
]
CROWD = r"\b(tout le monde|tous les eleves|les eleves|les autres|toute la classe|les gens|tous|everyone|everybody|classmates|the other kids|people)\b"
PETS = [(r"\b(chien|chiot|dog|puppy)\b", "dog"), (r"\b(chat|chaton|cat|kitten)\b", "cat")]
PROPS = [
    (r"\b(telephone|portable|smartphone|phone)\b", "phone"), (r"\b(argent|billets?|dollars?|euros?|robux|money|cash)\b", "money"),
    (r"\b(gateau|cake)\b", "cake"), (r"\b(cadeau|gift|present)\b", "gift"), (r"\b(livre|cahier|book)\b", "book"),
    (r"\b(sac|cartable|backpack|bag)\b", "bag"), (r"\b(ballon|balle|ball)\b", "ball"), (r"\b(pizza)\b", "pizza"),
    (r"\b(lettre|enveloppe|letter)\b", "letter"), (r"\b(trophee|coupe|medaille|trophy)\b", "trophy"),
    (r"\b(epee|sword)\b", "sword"), (r"\b(cle|cles|key)\b", "key"),
]
NAME_STOP = set(norm(w) for w in """Je Tu Il Elle On Nous Vous Ils Elles Le La Les Un Une Des Et Mais Ou Donc Or Ni Car Alors Puis Ensuite
Quand Lorsque Si Ce Cette Ces Mon Ma Mes Ton Ta Tes Son Sa Ses Notre Nos Votre Vos Leur Leurs Chaque Tout Toute Tous Toutes
Un Jour Le Soir Matin Parce Pourquoi Comment Devinez Personne Rien Oui Non Ne Pas Plus Moi Toi Lui Eux Dans En Au Aux Du De Des
Pendant Depuis Après Avant Avec Sans Sous Sur Vers Chez Quelques Plusieurs Aujourd Hier Demain Bonjour Merci Salut Hey Oh Ah
Lundi Mardi Mercredi Jeudi Vendredi Samedi Dimanche Janvier Février Mars Avril Mai Juin Juillet Août Septembre Octobre Novembre Décembre
Noël Roblox Dieu C Qu J L D N S M T Voilà Soudain Enfin Finalement Heureusement Malheureusement Pourtant Cependant Comme Même
The A An And But Or So Then When If This That These Those My Your His Her Our Their Every Everyone One Day Night Morning
I You He She We They It Me Him Them Because Why How Guess Nobody Nothing Yes No Not Suddenly Finally Later Years After Before With""".split())
FEMALE_END = ("a", "ie", "ine", "elle", "ette", "ise", "ia", "anne", "enne", "ice", "ah", "ee", "line", "rine", "lle")
MALE_NAMES = set("leo luca lucas hugo louis theo nathan noah jules adam arthur gabriel raphael tom kevin enzo mathis maxime paul pierre jean marc luc eric alexandre antoine baptiste clement dylan ethan mehdi rayan yanis sami karim mohamed ibrahim mike jake john james david daniel alex ryan noob bob steve josh ben sam max felix victor oscar".split())
FEMALE_NAMES = set("emma lea chloe manon ines jade lina louise alice camille sarah julie marie lucie clara zoe eva nina lola rose anna mia emily lily sophie amelie laura charlotte jessica maya".split())

# ordered rules: first matching rule sets the main action; fx / symbols accumulate
RULES = [
    # beat, regex, params
    ("intro", r"\b(je m'appelle|my name is|moi c'est|je suis \w+ et j'ai \d+ ans)\b", dict(action="wave", emotion="happy", beat="intro")),
    ("suspense", r"\b(devinez|devine qui|guess who|guess what|personne ne savait|nobody knew|mysteri\w*|secret)\b", dict(action="think", emotion="think", symbol="?", fx=[], beat="suspense")),
    ("reveal", r"^\s*(c'etait|c etait|it was)\b", dict(action="idle", emotion="smug", fx=["flash", "punch"], beat="reveal")),
    ("cry", r"\b(pleur\w*|larmes?|sanglot\w*|cry|cried|crying|tears)\b", dict(action="cry", emotion="cry", fx=["dark"], beat="emo")),
    ("shock", r"\b(choque\w*|sous le choc|stupefai\w*|bouche bee|n'en reven\w*|n'en croyai\w*|choc|shocked|stunned|couldn't believe)\b", dict(action="shocked", emotion="shocked", symbol="!", fx=["punch", "flash"], beat="shock")),
    ("scream", r"\b(cri[ae]\w*|hurl\w*|scream\w*|shout\w*|yell\w*)\b", dict(action="angry", emotion="scream", fx=["shake"], beat="shock")),
    ("angry", r"\b(en colere|furieu\w*|enrag\w*|fache\w*|angry|furious|mad at)\b", dict(action="angry", emotion="angry", symbol="anger", beat="power")),
    ("scared", r"\b(peur|effray\w*|terrifi\w*|trembl\w*|panique\w*|scared|afraid|terrified)\b", dict(action="scared", emotion="scared", symbol="sweat", fx=["dark"], beat="suspense")),
    ("mock", r"\b(se moqu\w*|moquai\w*|ri(ai)?(en)?t de|riaient|rigol\w*|ricana\w*|humili\w*|laughed at|made fun|mock\w*|bully\w*|harcel\w*)\b", dict(action="laugh", emotion="evil", beat="mock", react="sad")),
    ("hug", r"\b(serr\w* dans (ses|mes|ses|leurs) bras|calin|enlac\w*|hug\w*|embrass\w*)\b", dict(action="hug", emotion="happy", fx=["hearts"], beat="hug", react="hug")),
    ("throw", r"\b(jet\w*|lanc\w*|pouss\w*|frapp\w*|battu|gifl\w*|threw|throw|pushed|push|hit|punch\w*|slapped)\b", dict(action="push", emotion="angry", fx=["shake"], beat="action", react="shocked")),
    ("fall", r"\b(tomb\w*|glissa\w*|fell|fall|tripped)\b", dict(action="fall", emotion="shocked", fx=["shake"], beat="action")),
    ("rich", r"\b((devenu|devenue|gagn\w*) (riche|millionnaire|de l'argent|beaucoup)|millions?|fortune|became rich|got rich)\b", dict(action="celebrate", emotion="greedy", fx=["money"], beat="win")),
    ("win", r"\b(gagn\w*|reussi\w*|victoire|celebr\w*|fete|anniversaire|bravo|won|win|celebrat\w*|birthday)\b", dict(action="celebrate", emotion="joy", fx=["confetti"], beat="win")),
    ("open", r"\b(ouvert (mon|ma|son|sa|notre)|ouvrir (mon|ma|son|sa)|cree (mon|ma|son|sa)|opened (my|his|her))\b", dict(action="wave", emotion="happy", fx=["sparkles"], beat="win")),
    ("sleep", r"\b(dorm\w*|endormi\w*|couch\w*|sommeil|sleep\w*|slept)\b", dict(action="sleep", emotion="sleep", symbol="zzz", beat="neutral")),
    ("work", r"\b(travaill\w* dur|etudi\w*|revis\w*|devoirs|programm\w*|work\w* hard|stud\w*|homework)\b", dict(action="sit_work", emotion="think", beat="neutral")),
    ("phone", r"\b(telephon\w*|appel\w*|un message|sms|texto|phone|called|texted)\b", dict(action="phone", emotion="neutral", prop="phone", beat="dialogue")),
    ("eat", r"\b(mang\w*|eat\w*|ate)\b", dict(action="eat", emotion="happy", beat="neutral")),
    ("run", r"\b(cour(u|ai\w*|t|ir|s)|s'enfui\w*|fui\w*|se precipit\w*|ran|run\w*|rushed)\b", dict(action="run", emotion="scared", fx=["speed"], beat="action")),
    ("enter", r"\b(entr\w*|arriv\w*|est venu\w*|entered|arrived|walked in|came in)\b", dict(action="walk", emotion="neutral", beat="action", move="in")),
    ("walk", r"\b(march\w*|se promen\w*|rentr\w*|allai\w*|walk\w*)\b", dict(action="walk", emotion="neutral", beat="action")),
    ("dance", r"\b(dansai\w*|danse[rz]?|danced|dance|dancing)\b", dict(action="dance", emotion="joy", beat="win")),
    ("jump", r"\b(saut\w*|bondi\w*|jump\w*)\b", dict(action="jump", emotion="joy", beat="win")),
    ("hide", r"\b(cach\w*|hid|hide|hiding)\b", dict(action="sneak", emotion="scared", beat="suspense")),
    ("beg", r"\b(suppli\w*|a genoux|begged|kneel\w*)\b", dict(action="kneel", emotion="cry", beat="emo")),
    ("give", r"\b(donn\w*|offert|offr\w*|gave|give|offered)\b", dict(action="give", emotion="happy", beat="dialogue")),
    ("smile", r"\b(souri\w*|smil\w*)\b", dict(action="idle", emotion="happy", beat="neutral")),
    ("think", r"\b(pens\w*|reflech\w*|se demand\w*|wonder\w*|think\w*|thought)\b", dict(action="think", emotion="think", symbol="?", beat="suspense")),
    ("say", r"(\b(dit|dis|disait|demand\w*|repond\w*|expliqu\w*|parl\w*|annonc\w*|said|told|asked|replied|says)\b|«|\")", dict(action="talk", emotion="neutral", beat="dialogue", react="listen")),
    ("happy", r"\b(content\w*|heureu\w*|joie|fier|fiere|happy|proud|glad)\b", dict(action="idle", emotion="happy", beat="neutral")),
    ("sad", r"\b(triste|desespere\w*|malheureu\w*|seul|seule|abandonne\w*|pauvre|troue|dechir\w*|sad|lonely|alone|poor)\b", dict(action="sad", emotion="sad", beat="sad")),
    ("love", r"\b(amour|coeur|aime|love|heart)\b", dict(action="idle", emotion="love", fx=["hearts"], beat="neutral")),
]
SUDDEN = r"\b(soudain\w*|tout a coup|brusquement|suddenly|all of a sudden)\b"
LATER = r"\b(des annees plus tard|des mois plus tard|plus tard|le lendemain|years later|months later|the next day)\b"
NIGHT = r"\b(nuit|soir|minuit|ce soir|night|evening|midnight)\b"
DAY = r"\b(matin|jour|lendemain|midi|morning|day|noon)\b"
SUNSET = r"\b(coucher de soleil|crepuscule|sunset)\b"

CAMERA_BY_BEAT = {
    "intro": ["crash_zoom", "medium", "low"],
    "establish": ["establish", "wide"],
    "emo": ["closeup", "high", "medium", "xcu"],
    "shock": ["crash_zoom", "xcu", "low"],
    "reveal": ["crash_zoom", "low", "closeup"],
    "power": ["low", "dutch", "closeup"],
    "sad": ["high", "closeup", "medium"],
    "suspense": ["dutch", "closeup", "truck", "low"],
    "action": ["follow", "truck", "low", "wide"],
    "dialogue": ["ots", "two_shot", "closeup", "orbit"],
    "mock": ["two_shot", "low", "closeup", "wide"],
    "hug": ["two_shot", "orbit", "wide"],
    "win": ["low", "orbit", "wide", "crash_zoom"],
    "neutral": ["medium", "orbit", "truck", "closeup", "low", "two_shot"],
    "ending": ["orbit", "wide", "establish"],
}


# ------------------------------------------------------------------ helpers
def split_sentences(words):
    """Group aligned words into sentences (end at . ! ? … or closing of a quote)."""
    sents, cur = [], []
    for i, w in enumerate(words):
        cur.append(i)
        if re.search(r"[.!?…]", w["punct"]) or w["display"].endswith(("»", '"')) and re.search(r"[.!?]", w["display"]):
            sents.append(cur)
            cur = []
    if cur:
        sents.append(cur)
    # merge tiny fragments like "..." into previous
    return sents


def detect_names(text):
    """Proper names = capitalised words that appear mid-sentence (or after 'appelle')."""
    names = {}
    for m in re.finditer(r"(?<![.!?»]\s)(?<!^)\b([A-ZÉÈÀÂÎÔÛÇ][a-zéèêëïîôûüàâçœ\-]{1,})\b", text, flags=re.M):
        w = m.group(1)
        start = m.start()
        prev = text[max(0, start - 3):start]
        if re.search(r"[.!?]\s*$", prev) or start == 0:
            continue
        if norm(w) in NAME_STOP:
            continue
        names[norm(w)] = w
    for m in re.finditer(r"(?:m'appelle|s'appel(?:le|ait)|nomm[ée]e?|my name is|named)\s+([A-ZÉÈ][\wéèêëïîôûüàâç\-]+)", text, flags=re.I):
        names[norm(m.group(1))] = m.group(1)
    return names


def guess_gender(name_n, text_n):
    if name_n in MALE_NAMES:
        return "m"
    if name_n in FEMALE_NAMES:
        return "f"
    # agreement clues right after the name: "Emma était contente", "elle"
    m = re.search(rf"\b{re.escape(name_n)}\b[^.!?]{{0,40}}\b(elle|contente|heureuse|triste|allee|partie|venue|furieuse)\b", text_n)
    if m:
        return "f"
    return "f" if name_n.endswith(FEMALE_END) and not name_n.endswith(("o", "an", "en")) else "m"


def narrator_gender(text_n):
    fem = len(re.findall(r"\bje (suis|etais) (allee|partie|venue|contente|heureuse|seule|fiere|triste et seule|tombee|nee)\b|\bje suis une\b|\bj'etais une\b", text_n))
    return "f" if fem else "m"


class Director:
    def __init__(self, script, timing, profile, cast_override=None):
        self.script = script
        self.timing = timing
        self.profile = profile
        self.words = timing["words"]
        self.text_n = norm(script)
        self.cast = {}
        self.cast_override = cast_override or {}
        self.last_m = None
        self.last_f = None
        self.last_chars = []
        self.loc = None
        self.loc_index = {}
        self.time = "day"
        self.prev_cam = None
        self.cam_count = {}
        self.angle_sign = 1
        self.shot_no = 0

    # ---------------- cast
    def add_char(self, cid, gender, role="", name=None):
        if cid not in self.cast:
            c = {"name": name or cid, "gender": gender, "role": role}
            if cid in self.cast_override:
                c.update(self.cast_override[cid])
            self.cast[cid] = c
        return cid

    def build_cast(self):
        first_person = len(re.findall(r"\b(je|j'|moi|mon|ma|mes|me|m'|i|my|me)\b", self.text_n)) > 2
        self.first_person = first_person
        self.names = detect_names(self.script)
        hero_name = None
        m = re.search(r"(?:je m'appelle|my name is|moi c'est)\s+([A-ZÉÈ][\wéèêëïîôûüàâç\-]+)", self.script, flags=re.I)
        if m:
            hero_name = m.group(1)
        if first_person:
            self.add_char("hero", narrator_gender(self.text_n), "", hero_name or "Moi")
        for nn, disp in self.names.items():
            if hero_name and nn == norm(hero_name):
                continue
            role = ""
            ctx = re.search(rf"\b{re.escape(nn)}\b[^.!?]{{0,60}}", self.text_n)
            if ctx and re.search(r"\b(riche|millionnaire|rich)\b", ctx.group(0)):
                role = "rich"
            elif ctx and re.search(r"\b(brute|harcel\w*|mechant|bully)\b", ctx.group(0)):
                role = "bully"
            self.add_char(nn, guess_gender(nn, self.text_n), role, disp)

    def chars_in(self, sn, raw):
        """Characters mentioned in a sentence, in order of appearance -> list of (pos, id)."""
        found = []
        hero_name_n = norm(self.cast.get("hero", {}).get("name", "")) if "hero" in self.cast else None
        for nn in self.names:
            for m in re.finditer(rf"\b{re.escape(nn)}\b", sn):
                cid = "hero" if nn == hero_name_n else nn
                found.append((m.start(), cid))
        has_name = any(re.search(rf"\b{re.escape(nn)}\b", sn) for nn in self.names)
        for rx, cid, g, role in ROLES:
            if has_name and cid in ("garcon", "fille"):
                continue
            for m in re.finditer(rx, sn):
                self.add_char(cid, g, role, cid.capitalize())
                found.append((m.start(), cid))
        if "hero" in self.cast:
            for m in re.finditer(r"\b(je|j'|moi|mon|ma|mes|me|m'|nous|i|my|me|we)\b", sn):
                found.append((m.start(), "hero"))
                break
        for m in re.finditer(r"\b(il|lui|he|him)\b", sn):
            if self.last_m:
                found.append((m.start(), self.last_m))
            break
        for m in re.finditer(r"\b(elle|she|her)\b", sn):
            if self.last_f:
                found.append((m.start(), self.last_f))
            break
        crowd = re.search(CROWD, sn)
        if crowd:
            for k, g in (("eleve_a", "m"), ("eleve_b", "f"), ("eleve_c", "m")):
                self.add_char(k, g, "", "Élève")
            found.append((crowd.start(), "@crowd"))
        found.sort()
        order = []
        for _, cid in found:
            if cid not in order:
                order.append(cid)
        # update pronoun memory (named/role characters other than hero)
        for cid in order:
            if cid in self.cast and cid != "hero" and not cid.startswith("eleve"):
                if self.cast[cid]["gender"] == "m":
                    self.last_m = cid
                else:
                    self.last_f = cid
        return order

    # ---------------- per sentence analysis
    def analyse(self, raw):
        sn = norm(raw)
        chars = self.chars_in(sn, raw)
        if not chars:
            chars = self.last_chars[:2] or (["hero"] if "hero" in self.cast else [])
        locs = []
        for rx, env, interior in LOCATIONS:
            m = re.search(rx, sn)
            if m:
                locs.append((m.start(), env, interior))
        new_loc = None
        if locs:
            envs = [e for _, e, _ in sorted(locs)]
            # most specific (interior) wins, exterior used as establishing shot
            interiors = [e for _, e, i in locs if i]
            new_loc = interiors[0] if interiors else envs[0]
            ext = [e for _, e, i in sorted(locs) if not i]
            est_env = ext[0] if (ext and interiors) else None
        else:
            est_env = None
        if re.search(LATER, sn) and not re.search(NIGHT, sn):
            self.time = "day"
        if re.search(SUNSET, sn):
            self.time = "sunset"
        elif re.search(NIGHT, sn):
            self.time = "night"
        elif re.search(DAY, sn) and not re.search(NIGHT, sn):
            self.time = "day"
        rule = None
        extra_fx, symbols = [], []
        for name, rx, prm in RULES:
            if re.search(rx, sn):
                if rule is None:
                    rule = dict(prm, name=name)
                else:
                    extra_fx += [f for f in prm.get("fx", []) if f in ("hearts", "money", "confetti", "sparkles")]
        if rule is None:
            rule = dict(action="idle", emotion="neutral", beat="neutral", name="none")
        if rule["name"] == "say" and re.search(r"\b(ne|jamais|personne)\b", sn) and "«" in raw:
            rule["emotion"] = "sad" if re.search(r"\b(triste|pleur)", sn) else "neutral"
        props = [p for rx, p in PROPS if re.search(rx, sn)]
        pets = [p for rx, p in PETS if re.search(rx, sn)]
        sudden = bool(re.search(SUDDEN, sn))
        later = bool(re.search(LATER, sn))
        excl = "!" in raw
        return dict(raw=raw, sn=sn, chars=chars, new_loc=new_loc, est_env=est_env, rule=rule, props=props, pets=pets,
                    sudden=sudden, later=later, excl=excl, extra_fx=extra_fx)

    def analyse_clause(self, raw, A):
        """Refine a sentence analysis with what is said during one sub-shot."""
        sn = norm(raw)
        C = dict(A)
        chars = self.chars_in(sn, raw)
        if chars:
            keep = [c for c in A["chars"] if c not in chars]
            C["chars"] = chars + keep[: max(0, 2 - len(chars))] if A["rule"]["name"] in ("mock", "hug", "say", "throw", "shock") else chars
        sent_rule = A["rule"]
        if sent_rule["name"] not in ("suspense",):
            for name, rx, prm in RULES:
                if re.search(rx, sn):
                    C["rule"] = dict(prm, name=name)
                    break
        # keep locomotion of the sentence, only colour it with the clause emotion
        if sent_rule.get("action") in ("walk", "run") and C["rule"].get("beat") in ("sad", "neutral") and C["rule"] is not sent_rule:
            C["rule"] = dict(sent_rule, emotion=C["rule"].get("emotion", sent_rule.get("emotion")))
        props = [p for rx, p in PROPS if re.search(rx, sn)]
        if props:
            C["props"] = props
        C["sudden"] = bool(re.search(SUDDEN, sn))
        C["excl"] = "!" in raw
        C["clause"] = raw
        return C

    # ---------------- camera grammar
    def pick_camera(self, beat, n_actors, k, first_in_loc, dur):
        if first_in_loc and k == 0 and dur >= 1.2:
            choices = CAMERA_BY_BEAT["establish"]
        else:
            choices = CAMERA_BY_BEAT.get(beat, CAMERA_BY_BEAT["neutral"])
        if n_actors < 2:
            choices = [c for c in choices if c not in ("ots", "two_shot")] or ["medium", "closeup"]
        if n_actors >= 3 and not (first_in_loc and k == 0):
            choices = ["wide", "two_shot", "low"] if k % 2 == 0 else ["closeup", "medium"]
        # rotate inside the beat list, avoid repeating the previous type
        start = (self.cam_count.get(beat, 0) + k) % len(choices)
        for off in range(len(choices)):
            c = choices[(start + off) % len(choices)]
            if c != self.prev_cam:
                break
        self.cam_count[beat] = self.cam_count.get(beat, 0) + 1
        self.prev_cam = c
        self.angle_sign *= -1
        return c

    # ---------------- main
    def build(self):
        self.build_cast()
        words = self.words
        sents = split_sentences(words)
        dur_total = self.timing["duration"]
        prof = self.profile
        target = float(prof.get("median_shot", 1.9))
        min_shot = max(0.6, float(prof.get("min_shot", 0.9)))
        shots = []
        # sentence time spans: from first word start to next sentence start
        spans = []
        for si, idxs in enumerate(sents):
            s = 0.0 if si == 0 else words[idxs[0]]["start"]
            e = dur_total if si == len(sents) - 1 else words[sents[si + 1][0]]["start"]
            spans.append((s, e))
        for si, idxs in enumerate(sents):
            raw = " ".join(words[i]["display"] for i in idxs)
            A = self.analyse(raw)
            s0, s1 = spans[si]
            first_in_loc = False
            if A["new_loc"] and A["new_loc"] != self.loc:
                self.loc = A["new_loc"]
                first_in_loc = True
            if self.loc is None:
                # first sentence without location: guess from whole script
                for rx, env, _ in LOCATIONS:
                    if re.search(rx, self.text_n):
                        self.loc = env
                        break
                self.loc = self.loc or "street"
                first_in_loc = True
            if A["later"]:
                first_in_loc = True
            # split sentence into sub-shots
            span = s1 - s0
            n = max(1, int(round(span / target)))
            while n > 1 and span / n < min_shot:
                n -= 1
            cut_times = [s0]
            for k in range(1, n):
                ideal = s0 + span * k / n
                # candidate word starts, prefer after commas
                best, bestc = None, 1e9
                for j, wi in enumerate(idxs[1:], 1):
                    t = words[wi]["start"]
                    c = abs(t - ideal) - (0.45 if re.search(r"[,;:]", words[idxs[j - 1]]["punct"]) else 0) \
                        - (0.25 if norm(words[wi]["word"]) in ("et", "mais", "parce", "quand", "alors", "puis", "pour", "devant", "avec", "qui", "que", "and", "but", "because", "when") else 0)
                    if c < bestc and t - cut_times[-1] >= min_shot * 0.8 and s1 - t >= min_shot * 0.8:
                        best, bestc = t, c
                if best is not None and best > cut_times[-1]:
                    cut_times.append(best)
            cut_times.append(s1)
            n = len(cut_times) - 1
            for k in range(n):
                Ak = A
                if n > 1:
                    cw = [words[i]["display"] for i in idxs if cut_times[k] - 1e-6 <= words[i]["start"] < cut_times[k + 1] - 1e-6]
                    if cw:
                        Ak = self.analyse_clause(" ".join(cw), A)
                shots.append(self.make_shot(Ak, si, k, n, cut_times[k], cut_times[k + 1], first_in_loc, idxs, len(sents)))
            self.last_chars = [c for c in A["chars"] if c != "@crowd"][:3] or self.last_chars
        # frame quantisation (global)
        for sh in shots:
            f0, f1 = round(sh["start"] * FPS), round(sh["end"] * FPS)
            sh["frames"] = max(1, f1 - f0)
            sh["duration"] = sh["frames"] / FPS
        # guarantee exact total frame count
        total = round(dur_total * FPS)
        diff = total - sum(s["frames"] for s in shots)
        shots[-1]["frames"] += diff
        shots[-1]["duration"] = shots[-1]["frames"] / FPS
        return {"cast": self.cast, "shots": shots, "fps": FPS, "duration": dur_total, "total_frames": total}

    def make_shot(self, A, si, k, n, t0, t1, first_in_loc, idxs, n_sents):
        self.shot_no += 1
        rule = A["rule"]
        beat = rule.get("beat", "neutral")
        if si == n_sents - 1 and k == n - 1:
            beat = "ending" if beat in ("neutral", "sad", "win") else beat
        chars = list(A["chars"])
        crowd = "@crowd" in chars
        chars = [c for c in chars if c != "@crowd"]
        # actors list: subject first
        cast_ids = chars[:3]
        if crowd:
            cast_ids = cast_ids + [c for c in ("eleve_a", "eleve_b", "eleve_c") if c not in cast_ids][: max(0, 4 - len(cast_ids))]
        subject = cast_ids[0] if cast_ids else None
        # if sentence is first person ("je ...") hero is subject
        if "hero" in cast_ids and re.match(r"^\s*(\w+\s*,\s*)?(et |alors |mais |puis |donc )?(je|j'|i)\b", A["sn"]):
            subject = "hero"
        # mocking: the crowd / other is subject, hero reacts
        if rule["name"] == "mock" and "hero" in cast_ids and len(cast_ids) > 1 and subject == "hero":
            subject = next(c for c in cast_ids if c != "hero")
        env = A["est_env"] if (A["est_env"] and k == 0 and n > 1) else self.loc
        actors = []
        ordered = [subject] + [c for c in cast_ids if c != subject] if subject else []
        for i, cid in enumerate(ordered):
            a = {"id": cid}
            if i == 0 or (crowd and cid.startswith("eleve") and rule["name"] == "mock"):
                a["action"] = rule.get("action", "idle")
                a["emotion"] = rule.get("emotion", "neutral")
                if rule.get("symbol") and i == 0:
                    a["symbol"] = rule["symbol"]
                if rule["name"] == "mock":
                    a["action"] = "point" if i % 2 else "laugh"
            else:
                react = rule.get("react")
                if react == "sad":
                    a["action"], a["emotion"] = "sad", "sad"
                elif react == "hug":
                    a["action"], a["emotion"] = "hug", "happy"
                elif react == "shocked":
                    a["action"], a["emotion"] = "shocked", "shocked"
                elif react == "listen":
                    a["action"], a["emotion"] = "idle", "neutral"
                else:
                    a["action"], a["emotion"] = "idle", rule.get("react_emotion", "neutral")
                if rule["name"] in ("shock",) and cid == "hero":
                    a["action"], a["emotion"] = "idle", "smug"
                a["lookAt"] = 0
            actors.append(a)
        if actors:
            if A["props"]:
                p = A["props"][0]
                if rule["name"] == "throw":
                    pass  # thrown object lies on the ground (worldProps)
                else:
                    actors[0]["prop"] = p
            if A["sudden"] and "symbol" not in actors[0]:
                actors[0]["symbol"] = "!"
        # interior locomotion: walking through furniture looks bad -> walk only outside / hallway
        interior = env in ("living_room", "bedroom", "kitchen", "classroom", "store", "hospital")
        for a in actors:
            if a.get("action") in ("walk", "run") and interior:
                a["action"] = "idle" if a["action"] == "walk" else "scared"
            if a.get("action") in ("sleep",) and env not in ("bedroom", "hospital"):
                a["action"] = "lie"
            if a.get("action") == "sit_work" and env not in ("bedroom", "classroom", "kitchen", "living_room"):
                a["action"] = "think"
        if rule.get("move") == "in" and actors:
            actors[0]["dir"] = 0.0
        # reaction shots: in multi-shot sentences alternate focus
        focus = 0
        if len(actors) > 1 and n > 1 and k % 2 == 1 and rule["name"] not in ("hug",):
            focus = 1
        cam_type = self.pick_camera(beat, len(actors), k, first_in_loc, t1 - t0)
        if rule["name"] == "reveal" and k == 0:
            cam_type = "crash_zoom"
        if A["later"] and k == 0:
            cam_type = "establish"
        if self.shot_no == 1:
            cam_type = "crash_zoom" if (t1 - t0) < 2.6 else "establish"
        if cam_type == "follow" and not any(a.get("action") in ("walk", "run", "sneak") for a in actors[:1]):
            cam_type = "truck"
        fx = list(rule.get("fx", [])) + A["extra_fx"]
        if k > 0:
            fx = [f for f in fx if f not in ("flash",)]  # flash only on the first cut of a beat
        if A["sudden"] and k == 0:
            fx += ["punch", "flash"]
        if A["excl"] and k == n - 1 and "punch" not in fx:
            fx.append("punch")
        if self.time == "night" and env not in ("living_room", "bedroom", "kitchen", "classroom", "store", "hospital", "hallway") and "rain" not in fx and beat in ("emo", "sad"):
            fx.append("rain")
        world = []
        if rule["name"] == "throw" and A["props"]:
            world.append({"kind": A["props"][0], "pos": [0.5, 2.4], "y": 0.2, "scale": 1.6})
        if any(c == "policier" for c in cast_ids) and env in ("street", "city", "house_ext", "school_ext", "park"):
            world.append({"kind": "police_car", "pos": [8, -6]})
        cam_angle = self.angle_sign * (12 + (self.shot_no * 7) % 20)
        if actors and actors[0].get("action") == "sit_work":
            cam_angle = self.angle_sign * 30
            cam_type = "high" if k % 2 else "medium"
        if len(actors) >= 3 and cam_type in ("closeup", "medium") and "hero" in [a["id"] for a in actors]:
            focus = [a["id"] for a in actors].index("hero")
        shot = {
            "id": f"s{self.shot_no:03d}",
            "sentence": si,
            "text": A["raw"],
            "start": round(t0, 3), "end": round(t1, 3),
            "env": env, "envSeed": 0, "time": self.time,
            "actors": actors,
            "camera": {"type": cam_type, "angle": cam_angle, "dir": self.angle_sign, "focus": focus,
                       "handheld": 0.04 if beat not in ("suspense", "shock") else 0.08},
            "fx": sorted(set(fx), key=fx.index),
            "pets": [{"kind": p} for p in A["pets"]],
            "worldProps": world,
            "beat": beat,
        }
        if rule["name"] == "hug":
            shot["close"] = True
        if A["later"] and k == 0:
            shot["fx"].append("flash")
        return shot


def build_storyboard(script, timing, profile, cast_override=None):
    d = Director(script, timing, profile, cast_override)
    sb = d.build()
    sb["profile"] = {k: profile.get(k) for k in ("source", "median_shot", "min_shot", "max_shot", "caption", "grade")}
    return sb


if __name__ == "__main__":
    import sys
    sys.path.insert(0, __file__.rsplit("/", 1)[0])
    import audio_align
    from analyze_reference import DEFAULT_PROFILE
    script = open(sys.argv[1], encoding="utf-8").read()
    timing = audio_align.analyze(sys.argv[2], script)
    sb = build_storyboard(script, timing, DEFAULT_PROFILE)
    print(json.dumps(sb["cast"], ensure_ascii=False))
    for s in sb["shots"]:
        print(f'{s["id"]} {s["start"]:6.2f}-{s["end"]:6.2f} {s["env"]:11s} {s["time"]:6s} {s["camera"]["type"]:10s} {s["beat"]:9s} '
              + " | ".join(f'{a["id"]}:{a.get("action")}/{a.get("emotion")}{"+" + a["prop"] if a.get("prop") else ""}' for a in s["actors"])
              + f'  fx={s["fx"]}  «{s["text"][:50]}»')


# ---------------------------------------------------------------------------------------------
# Directed mode: a hand-written shot list per sentence (projects/<p>/direction.json) is timed
# automatically on the voice-over. Each sentence entry is a list of shots; a shot may carry
#   "cut": "<word>"  -> the shot starts on that word of the sentence (first occurrence after the previous cut)
#   "w": weight      -> otherwise the sentence span is shared proportionally to weights (snapped to word starts)
#   "sfx": [{"name", "at" (s from shot start or "end"), "gain"}]
def build_from_direction(direction, timing, profile):
    words = timing["words"]
    sents = split_sentences(words)
    dur_total = timing["duration"]
    if len(direction["sentences"]) != len(sents):
        raise SystemExit(f"direction.json has {len(direction['sentences'])} sentences, script has {len(sents)}")
    shots, sfx = [], []
    defaults = direction.get("defaults", {})
    n_id = 0
    for si, idxs in enumerate(sents):
        s0 = 0.0 if si == 0 else words[idxs[0]]["start"]
        s1 = dur_total if si == len(sents) - 1 else words[sents[si + 1][0]]["start"]
        plan = direction["sentences"][si]
        if isinstance(plan, dict):
            plan = [plan]
        # cut times
        cuts = [s0]
        pos = 0
        for k, sh in enumerate(plan[1:], 1):
            t = None
            if "cut" in sh:
                target = norm(sh["cut"])
                for j in range(pos + 1, len(idxs)):
                    if norm(words[idxs[j]]["word"]).startswith(target):
                        t, pos = words[idxs[j]]["start"], j
                        break
            if t is None:
                wsum = sum(p.get("w", 1) for p in plan)
                ideal = s0 + (s1 - s0) * sum(p.get("w", 1) for p in plan[:k]) / wsum
                j = min(range(len(idxs)), key=lambda j: abs(words[idxs[j]]["start"] - ideal))
                t = words[idxs[j]]["start"] if words[idxs[j]]["start"] > cuts[-1] + 0.4 else ideal
                pos = j
            cuts.append(max(t, cuts[-1] + 0.4))
        cuts.append(s1)
        text = " ".join(words[i]["display"] for i in idxs)
        for k, sh in enumerate(plan):
            n_id += 1
            spec = json.loads(json.dumps(defaults))
            spec.update({kk: vv for kk, vv in sh.items() if kk not in ("cut", "w", "sfx")})
            spec.setdefault("actors", [])
            spec.setdefault("camera", {"type": "medium"})
            spec.setdefault("fx", [])
            spec.setdefault("time", "day")
            spec.update({"id": f"s{n_id:03d}", "sentence": si, "text": text, "start": round(cuts[k], 3), "end": round(cuts[k + 1], 3)})
            shots.append(spec)
            for ev in sh.get("sfx", []):
                at = ev.get("at", 0)
                t = cuts[k + 1] - 0.05 if at == "end" else cuts[k] + float(at)
                sfx.append({"name": ev["name"], "t": round(t, 3), **({"gain": ev["gain"]} if "gain" in ev else {}), **({"dur": ev["dur"]} if "dur" in ev else {})})
    for sh in shots:
        f0, f1 = round(sh["start"] * FPS), round(sh["end"] * FPS)
        sh["frames"] = max(1, f1 - f0)
        sh["duration"] = sh["frames"] / FPS
    total = round(dur_total * FPS)
    shots[-1]["frames"] += total - sum(s["frames"] for s in shots)
    shots[-1]["duration"] = shots[-1]["frames"] / FPS
    return {"cast": direction.get("cast", {}), "shots": shots, "sfx": sfx, "fps": FPS, "duration": dur_total, "total_frames": total,
            "profile": {k: profile.get(k) for k in ("source", "median_shot", "min_shot", "max_shot", "caption", "grade")}}
