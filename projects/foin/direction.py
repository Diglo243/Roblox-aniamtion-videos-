"""Shot list for « La botte de foin » — modelled on the reference (giant golden haystack town,
cow's hay shop, cow bank, tools, dynamite crater, uncle's barn, grandma, Kevin the frog).
Running gag: the golden needle is already in grandma's bun (glint) in the very first shot.
python3 projects/foin/direction.py -> direction.json"""
import json
import os


def P(frm, to, look, fov=50, look_to=None, **k):
    c = {"type": "path", "from": frm, "to": to, "look": look, "fov": fov}
    if look_to:
        c["lookTo"] = look_to
    c.update(k)
    return c


def A(id, action="idle", **k):
    return dict(id=id, action=action, **k)


def S(env, actors=(), camera=None, **k):
    d = dict(env=env, actors=list(actors), camera=camera or {"type": "medium"})
    d.update(k)
    return d


def C(t, **k):
    return dict(type=t, **k)


def sfx(name, at=0, gain=None, dur=None):
    e = {"name": name, "at": at}
    if gain is not None:
        e["gain"] = gain
    if dur:
        e["dur"] = dur
    return e


TOOLS = ["pitchfork", "spoon", "blower", "vacuum", None]
DIGGERS = dict(n=12, area=[-18, -3, 18, 9], action=["dig", "dig", "carry_armful", "dig"], facing=0, spread=0.6, props=TOOLS)
# first shot of the film: haystack mountain, town, grandma in the foreground with a tiny glint
FIRST = P([2, 12, 175], [2, 16, 168], [0, 50, -70], 56)
GRANDMA_FAR = A("mamie", "idle", pos=[5, 118], facing=0.15)

sentences = [
    # 0 Dans cette ville, il existe une botte de foin.
    [S("hay_town", [GRANDMA_FAR], FIRST, fx=["straw"], crowd=[dict(n=10, area=[-30, 70, 30, 110], action=["walk", "idle"], facing=0, spread=3)], sfx=[sfx("wind", 0, -30)])],
    # 1 Cinq millions de brins de paille.
    [S("hay_inside", [], P([0, 4, 9], [0, 6, 3], [0, 5, -6], 52), envOpts={"sparse": True}, fx=["straw"], sfx=[sfx("whoosh", 0, -27)])],
    # 2 Et quelque part à l'intérieur se trouve une aiguille en or.
    [S("hay_inside", [], P([2, 3, 8], [1, 4, 5], [0, 4, -4], 50), envOpts={"sparse": True}, fx=["straw"]),
     S("hay_inside", [], P([0, 5, 6], [0, 5, 4.5], [0, 5, 0], 45), envOpts={"sparse": True}, worldProps=[{"kind": "needle_big", "pos": [0, 0], "y": 5}],
       fx=["rays"], cut="aiguille", sfx=[sfx("sparkle", 0, -24)])],
    # 3 Elle vaut plus cher que toute la ville réunie.
    [S("hay_town", [], P([60, 30, 200], [40, 34, 190], [0, 20, 90], 55), fx=["coins"], sfx=[sfx("cash", 0.3, -26)])],
    # 4 Personne ne l'a jamais trouvée.
    [S("hay_base", [], C("wide", angle=10), crowd=[DIGGERS], fx=["straw"])],
    # 5 Vous voyez cet homme ?
    [S("hay_base", [A("chercheur", "idle", prop="pitchfork", emotion="tired")], C("crash_zoom"), crowd=[dict(DIGGERS, n=6, area=[-18, -2, -6, 8])], fx=["straw"], sfx=[sfx("whoosh", 0, -27)])],
    # 6 Il cherche depuis l'âge de 9 ans.
    [S("hay_base", [A("chercheur_jeune", "dig", prop="spoon", symbol="txt:9 ANS")], C("medium", angle=15), fx=["straw"])],
    # 7 Aujourd'hui, il en a 41.
    [S("hay_base", [A("chercheur", "idle", prop="pitchfork", emotion="tired", symbol="txt:41 ANS")], C("closeup", angle=-15), fx=["straw"])],
    # 8 Et jusqu'ici, il n'a trouvé qu'une botte.
    [S("hay_base", [A("chercheur", "dig", prop="pitchfork")], C("medium", angle=10)),
     S("hay_base", [A("chercheur", "hold_up", prop="boot", emotion="tired")], C("low", angle=-10), cut="qu'une", sfx=[sfx("pop", 0, -25)])],
    # 9 Je m'appelle Eli et, dans notre ville, tout le monde cherche avant l'école, après le travail et même à Noël.
    [S("hay_base", [A("eli", "wave", emotion="happy")], C("crash_zoom"), fx=["straw"]),
     S("hay_town", [], P([-40, 14, 150], [-30, 16, 140], [0, 30, -40], 55), cut="dans", crowd=[dict(n=16, area=[-40, 28, 40, 40], action="dig", facing=3.14, spread=0.5)]),
     S("hay_base", [], C("wide", angle=-10), cut="avant", crowd=[dict(n=8, area=[-12, -2, 12, 6], action="dig", props=["bag", "spoon", None], kids=1.0, facing=0, spread=0.8)]),
     S("hay_base", [A("pere", "dig", prop="pitchfork")], C("medium", angle=20), cut="après", crowd=[dict(n=5, area=[-14, -2, 14, 4], action="dig", roles=["rich"], facing=0)]),
     S("hay_base", [A("eli", "dig", pos=[-6, 2], prop="spoon")], P([-3, 6, 20], [-4, 6, 17], [-8, 4, -6], 52), envOpts={"christmas": True}, cut="même", fx=["snow"],
       crowd=[dict(n=4, area=[-4, -2, 6, 4], action="dig", facing=0)], sfx=[sfx("ding", 0.2, -27)])],
    # 10 Voici comment ça fonctionne.
    [S("hay_base", [A("eli", "point_cam", symbol="idea")], C("closeup", angle=10), fx=["straw"])],
    # 11 Tu retires la paille, tu la transportes jusqu'à la vache, et elle te paie une pièce par brin de paille.
    [S("hay_base", [A("eli", "dig", prop="spoon")], C("low", angle=20), fx=["straw"]),
     S("hay_base", [A("eli", "carry_armful", prop="armful", dir=1.57, speed=0.6)], C("follow", side=0.9), cut="transportes"),
     S("hay_shop", [A("vache", "talk", pos=[0, -9]), A("eli", "give", pos=[1.5, -3.5], facing=3.0, prop="armful")], P([-6, 5, 8], [-5, 5, 7], [0, 4, -6], 50), cut="et"),
     S("hay_shop", [A("vache", "give", pos=[0, -9], prop="coin"), A("eli", "celebrate", pos=[1.5, -3.5], facing=3.0)], C("closeup", focus=0, angle=-10), cut="paie",
       fx=["coins"], sfx=[sfx("cash", 0.1, -24)])],
    # 12 Notre vache a déjà mangé deux millions de brins.
    [S("hay_shop", [A("vache", "eat", pos=[0, -9], prop="straw", symbol="txt:2 000 000")], C("medium", angle=12))],
    # 13 Elle possède la banque.
    [S("cow_bank", [A("vache", "wave", pos=[0, -4], emotion="smug")], P([0, 5, 24], [0, 7, 18], [0, 9, -10], 55), sfx=[sfx("cash", 0.2, -27)])],
    # 14 Elle a même un chauffeur.
    [S("cow_bank", [A("chauffeur", "idle", pos=[6, -2], facing=-0.4), A("vache", "wave", pos=[2, 0], emotion="smug")], C("two_shot", angle=-12), sfx=[sfx("engine", 0, -29)])],
    # 15 Avec les pièces, tu achètes des outils.
    [S("tool_shop", [A("eli", "give", pos=[1.5, -3], facing=3.0, prop="coin")], P([-7, 6, 14], [-6, 6, 12], [0, 5, -6], 52), sfx=[sfx("cash", 0.4, -26)])],
    # 16 Une fourche, un souffleur de feuilles, un aspirateur.
    [S("tool_shop", [A("eli", "hold_up", prop="pitchfork", emotion="happy")], C("low", angle=10), sfx=[sfx("pop", 0, -25)]),
     S("tool_shop", [A("eli", "idle", prop="blower", emotion="happy")], C("medium", angle=-15), cut="souffleur", fx=["straw"], sfx=[sfx("pop", 0, -25)]),
     S("tool_shop", [A("eli", "idle", prop="vacuum", emotion="joy")], C("closeup", angle=15), cut="aspirateur", sfx=[sfx("pop", 0, -25)])],
    # 17 Mon voisin a acheté de la dynamite.
    [S("hay_base", [A("voisin", "hold_up", prop="dynamite", emotion="evil", symbol="!")], C("low", angle=-15), sfx=[sfx("riser", 0, -29)])],
    # 18 Maintenant, il vit dans un cratère.
    [S("crater", [A("voisin", "wave", emotion="happy")], P([0, 22, 26], [0, 18, 20], [0, 0, -2], 52), sfx=[sfx("boom", 0, -27)])],
    # 19 Et certains trichent.
    [S("barn", [A("oncle", "sneak", emotion="smug")], C("dutch", dir=1))],
    # 20 Mon oncle a peint un cure-dent en doré.
    [S("barn", [A("oncle", "hold_up", prop="toothpick", emotion="evil")], C("closeup", angle=15), fx=["sparkles"], sfx=[sfx("sparkle", 0.2, -27)])],
    # 21 Il l'a vendu deux fois.
    [S("barn", [A("oncle", "give", prop="toothpick", emotion="evil", symbol="txt:x2"), A("pere", "give", prop="coin")], C("two_shot", angle=10), sfx=[sfx("cash", 0.2, -26), sfx("cash", 0.8, -27)])],
    # 22 Et au fait, si tu veux créer des vidéos comme celle-ci, regarde mon profil.
    [S("hay_base", [A("eli", "point_cam", emotion="happy")], C("closeup", angle=0), fx=["straw"]),
     S("hay_base", [A("eli", "wave", emotion="happy")], C("medium", angle=10), cut="regarde", sfx=[sfx("pop", 0, -26)])],
    # 23 Ma grand-mère, elle, n'a pas besoin d'outils.
    [S("hay_base", [A("mamie", "idle", emotion="smug")], C("medium", angle=-12))],
    # 24 Elle entre dans la botte de foin et ressort de l'autre côté, les bras remplis de paille.
    [S("hay_base", [A("mamie", "walk", dir=3.14, speed=0.6)], P([5, 5, 14], [4, 5, 12], [0, 4, -2], 50), fx=["straw"], sfx=[sfx("whoosh", 0.6, -27)]),
     S("hay_inside", [A("mamie", "carry_armful", prop="armful", dir=0, speed=0.5)], C("medium", angle=15), cut="ressort", fx=["straw"]),
     S("hay_base", [A("mamie", "carry_armful", prop="armful", dir=0, speed=0.5, emotion="smug")], C("low", angle=-15), cut="les", fx=["straw"])],
    # 25 Elle dit que le foin a peur d'elle.
    [S("hay_base", [A("mamie", "talk", emotion="smug")], C("closeup", angle=12), fx=["straw"])],
    # 26 Et moi ?
    [S("hay_base", [A("eli", "think", symbol="?")], C("closeup", angle=-10))],
    # 27 J'ai une cuillère.
    [S("hay_base", [A("eli", "hold_up", prop="spoon", emotion="happy")], C("low", angle=10), sfx=[sfx("pop", 0, -25)])],
    # 28 Les bons jours, je déplace neuf brins de paille.
    [S("hay_base", [A("eli", "dig", prop="spoon", symbol="txt:9")], C("medium", angle=-15), worldProps=[{"kind": "straws", "n": 9, "area": [-2, 1, 2, 3]}])],
    # 29 Et j'ai une grenouille.
    [S("hay_base", [A("eli", "idle", pos=[-1.5, 0], emotion="happy")], P([1, 2.2, 8], [1, 2.4, 7], [1, 1.5, 1], 48), pets=[{"kind": "frog", "pos": [1.2, 1.2], "facing": 0.2, "hop": 0.3}])],
    # 30 Elle s'appelle Kevin.
    [S("hay_base", [A("eli", "idle", pos=[-1.5, 0], emotion="happy", symbol="txt:KEVIN")], C("two_shot", angle=10), pets=[{"kind": "frog", "pos": [1.2, 1.2], "facing": 0.2, "hop": 0.3}])],
    # 31 Le premier jour, Kevin a sauté dans le foin.
    [S("hay_base", [A("eli", "shocked", pos=[3, 2], facing=-0.6, symbol="!")], C("wide", angle=15), pets=[{"kind": "frog", "pos": [-1, -3], "facing": 3.14, "hop": 1.2}],
       sfx=[sfx("pop", 0.4, -25)])],
    # 32 Alors maintenant, je cherche une grenouille dans une botte de foin.
    [S("hay_base", [A("eli", "dig", prop="spoon", symbol="?")], C("low", angle=15), fx=["straw"]),
     S("hay_inside", [A("eli", "look_around")], C("medium", angle=-10), cut="dans", fx=["straw"])],
    # 33 C'est encore pire.
    [S("hay_inside", [A("eli", "sad")], C("high", angle=10))],
    # 34 La grenouille bouge.
    [S("hay_inside", [], P([0, 1.5, 8], [2, 1.5, 7], [0, 1, 0], 50), envOpts={"sparse": True}, pets=[{"kind": "frog", "pos": [0, 0], "facing": 0.6, "hop": 1}], sfx=[sfx("pop", 0.2, -26), sfx("pop", 0.9, -26)])],
    # 35 Mais on trouve toutes sortes de choses là-dedans.
    [S("hay_base", [], C("wide", angle=-10), crowd=[dict(DIGGERS, n=10)], fx=["straw"])],
    # 36 Des clés de voiture, un piano…
    [S("hay_base", [A("eli", "hold_up", prop="keys", emotion="shocked")], C("closeup", angle=15), sfx=[sfx("ding", 0.1, -26)]),
     S("hay_base", [A("chercheur", "push", pos=[4, 1], facing=-1.4)], C("wide", angle=10), worldProps=[{"kind": "piano", "pos": [-1, -2], "y": 2.2}], cut="un", sfx=[sfx("boom", 0.1, -30)])],
    # 37 Et mon père.
    [S("hay_base", [A("pere", "lie", emotion="tired")], C("crash_zoom"), worldProps=[{"kind": "straws", "n": 40, "area": [-3, -3, 3, 2], "y": 0.9}], sfx=[sfx("whoosh", 0, -27)])],
    # 38 Il avait disparu depuis mardi dernier.
    [S("hay_base", [A("pere", "idle", emotion="tired", symbol="txt:MARDI"), A("eli", "shocked", pos=[3, 2], facing=-0.8)], C("two_shot", angle=-10), fx=["straw"])],
    # 39 Toute la ville a fini par dire : « Ça suffit ! »
    [S("festival", [A("maire", "angry", pos=[0, -2])], C("wide", angle=0),
       crowd=[dict(n=16, area=[-14, -4, 14, 8], action=["angry", "point", "angry"], emotion="angry", facing=3.14, spread=0.5)]),
     S("festival", [A("maire", "angry", pos=[0, -2], emotion="scream", symbol="anger")], C("low", angle=10), cut="ça", fx=["shake", "punch"], sfx=[sfx("boom", 0, -30)])],
    # 40 Tout le monde s'est mis au travail en même temps.
    [S("hay_base", [], P([0, 16, 40], [0, 12, 32], [0, 6, 0], 56), crowd=[dict(DIGGERS, n=24, area=[-22, -3, 22, 14])], fx=["straw"])],
    # 41 Les fourches, les souffleurs, les aspirateurs…
    [S("hay_base", [], P([0, 7, 26], [2, 7, 24], [0, 3, 0], 52), crowd=[dict(n=8, area=[-10, -2, 10, 6], action="dig", props=["pitchfork"], facing=0)], fx=["straw"]),
     S("hay_base", [], C("wide", angle=-12), cut="souffleurs", crowd=[dict(n=7, area=[-10, -2, 10, 6], action="idle", props=["blower"], facing=0)], fx=["straw"]),
     S("hay_base", [], P([-4, 2.5, 18], [-2, 2.5, 16], [0, 3, 0], 50), cut="aspirateurs", crowd=[dict(n=7, area=[-8, -2, 8, 5], action="idle", props=["vacuum"], facing=0)], fx=["straw"])],
    # 42 Même grand-mère était là.
    [S("hay_base", [A("mamie", "carry_armful", prop="armful", dir=0.4, speed=0.4, emotion="smug")], C("low", angle=-12), fx=["straw"])],
    # 43 Le type à la dynamite était également de retour.
    [S("hay_base", [A("voisin", "hold_up", prop="dynamite", emotion="evil")], C("crash_zoom"), sfx=[sfx("riser", 0, -28)])],
    # 44 On lui a donné l'extrémité opposée.
    [S("hay_town", [], P([150, 30, 120], [140, 30, 110], [0, 50, -60], 56), fx=["smoke"], sfx=[sfx("boom", 0.8, -27)])],
    # 45 Nous avons creusé pendant trois jours.
    [S("hay_base", [A("eli", "dig", prop="spoon", symbol="txt:3 JOURS")], C("medium", angle=10), time="sunset", crowd=[dict(DIGGERS, n=10)], fx=["straw"])],
    # 46 La montagne est devenue une colline.
    [S("hay_town", [], P([0, 18, 175], [0, 18, 165], [0, 30, -40], 55), envOpts={"hay": 0.45}, crowd=[dict(n=24, area=[-40, 30, 40, 60], action="dig", facing=3.14, spread=0.6)])],
    # 47 La colline est devenue un tas.
    [S("hay_town", [], P([0, 22, 24], [0, 18, 18], [0, 3, -40], 55), envOpts={"hay": 0.12}, time="sunset", crowd=[dict(n=24, area=[-30, 0, 30, 40], action="dig", facing=3.14, spread=1.2)])],
    # 48 Et finalement, il ne restait plus qu'un seul brin de paille.
    [S("hay_town", [], P([0, 24, 40], [0, 16, 32], [0, 0, 0], 52), envOpts={"hay": 0}, time="sunset", worldProps=[{"kind": "straw_single", "pos": [0, 0]}],
       crowd=[dict(n=26, area=[-16, -14, 16, 14], action="idle", facing=3.14, spread=3.1)], sfx=[sfx("wind", 0, -29)]),
     S("hay_town", [], P([3, 1.2, 6], [2.5, 1.0, 5], [0, 0.3, 0], 46), envOpts={"hay": 0}, time="sunset", worldProps=[{"kind": "straw_single", "pos": [0, 0]}], cut="seul")],
    # 49 Le maire l'a soulevé.
    [S("hay_town", [A("maire", "hold_up", prop="straw")], C("low", angle=10), envOpts={"hay": 0}, time="sunset",
       crowd=[dict(n=12, area=[-12, -10, 12, -3], action="idle", facing=0, spread=0.6)], sfx=[sfx("riser", 0, -29)])],
    # 50 Rien.
    [S("hay_town", [A("maire", "hold_up", prop="straw", emotion="shocked")], C("closeup", angle=-10), envOpts={"hay": 0}, time="sunset")],
    # 51 Pas d'aiguille.
    [S("hay_town", [], C("wide", angle=0), envOpts={"hay": 0}, time="sunset", crowd=[dict(n=10, area=[-8, -6, 8, 4], action="sad", facing=0, spread=0.6)])],
    # 52 Juste Kevin.
    [S("hay_town", [], P([0, 7, 2.5], [0, 6, 2], [0, 0, 0], 48), envOpts={"hay": 0}, time="sunset", pets=[{"kind": "frog", "pos": [0, 0], "facing": 0, "hop": 0.2}], sfx=[sfx("pop", 0.3, -25)])],
    # 53 Personne n'a dit un mot.
    [S("hay_town", [], C("high", angle=10), envOpts={"hay": 0}, time="sunset", crowd=[dict(n=16, area=[-12, -10, 12, 6], action="idle", emotion="sad", facing=0, spread=1.5)])],
    # 54 La vache a roté et grand-mère m'a pris dans ses bras.
    [S("hay_town", [A("vache", "laugh", emotion="joy")], C("closeup", angle=10), envOpts={"hay": 0}, time="sunset", sfx=[sfx("pop", 0.2, -24)]),
     S("hay_town", [A("mamie", "hug", pos=[1.3, 0], facing=-1.25, emotion="happy"), A("eli", "hug", pos=[-1.3, 0], facing=1.25, emotion="sad")], C("two_shot", angle=12),
       envOpts={"hay": 0}, time="sunset", close=True, cut="et", fx=["hearts"])],
    # 55 C'est là que je l'ai remarquée.
    [S("hay_town", [A("eli", "hug", pos=[-1.3, 0], facing=1.25, emotion="shocked", symbol="!"), A("mamie", "hug", pos=[1.3, 0], facing=-1.25, emotion="happy")],
       C("closeup", angle=-15), envOpts={"hay": 0}, time="sunset", close=True, sfx=[sfx("ding", 0.3, -26)])],
    # 56 Quelque chose brillait dans ses cheveux.
    [S("hay_town", [A("mamie", "idle", facing=3.14, glint=True)], P([0.8, 6.2, -2.6], [0.6, 6.1, -2.2], [0, 5.4, 0], 40), envOpts={"hay": 0}, time="sunset", sfx=[sfx("sparkle", 0, -24)])],
    # 57 « Grand-mère, qu'est-ce que c'est ? »
    [S("hay_town", [A("eli", "point", pos=[-2, 0], facing=0.8), A("mamie", "idle", pos=[2, 0], facing=-0.8)], C("ots", focus=0), envOpts={"hay": 0}, time="sunset")],
    # 58 « Oh, ce vieux truc ?
    [S("hay_town", [A("mamie", "talk", emotion="smug")], C("closeup", angle=12), envOpts={"hay": 0}, time="sunset")],
    # 59 Je l'ai trouvé dans le foin quand j'avais six ans.
    [S("hay_base", [A("mamie_jeune", "hold_up", prop="needle", emotion="joy")], C("medium", angle=10), fx=["sparkles", "straw"], sfx=[sfx("sparkle", 0.2, -27)])],
    # 60 Il tient mon chignon. »
    [S("hay_town", [A("mamie", "talk", facing=2.6, emotion="smug", glint=True)], C("closeup", angle=60), envOpts={"hay": 0}, time="sunset")],
    # 61 C'est donc comme ça que j'ai trouvé l'aiguille en or.
    [S("hay_town", [A("eli", "hold_up", prop="needle", emotion="joy")], C("low", angle=0), envOpts={"hay": 0}, time="sunset", fx=["rays"],
       crowd=[dict(n=12, area=[-12, -10, 12, -3], action="shocked", facing=0, spread=0.6)], sfx=[sfx("sparkle", 0, -24), sfx("cheer", 0.4, -28)])],
    # 62 Avec une cuillère et un câlin.
    [S("hay_town", [A("eli", "hold_up", prop="spoon", emotion="happy")], C("medium", angle=15), envOpts={"hay": 0}, time="sunset"),
     S("hay_town", [A("mamie", "hug", pos=[1.3, 0], facing=-1.25, emotion="happy"), A("eli", "hug", pos=[-1.3, 0], facing=1.25, emotion="happy")], C("two_shot", angle=-10),
       envOpts={"hay": 0}, time="sunset", close=True, cut="et", fx=["hearts"])],
    # 63 Maintenant, nous sommes riches.
    [S("festival", [A("eli", "celebrate")], C("low", angle=10), fx=["coins", "confetti"],
       crowd=[dict(n=14, area=[-14, -6, 14, 4], action=["celebrate", "jump", "dance"], facing=0, spread=0.8)], sfx=[sfx("cheer", 0, -25), sfx("cash", 0.3, -26)])],
    # 64 Kevin a un étang en or.
    [S("gold_pond", [], P([0, 7, 6], [0, 6, 2], [0, 1, -10], 50), pets=[{"kind": "frog", "pos": [0, -10], "y": 1.0, "hop": 0.5, "facing": 0}], fx=["sparkles"],
       crowd=[dict(n=8, area=[-14, -24, 14, -18], action=["wave", "celebrate"], facing=0)], sfx=[sfx("sparkle", 0.2, -26)])],
    # 65 Et grand-mère a une nouvelle épingle à cheveux.
    [S("festival", [A("mamie", "idle", emotion="happy", glint=True)], C("closeup", angle=-10))],
    # 66 C'est un cure-dent.
    [S("festival", [A("mamie", "idle", pos=[-2, 0], facing=0.6, emotion="happy"), A("oncle", "sneak", pos=[3, -1], facing=-0.6, emotion="smug", prop="toothpick")], C("two_shot", angle=10))],
    # 67 Et toi ?
    [S("festival", [A("eli", "point_cam", emotion="happy")], C("xcu"))],
    # 68 Tu l'avais remarquée dans cette vidéo depuis le début ?
    [S("hay_town", [dict(GRANDMA_FAR, glint=True)], FIRST, fx=["straw"], crowd=[dict(n=10, area=[-30, 70, 30, 110], action=["walk", "idle"], facing=0, spread=3)], sfx=[sfx("riser", 0, -28)])],
    # 69 Depuis le tout premier plan.
    [S("hay_town", [dict(GRANDMA_FAR, glint=True)], P([3, 8, 140], [4.5, 6.4, 125], [5, 4, 118], 44), fx=["straw"], sfx=[sfx("sparkle", 0.3, -24)])],
    # 70 Est-ce que tu l'avais vue avant moi ?
    [S("festival", [A("eli", "wave", emotion="happy")], C("closeup", angle=10), fadeOut=0.5, sfx=[sfx("pop", 0.2, -27)])],
]

cast = json.load(open(os.path.join(os.path.dirname(__file__), "cast.json")))
out = {"cast": cast, "defaults": {"time": "day"}, "sentences": sentences}
json.dump(out, open(os.path.join(os.path.dirname(__file__), "direction.json"), "w"), indent=1, ensure_ascii=False)
print(len(sentences), "sentences,", sum(len(p) for p in sentences), "shots")
