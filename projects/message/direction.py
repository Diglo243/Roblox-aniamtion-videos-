"""« Message » — shot-for-shot adaptation of the reference (76 shots) on the French voice-over.
Brand cast: Nino (Eli), Lila (sister), Papa Bruno, Sam (best friend), Mamie Rose.
Each sentence lists the reference shots it covers in the same order; w = reference duration.
python3 projects/message/direction.py -> direction.json"""
import json
import math
import os

SWX = 10.5


def P(frm, to, look, fov=46, look_to=None, **k):
    c = {"type": "path", "from": frm, "to": to, "look": look, "fov": fov}
    if look_to:
        c["lookTo"] = look_to
    c.update(k)
    return c


def FR(t, W, az=90.0, pitch=8.0, fov=46, ratio=0.6, push=0.08):
    """camera framing a subject of width W; az: direction towards the camera (0 = -x, 90 = +z, 180 = +x)"""
    d = W / (ratio * 2 * math.tan(math.radians(fov / 2)) * 0.5625)
    a, p = math.radians(az), math.radians(pitch)
    v = [-math.cos(p) * math.cos(a), math.sin(p), math.cos(p) * math.sin(a)]
    return P([round(t[i] + v[i] * d, 2) for i in range(3)], [round(t[i] + v[i] * d * (1 - push), 2) for i in range(3)], list(t), fov)


def hy(hs=1.0, fl=0.0, sc=1.0):
    return (3.95 + 0.68 * hs) * sc + fl


def HEAD(x, z, hs=1.0, fl=0.0, sc=1.0, **k):
    return FR([x, hy(hs, fl, sc), z], (1.25 * hs + 0.6) * sc, ratio=k.pop("ratio", 0.6), fov=k.pop("fov", 42), **k)


def BODY(x, z, hs=1.0, fl=0.0, sc=1.0, **k):
    h = (4.0 + 1.25 * hs) * sc
    return FR([x, fl + h * 0.5, z], max(3.4 * sc, h * 0.5), ratio=k.pop("ratio", 0.55), **k)


def A(id, action="idle", **k):
    return dict(id=id, action=action, **k)


def S(env, actors=(), camera=None, **k):
    d = dict(env=env, actors=list(actors), camera=camera or {"type": "medium"})
    d.update(k)
    return d


def sfx(name, at=0, gain=None):
    e = {"name": name, "at": at}
    if gain is not None:
        e["gain"] = gain
    return e


POP = lambda at=0.1: sfx("pop", at, -24)
DING = lambda at=0.1: sfx("ding", at, -26)
TEXTERS = dict(n=14, area=[-9, -30, 9, 10], action=["text", "text", "walk", "phone"], facing=0, spread=2.5, props=["phone"])
PLAZA_CROWD = dict(n=18, area=[-14, -14, 14, 6], action=["idle", "text", "look_around"], facing=0, spread=1.2)
METEOR = lambda face="none", grow=None, y=110, r=60: {"kind": "meteor", "pos": [0, -240], "y": y, "r": r, "face": face, **({"grow": grow} if grow else {})}
BUNT = [{"kind": "bunting", "pos": [0, -4], "w": 30, "y": 12}, {"kind": "bunting", "pos": [0, -16], "w": 30, "y": 13}]
UP = P([0, 2.5, 34], [0, 2.8, 32], [0, 40, -120], 58)          # looking up at the sky above the plaza
PL = "town_plaza"

sentences = [
    # 0 Dans cette ville, tout ce que tu écris dans un message devient réalité.      ref #0 shopping street, messages popping
    [S("town_street", [A("jaune", "text", pos=[2, 6], facing=0.4, prop="phone", bubble="🤯", bubbleAt=0.3, bubbleSize=2.4)], P([0, 9, 36], [0, 6, 22], [1, 4, -10], 54), noSplit=True,
       crowd=[dict(TEXTERS, area=[-8, -30, 8, 4])], worldProps=[{"kind": "bunting", "pos": [0, 0], "w": 30, "y": 13}, {"kind": "bunting", "pos": [0, -14], "w": 30, "y": 13}], fx=["confetti"], sfx=[POP(1.0)])],
    # 1 Tu vois cet homme ?                                                            ref #1 park, man on the bench
    [S("park2", [A("homme", "text", pos=[0, -1.2], prop="phone")], FR([0, 3.2, -1.2], 14, az=60, pitch=10, ratio=0.9), envOpts={"sign": False})],
    # 2 Son ami vient de lui envoyer une vidéo drôle et il a répondu : Je suis mort.  ref #2 close-up, then skeleton + bubble
    [S("park2", [A("homme", "laugh", pos=[0, -1.2], prop="phone", emotion="joy")], FR([0, 4.2, -1.2], 5, az=80, pitch=4, ratio=0.75), envOpts={"sign": False}, w=1.0),
     S("park2", [A("squelette", "laugh", pos=[0, -1.2], prop="phone", emotion="skull", bubble="Je suis mort 💀", bubbleAt=0.05)], FR([0, 4.2, -1.2], 6.5, az=100, pitch=4, ratio=0.75),
       envOpts={"sign": False}, cut="je", w=1.0, sfx=[POP(0.1), sfx("crack", 0.1, -30)])],
    # 3 Ne t'inquiète pas, ça disparaît d'ici mardi.                                   ref #3 the skeleton walks his dog
    [S("park2", [A("squelette", "walk", pos=[-6, 4], dir=0.5, speed=0.5, emotion="skull")], dict(BODY(-6, 4, az=60, pitch=6, ratio=0.4), follow=True), envOpts={"sign": False},
       pets=[{"kind": "dog", "pos": [-3.5, 5.5], "facing": 0.5}])],
    # 4 Je m'appelle Eli et ... il faut faire très attention à ce qu'on écrit avec ses pouces.   ref #4 sign wide, #5 close-up, #6 thumbs
    [S("park2", [A("nino", "wave", pos=[0, -4], emotion="happy")], FR([0, 5, -6], 15, az=90, pitch=6, ratio=0.95), envOpts={"signZ": -9}, w=2.0),
     S("park2", [A("nino", "text", pos=[0, -4], prop="phone", emotion="shocked")], HEAD(0, -4, az=95, ratio=0.5), envOpts={"signZ": -9}, cut="il", w=1.5),
     S("phone_cu", [], P([0.6, 7.5, 16], [0.5, 7.2, 14], [0, 6.2, 0], 50), envOpts={"text": "...", "typeAt": [0, 1]}, cut="avec", w=0.9)],
    # 5 Tu écris Je suis en route et tu es propulsé à travers le toit.                 ref #7 bathroom + bubble, #8 launched through the roof
    [S("shower", [A("pyjama", "text", prop="phone", emotion="happy", bubble="Je suis en route", bubbleType=True, bubbleAt=0.1)], FR([0, 4.4, 0], 6, az=90, pitch=4, ratio=0.85), w=1.2),
     S("suburb", [A("pyjama", "celebrate", pos=[SWX + 9, 30], float=[8, 60], animAt=[0, 1], emotion="shocked")], P([2, 4, 52], [2, 5, 50], [SWX + 9, 18, 30], 58, look_to=[SWX + 9, 40, 30]),
       cut="et", fx=["smoke"], w=1.8, noSplit=True, sfx=[sfx("boom", 0.05, -27), sfx("whoosh", 0.2, -25)])],
    # 6 Tu écris Je pleure et toute la salle de classe se retrouve inondée.            ref #9 classroom flood
    [S("classroom", [A("pyjama", "cry", pos=[0, 0], bubble="Je pleure 😭", bubbleAt=0.05)], FR([0, 4, 0], 7, az=90, pitch=6, ratio=0.8), w=1.2),
     S("classroom", [A("pyjama", "cry", pos=[0, 0], float=[0, 4], animAt=[0.1, 0.9])], P([6, 9, 18], [5, 9, 16], [0, 3, 0], 56), worldProps=[{"kind": "water", "level": [0, 4.5], "levelAt": [0, 0.9], "w": 40, "d": 40}],
       crowd=[dict(n=6, area=[-12, -6, 12, 10], action=["scared", "jump"], facing=0, spread=1)], cut="et", w=1.8, sfx=[sfx("wind", 0, -28)])],
    # 7 Ma sœur a écrit Slay.                                                          ref #10 bedroom, sister typing
    [S("bedroom", [A("lila", "text", prop="phone", emotion="smug", bubble="Slay 💅", bubbleAt=0.35)], HEAD(0, 0, az=95, ratio=0.45), envSeed=3, sfx=[POP(0.4)])],
    # 8 Maintenant, elle doit faire face à une épée et à un dragon.                    ref #11 sword + dragon in the bedroom
    [S("bedroom", [A("lila", "scared", pos=[-3, 3], facing=0.6, prop="sword")], P([-9, 7, 16], [-8, 7, 14], [2, 6, -4], 54), envSeed=3, worldProps=[{"kind": "dragon", "pos": [4, -2], "facing": -0.8, "scale": 0.8}],
       sfx=[sfx("boom", 0.1, -29)])],
    # 9 Mon père a écrit Énorme L.                                                     ref #12 dad in front of his house
    [S("suburb", [A("papa_bruno", "text", pos=[SWX, 20], facing=-1.35, prop="phone", bubble="Énorme L", bubbleAt=0.3)], BODY(SWX, 20, az=-10, pitch=4, ratio=0.5),
       worldProps=[{"kind": "car", "pos": [6.5, 14], "facing": 0}], sfx=[POP(0.35)])],
    # 10 Un énorme L est tombé sur sa voiture.                                         ref #13 the giant L crushes the car
    [S("suburb", [A("papa_bruno", "shocked", pos=[SWX, 20], facing=-1.35)], P([-3, 6, 30], [-2.5, 6, 29], [7, 4, 14], 54),
       worldProps=[{"kind": "car", "pos": [6.5, 14], "facing": 0}, {"kind": "big_L", "pos": [6.5, 14], "fall": [40, 2.2], "fallAt": [0.05, 0.3]}], fx=["shake"], noSplit=True, sfx=[sfx("boom", 0.25, -24)])],
    # 11 Et mon voisin a répondu L M A O.                                              ref #14 neighbour behind his fence
    [S("suburb", [A("voisin", "laugh", pos=[SWX + 2, 53], facing=-1.35, prop="phone", emotion="joy", bubble="LMAO", bubbleAt=0.4, bubbleSide=-1)], HEAD(SWX + 2, 53, az=10, ratio=0.5),
       fx=["smoke"], sfx=[POP(0.45)])],
    # 12 Il est toujours en train de le chercher.                                      ref #15 searching the garden, LOST sign
    [S("suburb", [A("voisin", "look_around", pos=[SWX + 2, 53], facing=-1.35)], P([2, 4.5, 62], [2.5, 4.5, 61], [SWX + 2, 3, 53], 50), worldProps=[{"kind": "sign", "pos": [SWX - 1.5, 57], "text": "PERDU", "facing": -1.3}])],
    # 13 Mon meilleur ami a écrit B R B.                                               ref #16 friend on the couch, #17 bubble
    [S("living_room", [A("sam", "sit_work", pos=[-3, -10.4])], P([6, 9, 10], [5, 9, 9], [-1, 3, -9], 52), w=0.9),
     S("living_room", [A("sam", "sit_work", pos=[-3, -10.4], bubble="BRB", bubbleAt=0.2)], FR([-3, 4.6, -10.4], 5, az=80, pitch=6, ratio=0.6), cut="b", w=1.2, sfx=[POP(0.25)])],
    # 14 Il a disparu.                                                                  ref #17 he vanishes
    [S("living_room", [A("sam", "sit_work", pos=[-3, -10.4], vanishAt=0.35)], FR([-3, 4.6, -10.4], 6, az=80, pitch=6, ratio=0.6), fx=["sparkles", "flash"], noSplit=True, sfx=[sfx("sparkle", 0.3, -24)])],
    # 15 C'était en mars.                                                               ref #18 empty living room
    [S("living_room", [], P([8, 9, 10], [7, 9, 9], [0, 4, -8], 54), sfx=[sfx("wind", 0, -31)])],
    # 16 Ma cousine s'est fait ghoster par un véritable fantôme.                       ref #19 cousin with phone, #20 the ghost behind her
    [S("kitchen", [A("cousine", "text", pos=[2, 4], prop="phone", emotion="sad")], BODY(2, 4, az=95, ratio=0.5), w=1.4),
     S("kitchen", [A("cousine", "shocked", pos=[2, 4], prop="phone")], P([7, 6, 13], [6.5, 6, 12], [0.5, 5, 3], 50), pets=[{"kind": "ghost", "pos": [-1, 1], "facing": 0.6, "y": 1.5}], cut="par", w=1.5,
       sfx=[sfx("whoosh", 0.1, -27)])],
    # 17 Il vit maintenant dans son placard.                                            ref #21 breakfast with the ghost
    [S("kitchen", [A("cousine", "sit", pos=[-5, -1.6]), ], P([-2, 6, 12], [-2, 6, 11], [-3, 4, 0], 50), pets=[{"kind": "ghost", "pos": [-1, 4.4], "facing": 3.14, "y": 2.2}])],
    # 18 Et quelqu'un a dit à mon frère de toucher l'herbe.                            ref #22 gamer room, "touch grass" bubble
    [S("gamer_room", [A("frere", "sit_work", pos=[0, -1.5], bubble="Va toucher l'herbe", bubbleAt=0.35)], P([8, 7.5, 1], [7.5, 7.5, 0.5], [0, 4.5, -2.5], 52), sfx=[POP(0.4)])],
    # 19 Depuis lundi, il est collé à la pelouse.                                      ref #23 stuck on the lawn
    [S("suburb", [A("frere", "sit_sad", pos=[SWX + 2, 2], facing=-1.35)], BODY(SWX + 2, 2, az=15, pitch=10, ratio=0.55))],
    # 20 Même les émojis comptent.                                                      ref #24 grandma cooking
    [S("kitchen", [A("mamie_rose", "eat", pos=[-4, -9.5], facing=3.14, prop="spoon")], P([4, 6, 2], [3, 6, 1], [-4, 4, -11], 50), envOpts={"noTable": True})],
    # 21 La semaine dernière, grand-mère a écrit que sa soupe était en feu, avec l'émoji du feu.   ref #25 close-up + bubble, #26 explosion
    [S("kitchen", [A("mamie_rose", "text", pos=[-4, -6], facing=0, prop="phone", emotion="happy", bubble="Ma soupe est 🔥", bubbleAt=0.15)], HEAD(-4, -6, az=90, ratio=0.45), envOpts={"noTable": True}, w=1.9),
     S("kitchen", [A("mamie_rose", "shocked", pos=[-8, -6], facing=0.4)], P([2, 7, 8], [1.5, 7, 7], [-6, 5, -12], 54), envOpts={"noTable": True}, cut="avec", fx=["fire", "flash", "shake"], w=1.1, sfx=[sfx("boom", 0.05, -24)])],
    # 22 Maintenant, nous avons une nouvelle cuisine.                                   ref #27 new kitchen with extinguishers
    [S("kitchen", [A("mamie_rose", "wave", pos=[-4, -6], facing=0, prop="phone", emotion="happy")], P([4, 7, 8], [3.5, 7, 7], [-4, 5, -11], 52), envSeed=5, envOpts={"noTable": True},
       worldProps=[{"kind": "extinguishers", "pos": [-9, -10.5], "n": 7, "y": 4.2}], sfx=[DING(0.2)])],
    # 23 Et puis, il y a le correcteur automatique.                                    ref #28 traffic jam from above
    [S("highway", [], P([40, 60, 60], [34, 56, 40], [0, 0, -60], 55), sfx=[sfx("engine", 0, -29)])],
    # 24 Mon oncle s'est énervé et a écrit : Cette circulation de canards !            ref #29 uncle in his red truck, #30 the phone
    [S("highway", [A("oncle", "angry", pos=[11.3, 28], facing=-1.57, emotion="angry", prop="phone")], P([6, 8.5, 40], [6.4, 8.3, 39], [11.3, 4.6, 28], 46), worldProps=[{"kind": "car", "pos": [8.6, 28], "facing": 0, "color": "#e53935"}],
       envOpts={"cars": True}, w=1.7),
     S("phone_cu", [], P([0.6, 7.5, 16], [0.5, 7.2, 14], [0, 6.2, 0], 50), envOpts={"text": "Cette circulation de canards !", "typeAt": [0.05, 0.85], "bg": "#c62828"}, cut="cette", w=1.5, sfx=[POP(0.9)])],
    # 25 Ça fait trois jours qu'il est coincé au milieu des canards.                   ref #31 ducks everywhere, #32 truck in the ducks
    [S("highway", [], P([20, 70, 40], [18, 66, 30], [0, 0, -80], 55), envOpts={"cars": False}, worldProps=[{"kind": "ducks", "n": 1400, "area": [-13, -260, 13, 60]}, {"kind": "car", "pos": [0, 0], "color": "#e53935"}], w=1.3),
     S("highway", [A("oncle", "sad", pos=[2.7, 0], facing=-1.57)], P([7, 4.5, 9], [6.6, 4.5, 8], [1.5, 3.5, 0], 50), envOpts={"cars": False}, worldProps=[{"kind": "ducks", "n": 700, "area": [-13, -40, 13, 30]}, {"kind": "car", "pos": [0, 0], "color": "#e53935"}],
       cut="qu'il", w=1.0)],
    # 26 C'est pour ça que je vérifie chaque message trois fois.                       ref #33 magnifying glass, #34 close-up
    [S("suburb", [A("nino", "text", pos=[SWX, 2], facing=-1.35, prop="phone")], BODY(SWX, 2, az=-15, pitch=12, ratio=0.6), w=1.8),
     S("suburb", [A("nino", "think", pos=[SWX, 2], facing=-1.35, symbol="?")], HEAD(SWX, 2, az=5, ratio=0.6), cut="trois", w=0.7)],
    # 27 Mais ma petite sœur ne le fait pas.                                           ref #35 the baby sister
    [S("suburb", [A("bebe", "idle", pos=[SWX, 6], facing=-1.35, emotion="smug")], HEAD(SWX, 6, sc=0.62, az=10, pitch=-6, ratio=0.5))],
    # 28 Hier, elle a pris mon téléphone et a envoyé 40 émojis de pizza à tout le monde.   ref #36 she takes the phone, #37 pizza bubble
    [S("suburb", [A("nino", "idle", pos=[SWX, 2], facing=-1.0), A("bebe", "give", pos=[SWX - 1.5, 5], facing=-1.8, prop="phone", emotion="evil")], FR([SWX - 0.8, 3, 3.5], 7, az=-5, pitch=10, ratio=0.8), w=1.7),
     S("suburb", [A("bebe", "celebrate", pos=[SWX, 6], facing=-1.35, prop="phone", emotion="joy", bubble="🍕🍕🍕🍕🍕🍕🍕", bubbleAt=0.05, bubbleSize=6)], HEAD(SWX, 6, sc=0.62, az=0, ratio=0.4), cut="et", w=1.9,
       sfx=[POP(0.1), POP(0.3), POP(0.5)])],
    # 29 Le meilleur jour de ma vie.                                                   ref #38 pizza rain, #39 Nino celebrating
    [S("suburb", [], P([2, 6, 40], [2, 6.5, 36], [SWX, 5, 10], 55), crowd=[dict(n=10, area=[-4, 0, 14, 30], action=["celebrate", "jump"], facing=-1.35, spread=0.8)], fx=["pizza"], w=1.2),
     S("suburb", [A("nino", "celebrate", pos=[SWX, 2], facing=-1.35, emotion="joy")], BODY(SWX, 2, az=0, pitch=-6, ratio=0.6), fx=["pizza"], cut="jour", w=1.2, sfx=[sfx("cheer", 0, -28)])],
    # 30 Mais vendredi, le maire a envoyé un message à toute la ville.                 ref #40 plaza, Friday, #41 mayor at his desk
    [S(PL, [A("nino", "walk", pos=[3, 10], dir=3.14, speed=0.4)], P([4, 3, 30], [4, 3.2, 28], [0, 10, -40], 54), worldProps=BUNT, w=1.5),
     S("office", [A("maire", "sit_work", pos=[0, -6.5], prop="phone")], P([0, 7, 9], [0, 7, 8], [0, 4.5, -6], 50), cut="le", w=1.6)],
    # 31 Il voulait écrire Réunion de la ville à 17 heures.                            ref #42 mayor typing, bubble
    [S("office", [A("maire", "text", pos=[0, -2], facing=0, prop="phone", bubble="Réunion de la ville à 17h", bubbleType=True, bubbleAt=0.15, bubbleSize=5.5)], HEAD(0, -2, sc=1.05, az=90, ratio=0.45))],
    # 32 Mais il a écrit Météorite sur la ville à 17 heures.                           ref #43 the phone, #44 aerial plaza with the message
    [S("phone_cu", [], P([0.6, 7.5, 16], [0.5, 7.2, 14], [0, 6.2, 0], 50), envOpts={"text": "Météorite sur la ville à 17h", "typeAt": [0.05, 0.9], "bg": "#1b5e20"}, w=0.8),
     S(PL, [A("maire", "idle", pos=[0, -2], bubble="Météorite sur la ville à 17h", bubbleAt=0.0, bubbleSize=26)], P([0, 70, 40], [0, 66, 36], [0, 0, -14], 54), worldProps=BUNT, crowd=[PLAZA_CROWD], cut="météorite", w=1.4)],
    # 33 Tout le monde a levé les yeux.                                                 ref #45 everybody looks up
    [S(PL, [], P([2, 5, 22], [2, 5, 21], [0, 5, 0], 50), worldProps=BUNT, crowd=[dict(PLAZA_CROWD, n=12, area=[-8, -6, 8, 6], action="look_around")])],
    # 34 Et elle était là !                                                             ref #46 the burning meteor
    [S(PL, [], UP, worldProps=BUNT + [METEOR()], fx=["punch"], sfx=[sfx("rumble", 0, -26)])],
    # 35 Une roche enflammée aussi grosse que notre ville !                             ref #47 the meteor over the town and its people
    [S(PL, [], P([6, 4, 30], [5, 4.5, 28], [0, 30, -100], 56), worldProps=BUNT + [METEOR(grow=[1, 1.25])], crowd=[dict(PLAZA_CROWD, action=["scared", "shocked"], facing=3.14)], fx=["shake"],
       sfx=[sfx("rumble", 0, -25)])],
    # 36 Le maire a paniqué.                                                            ref #48 mayor panics
    [S(PL, [A("maire", "scared", pos=[0, 0], emotion="scared")], HEAD(0, 0, sc=1.05, az=90, ratio=0.45), worldProps=BUNT)],
    # 37 Il a écrit : Nous sommes cuits !                                               ref #48 bubble
    [S(PL, [A("maire", "text", pos=[0, 0], prop="phone", emotion="scared", bubble="Nous sommes cuits !", bubbleAt=0.3)], HEAD(0, 0, sc=1.05, az=80, ratio=0.4), worldProps=BUNT, sfx=[POP(0.35)])],
    # 38 Toute la ville a commencé à grésiller.                                         ref #49-50 the town sizzles
    [S(PL, [], P([3, 6, 24], [2.5, 6, 22], [0, 2, 0], 54), worldProps=BUNT + [{"kind": "egg", "pos": [2, 6]}, {"kind": "egg", "pos": [-3, 9]}, {"kind": "egg", "pos": [5, 12]}], fx=["steam", "red"],
       crowd=[dict(PLAZA_CROWD, action=["jump", "scared"])], sfx=[sfx("crack", 0, -30)])],
    # 39 Il a écrit : Tout le monde, détendez-vous !                                    ref #51 mayor + bubble
    [S(PL, [A("maire", "text", pos=[0, 0], prop="phone", emotion="tired", bubble="Détendez-vous ! 🧊", bubbleAt=0.35)], HEAD(0, 0, sc=1.05, az=100, ratio=0.4), worldProps=BUNT, sfx=[POP(0.4)])],
    # 40 Et nous nous sommes retrouvés complètement gelés.                              ref #52 frozen town
    [S(PL, [], P([4, 6, 24], [3.5, 6, 22], [0, 3, 0], 54), worldProps=BUNT, crowd=[dict(PLAZA_CROWD, frozen=True, action="shocked", emotion="shocked")], fx=["snow"], sfx=[sfx("crack", 0.1, -28)])],
    # 41 Ma petite sœur a essayé d'aider.                                               ref #53 baby sister frozen (but trying)
    [S(PL, [A("bebe", "text", pos=[0, 0], prop="phone", emotion="think")], HEAD(0, 0, sc=0.62, az=90, ratio=0.5), worldProps=BUNT, crowd=[dict(PLAZA_CROWD, n=6, area=[-6, -12, 6, -6], frozen=True)])],
    # 42 Elle a envoyé un smiley.                                                       ref #54 the smiley
    [S(PL, [A("bebe", "text", pos=[0, 0], prop="phone", emotion="happy", bubble="🙂", bubbleAt=0.2, bubbleSize=2.6)], HEAD(0, 0, sc=0.62, az=80, ratio=0.45), worldProps=BUNT, sfx=[POP(0.25)])],
    # 43 Maintenant, la météorite souriait.                                             ref #55 the meteor smiles
    [S(PL, [], UP, worldProps=BUNT + [METEOR("smile")], sfx=[DING(0.2)])],
    # 44 C'était encore pire.                                                           ref #56 big evil grin
    [S(PL, [], P([0, 3, 30], [0, 4, 26], [0, 60, -160], 50), worldProps=BUNT + [METEOR("grin", grow=[1.1, 1.3])], fx=["punch"], sfx=[sfx("boom", 0, -29)])],
    # 45 À 16 h 59, le ciel était en feu.                                               ref #57 clock tower, #58 sky on fire
    [S(PL, [], P([6, 22, -10], [5, 23, -12], [0, 26, -48], 46), time="doom", worldProps=BUNT, w=1.0, sfx=[sfx("heartbeat", 0, -26)]),
     S(PL, [], UP, time="doom", worldProps=BUNT + [METEOR("grin", grow=[1.3, 1.5])], cut="ciel", fx=["fire"], w=1.5)],
    # 46 Tout le monde criait.                                                          ref #59 screaming crowd
    [S(PL, [], P([2, 4, 20], [2, 4, 18], [0, 4, -4], 54), time="doom", worldProps=BUNT, crowd=[dict(PLAZA_CROWD, action=["run", "scared"], emotion="scream", dir=1.57, speed=0.4)], fx=["shake"],
       sfx=[sfx("cheer", 0, -27)])],
    # 47 Puis, j'ai eu une idée.                                                        ref #60 close-up idea
    [S(PL, [A("nino", "think", pos=[0, 0], symbol="idea")], HEAD(0, 0, az=90, ratio=0.6), time="doom", worldProps=BUNT, sfx=[DING(0.3)])],
    # 48 J'ai attrapé mon téléphone et j'ai écrit cinq mots.                            ref #61 grabs the phone, #62 types
    [S(PL, [A("nino", "phone", pos=[0, 0], prop="phone", emotion="smug")], BODY(0, 0, az=70, ratio=0.6), time="doom", worldProps=BUNT, w=1.0),
     S(PL, [A("nino", "text", pos=[0, 0], prop="phone", emotion="smug")], HEAD(0, 0, az=110, pitch=12, ratio=0.5), time="doom", worldProps=BUNT, cut="j'ai", w=1.5)],
    # 49 La météorite est toute petite.                                                 ref #63 phone + bubble
    [S("phone_cu", [], P([0.6, 7.5, 16], [0.5, 7.2, 14], [0, 6.2, 0], 50), envOpts={"text": "La météorite est toute petite", "typeAt": [0.05, 0.9], "bg": "#b3260f"})],
    # 50 Envoyé !                                                                       ref #64 send
    [S(PL, [A("nino", "point", pos=[0, 0], prop="phone", bubble="La météorite est toute petite", bubbleAt=0.0, bubbleSize=6)], P([0, 3, 14], [0, 3, 12], [0, 18, -60], 56), time="doom",
       worldProps=BUNT + [METEOR("grin", grow=[1.5, 1.5])], sfx=[sfx("whoosh", 0, -25)])],
    # 51 Le ciel est devenu silencieux et quelque chose de minuscule a rebondi sur la tête du maire.   ref #65 white flash + calm sky, #66 tiny rock
    [S(PL, [], UP, worldProps=BUNT, fx=["flash"], w=1.3, sfx=[sfx("sparkle", 0.1, -26)]),
     S(PL, [A("maire", "idle", pos=[0, 0], emotion="neutral")], FR([0, 6, 0], 6, az=90, pitch=4, ratio=0.7), worldProps=BUNT + [{"kind": "tiny_rock", "pos": [0, 0], "y0": 16, "top": 7.9}],
       cut="quelque", w=2.3, noSplit=True, sfx=[sfx("pop", 0.55, -23)])],
    # 52 Aïe !                                                                          ref #67 ow
    [S(PL, [A("maire", "idle", pos=[0, 0], emotion="cry")], HEAD(0, 0, sc=1.05, az=85, ratio=0.5), worldProps=BUNT, fx=["punch"], sfx=[POP(0)])],
    # 53 Nous étions sauvés !                                                           ref #68 the crowd cheers
    [S(PL, [], P([0, 8, 30], [0, 8, 26], [0, 4, -4], 54), worldProps=BUNT, crowd=[dict(PLAZA_CROWD, action=["celebrate", "jump", "dance"], emotion="joy")], fx=["confetti"], sfx=[sfx("cheer", 0, -24)])],
    # 54 Toute la ville a applaudi.
    [S(PL, [], P([10, 4, 20], [8, 4, 18], [0, 4, -2], 54), worldProps=BUNT, crowd=[dict(PLAZA_CROWD, action=["celebrate", "wave"], emotion="joy")], fx=["confetti"])],
    # 55 Les habitants m'ont porté dans les rues.                                      ref #69 carried in the streets
    [S("town_street", [A("nino", "celebrate", pos=[0, 0], float=3.6, emotion="joy", dir=0, speed=0)], P([5, 7, 22], [4, 7, 20], [0, 6, 0], 54), worldProps=[{"kind": "bunting", "pos": [0, 0], "w": 30, "y": 13}],
       crowd=[dict(n=8, area=[-2.5, -2, 2.5, 2], action="hold_up", facing=0, spread=0.3), dict(n=8, area=[-10, -16, 10, 10], action=["celebrate", "jump"], facing=0, spread=1)], fx=["confetti"])],
    # 56 Puis mon téléphone s'est mis à vibrer.                                        ref #70 phone buzzing
    [S("town_street", [A("nino", "phone", pos=[0, 0], float=3.6, emotion="happy", prop="phone")], HEAD(0, 0, fl=3.6, az=90, ratio=0.55), worldProps=[{"kind": "bunting", "pos": [0, 0], "w": 30, "y": 13}],
       crowd=[dict(n=6, area=[-2.5, -2, 2.5, 2], action="hold_up", facing=0, spread=0.3)], fx=["shake"], sfx=[sfx("engine", 0, -30)])],
    # 57 Mille messages venaient d'arriver.                                             ref #71 the phone full of messages
    [S("phone_cu", [], P([0.6, 7.5, 16], [0.5, 7.2, 14], [0, 6.2, 0], 50), envOpts={"bubbles": "Eli, tu es le GOAT 🐐", "bg": "#3a6ee8"}, sfx=[POP(0.1), POP(0.3), POP(0.5), POP(0.7)])],
    # 58 Et ils disaient tous exactement la même chose.                                 ref #72 close-up, bubbles everywhere
    [S("town_street", [A("nino", "idle", pos=[0, 0], emotion="happy"),
                       A("eleve_a", "idle", pos=[-2, -2], shadowOnly=True, bubble="Eli, tu es le GOAT 🐐", bubbleAt=0.05),
                       A("eleve_b", "idle", pos=[2, -1.5], shadowOnly=True, bubble="Tu es le GOAT 🐐", bubbleAt=0.25),
                       A("eleve_c", "idle", pos=[-1, -3], shadowOnly=True, bubble="Le GOAT 🐐", bubbleAt=0.45)],
       HEAD(0, 0, az=90, ratio=0.6), worldProps=[{"kind": "bunting", "pos": [0, 0], "w": 30, "y": 13}], sfx=[POP(0.1), POP(0.35), POP(0.6)])],
    # 59 Tu es le Goat de tous !
    [S("town_street", [A("nino", "idle", pos=[0, 0], emotion="happy", bubble="Tu es le GOAT de tous ! 🐐", bubbleAt=0.0, bubbleSize=5.5)], HEAD(0, 0, az=80, ratio=0.5), worldProps=[{"kind": "bunting", "pos": [0, 0], "w": 30, "y": 13}])],
    # 60 Oh non !                                                                        ref #73 "oh no", #74 baaa
    [S("town_street", [A("nino", "shocked", pos=[0, 0], goatAt=0.35)], HEAD(0, 0, az=90, ratio=0.5), worldProps=[{"kind": "bunting", "pos": [0, 0], "w": 30, "y": 13}], fx=["flash"], noSplit=True,
       sfx=[sfx("boom", 0.2, -28)])],
]

cast = json.load(open(os.path.join(os.path.dirname(__file__), "cast.json")))
cast.update({"jaune": {"name": "Passante", "gender": "f"}, "eleve_a": {"name": "x", "gender": "m"}, "eleve_b": {"name": "x", "gender": "f"}, "eleve_c": {"name": "x", "gender": "m"}})
out = {"cast": cast, "defaults": {"time": "day"}, "max_shot": 1.3, "sentences": sentences}
json.dump(out, open(os.path.join(os.path.dirname(__file__), "direction.json"), "w"), indent=1, ensure_ascii=False)
print(len(sentences), "sentences,", sum(len(p) for p in sentences), "shots")
