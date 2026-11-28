"""« Escaliers » — the underground silo town, adapted shot for shot from the reference (57 shots).
Brand cast: Nino (Eli), Mamie Rose (grandma). Silo geometry: walkways r=21..30, floor height 9,
spiral staircase radius 17.5 (y = 9*theta/2pi), atrium centre at (0,0).
python3 projects/escaliers/direction.py -> direction.json"""
import json
import math
import os

FH, RS = 9.0, 17.5


def P(frm, to, look, fov=46, look_to=None, **k):
    c = {"type": "path", "from": [round(v, 2) for v in frm], "to": [round(v, 2) for v in to], "look": [round(v, 2) for v in look], "fov": fov}
    if look_to:
        c["lookTo"] = [round(v, 2) for v in look_to]
    c.update(k)
    return c


def FR(t, W, az=90.0, pitch=8.0, fov=46, ratio=0.6, push=0.08):
    d = W / (ratio * 2 * math.tan(math.radians(fov / 2)) * 0.5625)
    a, p = math.radians(az), math.radians(pitch)
    v = [-math.cos(p) * math.cos(a), math.sin(p), math.cos(p) * math.sin(a)]
    return P([t[i] + v[i] * d for i in range(3)], [t[i] + v[i] * d * (1 - push) for i in range(3)], list(t), fov)


def hy(hs=1.0, fl=0.0, sc=1.0):
    return (3.95 + 0.68 * hs) * sc + fl


def HEAD(x, z, fl=0.0, sc=1.0, **k):
    return FR([x, hy(1, fl, sc), z], 1.85 * sc, ratio=k.pop("ratio", 0.6), fov=k.pop("fov", 42), **k)


def BODY(x, z, fl=0.0, sc=1.0, **k):
    h = 5.25 * sc
    return FR([x, fl + h * 0.5, z], max(3.4 * sc, h * 0.5), ratio=k.pop("ratio", 0.55), **k)


def A(id, action="idle", **k):
    return dict(id=id, action=action, **k)


def S(env, actors=(), camera=None, **k):
    d = dict(env=env, actors=list(actors), camera=camera or {"type": "medium"})
    d.update(k)
    d.setdefault("fx", ["dust"] if env in ("silo", "hall", "classroom2", "cozy_room", "vault", "attic") else [])
    return d


def sfx(name, at=0, gain=None, dur=None, chord=None):
    e = {"name": name, "at": at}
    if gain is not None:
        e["gain"] = gain
    if dur:
        e["dur"] = dur
    if chord:
        e["chord"] = chord
    return e


# ---- silo helpers -----------------------------------------------------------------
def pol(r, a_deg):
    a = math.radians(a_deg)
    return [r * math.cos(a), r * math.sin(a)]


def face_center(a_deg):
    a = math.radians(a_deg)
    return math.atan2(-math.cos(a), -math.sin(a))


def az_towards_center(a_deg):
    """FR az (camera direction) so that the camera stands between the actor and the atrium centre"""
    a = math.radians(a_deg)
    # FR: camera offset v = (-cos az, ., sin az) ; we want v ~ (-cos a, ., -sin a)
    return math.degrees(math.atan2(-math.sin(a), math.cos(a)))


W60 = 90          # Eli's home spot on floor 60 (angle on the ring)
E = pol(25, W60)  # -> (0, 25)
FE = face_center(W60)
AZ_E = az_towards_center(W60)
SIGN60 = {"kind": "floor_sign", "text": "60", "pos": pol(27.6, W60), "facing": FE}


def stair(theta_deg, level=0.0):
    t = math.radians(theta_deg)
    return [RS * math.cos(t), RS * math.sin(t)], FH * (level + t / (2 * math.pi))


def stair_dir(theta_deg):
    t = math.radians(theta_deg)
    return math.atan2(-math.sin(t), math.cos(t))


SILO = "silo"
DARK = {"dark": True}
PAD_IN = [220.0, 277.18, 329.63, 440.0]       # warm A major (underground)
PAD_OUT = [261.63, 329.63, 392.0, 523.25]      # bright C major (outside)
PAD_EERIE = [196.0, 233.08, 293.66, 369.99]    # G minor-ish (ending)

sentences = [
    # 0 Dans cette ville, personne n'est jamais allé à l'extérieur.     ref #0 top-down into the spiral
    [S(SILO, [], P([0.4, 70, 1.5], [0.4, 40, 1.5], [0, -60, 0], 68, roll=0.0), noSplit=True,
       sfx=[sfx("pad", 0, -31, 28, PAD_IN), sfx("hum", 0, -36, 30), sfx("whoosh", 0.1, -30)])],
    # 1 Nous vivons sous terre.                                         ref #1 Eli on the staircase
    [S(SILO, [A("nino", "walk", pos=stair(200)[0], float=stair(200)[1], facing=stair_dir(200), speed=0, emotion="happy")],
       FR([stair(200)[0][0], stair(200)[1] + 3.2, stair(200)[0][1]], 4.5, az=az_towards_center(200) + 15, pitch=6, ratio=0.6))],
    # 2 Il y a 144 étages.                                              ref #1 looking down the staircase
    [S(SILO, [], P([0, 6, 9], [0, 4, 8], [0, -80, -5], 66), noSplit=True)],
    # 3 Un seul escalier.
    [S(SILO, [], P([24, 4, 6], [23, 4.5, 3], [0, -6, -10], 58))],
    # 4 Une seule fenêtre.                                              ref #2 dining hall + grey window
    [S("hall", [], P([0, 9, 15], [0, 8.5, 12], [0, 6, -17], 56), crowd=[dict(n=16, area=[-17, -9, 17, 9], action=["sit", "eat", "talk"], facing=1.57, spread=0.2)])],
    # 5 Regardez ce type.                                               ref #3 the man carrying a couch up the stairs
    [S(SILO, [A("barbu", "carry", pos=stair(140)[0], float=stair(140)[1], facing=stair_dir(140), emotion="tired")],
       FR([stair(140)[0][0], stair(140)[1] + 3, stair(140)[0][1]], 9, az=az_towards_center(140) - 25, pitch=14, ratio=0.85),
       worldProps=[{"kind": "couch", "pos": stair(140)[0], "y": stair(140)[1] + 4.6, "facing": stair_dir(140) + 1.57}])],
    # 6 Il transporte un canapé jusqu'au 90e étage.
    [S(SILO, [A("barbu", "carry", pos=stair(140)[0], float=stair(140)[1], facing=stair_dir(140), emotion="tired", bubble="90 ↑", bubbleAt=0.3, bubbleSize=2.4)],
       FR([stair(140)[0][0], stair(140)[1] + 4, stair(140)[0][1]], 7, az=az_towards_center(140) + 25, pitch=-8, ratio=0.85),
       worldProps=[{"kind": "couch", "pos": stair(140)[0], "y": stair(140)[1] + 4.6, "facing": stair_dir(140) + 1.57}], sfx=[sfx("steps", 0.2, -30)])],
    # 7 Il est parti lundi.                                             ref #4 resting on the couch with a laptop
    [S(SILO, [A("barbu", "sit_work", pos=pol(25, 30), facing=face_center(30), emotion="tired")], HEAD(*pol(25, 30), az=az_towards_center(30), ratio=0.45),
       worldProps=[{"kind": "couch", "pos": pol(25.6, 30), "facing": face_center(30)}])],
    # 8 Je m'appelle Eli.                                               ref #5 Eli waving under the "60" sign
    [S(SILO, [A("nino", "wave", pos=E, facing=FE, emotion="joy")], BODY(*E, az=AZ_E, ratio=0.68), worldProps=[SIGN60], sfx=[sfx("pop", 0.2, -27)])],
    # 9 Je suis né au 60e étage.
    [S(SILO, [A("nino", "point", pos=E, facing=FE, emotion="happy")], FR([E[0], 6.5, E[1]], 9, az=AZ_E + 12, pitch=4, ratio=0.8), worldProps=[SIGN60])],
    # 10 Mon école se trouve au 30e.                                    ref #6 the school floor
    [S("classroom2", [A("nino", "wave", pos=[0, 2], facing=0, emotion="happy")], BODY(0, 2, az=90, ratio=0.75))],
    # 11 Ma grand-mère habite au 100e étage.                            ref #7 grandma in her rocking chair, sign 100
    [S("cozy_room", [A("mamie_rose", "sit", pos=[0, -1])], P([0, 6, 10], [0, 6, 8.5], [0, 5.5, -1], 46), envOpts={"sign": "100"}, sfx=[sfx("creak", 0.3, -31)])],
    # 12 Lui, il n'a jamais vu le 99e étage.                            ref #8 the old man looking at the floor below
    [S(SILO, [A("vieux", "look_down", pos=pol(25, 200), facing=face_center(200))], FR([pol(25, 200)[0], 5, pol(25, 200)[1]], 6, az=az_towards_center(200) + 20, pitch=8, ratio=0.8),
       worldProps=[{"kind": "floor_sign", "text": "99", "pos": pol(27.6, 200), "y": -9, "facing": face_center(200)}])],
    # 13 Trop d'escaliers.                                              ref #9 grandma close-up, grumpy
    [S("cozy_room", [A("mamie_rose", "sit", pos=[0, -1], emotion="tired")], P([0, 5.4, 5], [0, 5.4, 4.4], [0, 5.2, -1], 44), envOpts={"sign": "100"})],
    # 14 L'ascenseur est en construction depuis 200 ans.               ref #10 boarded elevator + old worker, #11 he is asleep
    [S(SILO, [A("vieux", "idle", pos=pol(24, 250), facing=face_center(250) + 0.5, emotion="tired")], FR([pol(26, 250)[0], 4.5, pol(26, 250)[1]], 10, az=az_towards_center(250), pitch=6, ratio=1.0),
       worldProps=[{"kind": "elevator", "pos": pol(29.4, 250), "facing": face_center(250)}], w=1.6),
     S(SILO, [A("vieux", "idle", pos=pol(24, 250), facing=face_center(250) + 0.5, emotion="sleep", symbol="zzz")], HEAD(*pol(24, 250), az=az_towards_center(250) + 30, ratio=0.5),
       worldProps=[{"kind": "elevator", "pos": pol(29.4, 250), "facing": face_center(250)}], cut="depuis", w=1.0)],
    # 15 Et tout en haut, il y a cette fenêtre.                         ref #12 high view of the dining hall
    [S("hall", [], P([0, 13.5, 15], [0, 13, 12], [0, 2, -8], 62), crowd=[dict(n=22, area=[-17, -9, 17, 9], action=["sit", "eat", "talk"], facing=1.57, spread=0.2)])],
    # 16 Elle donne sur l'extérieur.                                   ref #13 the grey window
    [S("hall", [A("eleve", "sit", pos=[-3, 2], facing=3.14)], P([-3, 6, 8], [-3, 6, 6], [0, 7, -17], 54), sfx=[sfx("wind", 0, -33)])],
    # 17 Un monde gris.
    [S("hall", [], P([0, 7, -10], [0, 7, -12], [0, 10, -80], 52), noSplit=True)],
    # 18 Mort.
    [S("hall", [], P([6, 6, -12], [6, 6, -13], [10, 6, -90], 48))],
    # 19 Rien ne bouge.
    [S("hall", [], P([-6, 8, -12], [-6, 8, -12.5], [-12, 4, -90], 52))],
    # 20 Et tout le monde connaît la première règle :                  ref #14 the blackboard
    [S("classroom2", [], P([0, 7, 2], [0, 7, -2], [0, 7, -16], 50), crowd=[dict(n=6, area=[-10, 0, 10, 12], action="sit", facing=3.14, spread=0.2)]),
     S("classroom2", [], P([3, 7.5, -5], [2.4, 7.5, -7], [3, 7, -16], 46), cut="l'air", fx=["dust", "punch"], sfx=[sfx("boom", 0.1, -33)])],
    # 22 On nous apprend ça avant même de nous apprendre nos noms.     ref #15 Eli in the classroom
    [S("classroom2", [A("nino", "sit", pos=[3, 6], facing=3.14)], P([3, 6, -2], [3, 6, -3], [3, 5, 6], 46), crowd=[dict(n=5, area=[-10, 0, 10, 12], action="sit", facing=3.14, spread=0.2)])],
    # 23 Personne ne pose de questions.                                ref #16 by the window, "questions" sign
    [S("hall", [A("nino", "idle", pos=[4, -12], facing=0.3, emotion="think")], BODY(4, -12, az=80, ratio=0.4))],
    # 24 Pourquoi le ferait-on ?                                        ref #17 close-up in front of the window
    [S("hall", [A("nino", "think", pos=[4, -12], facing=0.2, symbol="?")], HEAD(4, -12, az=85, ratio=0.5))],
    # 25 On peut le voir de ses propres yeux.
    [S("hall", [A("nino", "point", pos=[4, -12], facing=3.14)], P([6, 6, -4], [6, 6, -5], [0, 6, -40], 52))],
    # 26 Mais le mois dernier, quelque chose est tombé dans l'escalier. ref #19 something falls through the atrium
    [S(SILO, [], P([1, 40, 2], [1, 14, 2], [0, -30, 0], 64), worldProps=[{"kind": "butterfly", "pos": [0, 0], "y": 30, "fall": [60, 4], "scale": 3}], noSplit=True, sfx=[sfx("whoosh", 0.3, -30)])],
    # 27 Depuis tout en haut.
    [S(SILO, [], P([0.5, 4, 2], [0.5, 3, 2], [0, 90, 0.3], 72))],
    # 28 C'est tombé directement sur ma chaussure.                     ref #20 lands on the shoe
    [S(SILO, [A("nino", "shocked", pos=E, facing=FE)], FR([E[0], 1.2, E[1]], 4.5, az=AZ_E, pitch=12, ratio=0.8), worldProps=[SIGN60, {"kind": "butterfly", "pos": [E[0] + 0.5, E[1] - 1.2], "y": 0.6, "fall": [6, 0.6], "scale": 1.6}],
       sfx=[sfx("pop", 0.5, -28)])],
    # 29 C'était vert.
    [S(SILO, [A("nino", "give", pos=E, facing=FE, emotion="shocked")], HEAD(*E, az=AZ_E, ratio=0.5), worldProps=[SIGN60, {"kind": "butterfly", "pos": [E[0], E[1] - 1.6], "y": 3.2, "scale": 1.2}])],
    # 30 Et c'était vivant.
    [S(SILO, [A("nino", "give", pos=E, facing=FE, emotion="joy")], FR([E[0], 3.4, E[1] - 1.6], 2.5, az=AZ_E, pitch=4, ratio=0.6), worldProps=[SIGN60, {"kind": "butterfly", "pos": [E[0], E[1] - 1.6], "y": 3.2, "scale": 1.2}],
       fx=["dust", "sparkles"], sfx=[sfx("sparkle", 0.2, -29)])],
    # 31 Nous n'avons pas de papillons ici.                            ref #21 the book
    [S("cozy_room", [A("nino", "think", pos=[0, 2], facing=0, prop="book")], BODY(0, 2, az=90, ratio=0.5))],
    # 32 J'ai vérifié.
    [S("cozy_room", [A("nino", "idle", pos=[0, 2], facing=0, prop="book", emotion="smug")], HEAD(0, 2, az=95, ratio=0.5))],
    # 33 Alors j'ai commencé à observer la fenêtre tous les jours.     ref #22 binoculars
    [S("hall", [A("nino", "hold_up", pos=[2, -12], facing=0.2, prop="binoculars")], HEAD(2, -12, az=90, pitch=-6, ratio=0.5))],
    # 34 Et j'ai remarqué quelque chose.                               ref #23 from behind, looking out
    [S("hall", [A("nino", "idle", pos=[2, -14], facing=3.14)], P([3, 6, -8], [3, 6, -9], [0, 8, -60], 52))],
    # 35 Ce nuage gris.
    [S("hall", [], P([3, 8, -15], [3, 8.4, -16], [14, 26, -130], 46))],
    # 36 Il revient toutes les 40 minutes.                             ref #24 the alarm clock
    [S("hall", [A("nino", "point", pos=[2, -12], facing=0.2, prop="clock", bubble="40 min", bubbleAt=0.4, bubbleSize=2.2)], BODY(2, -12, az=70, ratio=0.5), sfx=[sfx("ding", 0.5, -29)])],
    # 37 Exactement la même forme.                                     ref #25 notebook drawings
    [S("hall", [A("nino", "think", pos=[2, -12], facing=0.2, prop="book", emotion="shocked")], HEAD(2, -12, az=100, ratio=0.45))],
    # 38 Au même endroit.
    [S("hall", [], P([3, 8, -15], [3, 8.6, -16.5], [14, 22, -130], 40), fx=["punch"])],
    # 39 Alors, une nuit, j'ai pris ma lampe torche et j'ai grimpé jusqu'au sommet.   ref #26 flashlight, #27 climbing in the dark
    [S(SILO, [A("nino", "idle", pos=E, facing=FE, prop="flashlight", emotion="smug")], BODY(*E, az=AZ_E, ratio=0.5), envOpts=DARK, worldProps=[SIGN60], w=2.2,
       sfx=[sfx("pad", 0, -32, 18, PAD_EERIE)]),
     S(SILO, [A("nino", "walk", pos=stair(300)[0], float=stair(300)[1], facing=stair_dir(300), speed=0, prop="flashlight", emotion="smug")],
       FR([stair(300)[0][0], stair(300)[1] + 3.5, stair(300)[0][1]], 5, az=az_towards_center(300) + 20, pitch=4, ratio=0.6), envOpts=DARK, cut="et", w=2.0, sfx=[sfx("steps", 0.1, -31)])],
    # 40 Tout en haut, il y avait une porte avec une inscription :      ref #28 the vault corridor
    [S("vault", [A("nino", "walk", pos=[0, 2], dir=3.14, speed=0.5, prop="flashlight")], P([0, 5.5, 17], [0, 5.5, 14], [0, 4.5, -20], 52), envOpts=DARK, noSplit=True),
     S("vault", [], P([0, 8.8, -12], [0, 8.9, -13.5], [0, 9, -20], 44), envOpts=DARK, cut="ne", fx=["dust", "punch"], sfx=[sfx("boom", 0.05, -34)])],
    # 42 « Nous sommes sérieux. »
    [S("vault", [], P([2, 9.4, -15], [1.6, 9.4, -15.6], [0, 9, -20], 40), envOpts=DARK)],
    # 43 Et sous la porte, quelque chose poussait.                      ref #30 the sprout under the door
    [S("vault", [], P([3, 2.2, -13], [2.6, 2.0, -14], [0.4, 0.5, -19], 48), envOpts={"dark": True, "sprout": True})],
    # 44 Une petite plante verte.
    [S("vault", [], P([0.8, 1.8, -15.5], [0.7, 1.6, -16.2], [0.4, 0.6, -19], 44), envOpts={"dark": True, "sprout": True}, fx=["dust", "sparkles"], sfx=[sfx("sparkle", 0.1, -30)])],
    # 45 Nous n'avons pas d'herbe ici.                                  ref #31 low close-up of Eli
    [S("vault", [A("nino", "idle", pos=[0, -15], facing=0, emotion="think")], FR([0, 4.6, -15], 2.4, az=90, pitch=-20, ratio=0.6), envOpts={"dark": True, "sprout": True})],
    # 46 Nous avons seulement une affiche représentant de l'herbe.     ref #32 the poster
    [S("vault", [A("nino", "point", pos=[-3, -12], facing=-1.57)], P([0, 5, -6], [-0.5, 5, -7], [-6.6, 4.5, -14], 48), envOpts={"dark": True, "sprout": True})],
    # 47 J'ai ouvert la porte.                                          ref #33 the door opens
    [S("vault", [A("nino", "push", pos=[0, -16], facing=3.14)], P([-3, 5, -6], [-2.5, 5, -8], [0, 4.4, -20], 50), envOpts={"dark": True, "open": [0.15, 1.0]}, noSplit=True,
       sfx=[sfx("creak", 0.1, -27)])],
    # 48 De la lumière.                                                 ref #34-35 light + white flash
    [S("vault", [A("nino", "shocked", pos=[0, -16], facing=3.14)], P([0, 5, -9], [0, 5, -11], [0, 4.4, -20], 50), envOpts={"open": [0, 0]}, fx=["flash"], sfx=[sfx("riser", 0, -30)])],
    # 49 De la chaleur.
    [S("outside", [A("nino", "idle", pos=[0, -2], facing=0, emotion="shocked")], P([0, 4.5, 6], [0, 4.5, 5], [0, 4.5, -4], 50), fx=["flash"],
       sfx=[sfx("pad", 0, -31, 30, PAD_OUT), sfx("birds", 0.4, -31)])],
    # 50 Et du vert partout.                                            ref #36 green everywhere
    [S("outside", [], P([18, 14, 30], [14, 10, 24], [0, 3, 0], 56), envOpts={"rig": False}, fx=["sparkles"])],
    # 51 J'ai retenu ma respiration.                                    ref #37 holding his breath
    [S("outside", [A("nino", "idle", pos=[0, 6], facing=3.14, emotion="tired")], HEAD(0, 6, az=-90, ratio=0.55), sfx=[sfx("heartbeat", 0.1, -30)])],
    # 52 Huit…  53 Neuf…  54 Dix…  55 Onze…                              ref #38 counting, wink on eleven
    [S("outside", [A("nino", "idle", pos=[0, 6], facing=3.14, emotion="tired", symbol="txt:8")], HEAD(0, 6, az=-95, ratio=0.6))],
    [S("outside", [A("nino", "idle", pos=[0, 6], facing=3.14, emotion="tired", symbol="txt:9")], HEAD(0, 6, az=-85, ratio=0.65))],
    [S("outside", [A("nino", "idle", pos=[0, 6], facing=3.14, emotion="scared", symbol="txt:10")], HEAD(0, 6, az=-90, ratio=0.7), fx=["punch"])],
    [S("outside", [A("nino", "idle", pos=[0, 6], facing=3.14, emotion="joy", symbol="txt:11")], HEAD(0, 6, az=-90, ratio=0.75), sfx=[sfx("ding", 0.1, -28)])],
    # 56 Personne ne nous avait menti.                                  ref #39 back to the silo door
    [S("outside", [A("nino", "idle", pos=[0, 2], facing=3.14)], P([3, 5, 14], [2.5, 5, 12], [0, 5, -4], 52))],
    # 57 Ils n'avaient simplement jamais vérifié.                      ref #40 the bird nest on the door
    [S("outside", [], P([9, 10, 8], [8.4, 10, 7], [3.4, 8.8, -3.6], 40), worldProps=[{"kind": "butterfly", "pos": [3.4, -3.6], "y": 8.8, "scale": 1.0}], sfx=[sfx("birds", 0, -30)])],
    # 58 J'ai couru.                                                    ref #41 running in the meadow
    [S("outside", [A("nino", "run", pos=[0, 4], dir=0, speed=0.6, emotion="joy")], dict(BODY(0, 4, az=70, ratio=0.4), follow=True))],
    # 59 J'ai ri.
    [S("outside", [A("nino", "laugh", pos=[2, 10], emotion="joy")], HEAD(2, 10, az=85, ratio=0.5), fx=["sparkles"])],
    # 60 Je suis tombé dans l'herbe.
    [S("outside", [A("nino", "fall", pos=[2, 10], emotion="joy")], P([2, 9, 16], [2, 8, 15], [2, 0.6, 9], 52), fx=["sparkles"])],
    # 61 Puis j'ai levé les yeux.                                       ref #42 looking up
    [S("outside", [A("nino", "lie", pos=[2, 10], emotion="neutral")], P([2.5, 6.5, 12], [2.4, 6.2, 11.8], [2, 0.7, 10.4], 52), envOpts={"rig": True})],
    # 62 Le soleil avait un câble.                                      ref #42 the sun hanging on a cable
    [S("outside", [], P([0, 9, 24], [0, 9, 23], [20, 92, -120], 58, look_to=[20, 130, -120]), envOpts={"rig": True}, noSplit=True, sfx=[sfx("riser", 0.2, -31)])],
    # 63 Et le ciel avait des escaliers.
    [S("outside", [], P([0, 9, 24], [0, 10, 22], [-40, 95, -160], 62), envOpts={"rig": True})],
    # 64 Tout mon univers n'était qu'un seul étage.                     ref #43 Eli shocked under the sky
    [S("outside", [A("nino", "shocked", pos=[0, 4], emotion="shocked")], FR([0, 4.6, 4], 3, az=90, pitch=-25, ratio=0.5, fov=56), envOpts={"rig": True}, fx=["punch"])],
    # 65 Alors j'ai grimpé jusqu'à une autre porte.                     ref #44 climbing to door 2
    [S("outside", [A("nino", "walk", pos=[0, 0], dir=3.14, speed=0.6)], P([0, 3, 12], [0, 4, 9], [0, 5, -5], 52), envOpts={"rig": True}, sfx=[sfx("steps", 0, -31)])],
    # 66 Un océan.                                                      ref #45 the island
    [S("island", [], P([0, 12, 46], [0, 10, 40], [0, 3, -8], 52), sfx=[sfx("waves", 0, -30)])],
    # 67 Son ciel avait aussi des escaliers.                            ref #46 stairs in the island sky
    [S("island", [A("nino", "idle", pos=[0, 2], facing=3.14)], P([4, 3, 12], [4, 3, 11], [-20, 40, -60], 60))],
    # 68 Une autre porte.  69 Une ville.  70 Avec des escaliers.        ref #47 the rooftop at sunset
    [S("island", [A("nino", "walk", pos=[0, -2], dir=3.14, speed=0.4)], P([3, 5, 8], [2.5, 5, 6], [0, 4, -8], 50))],
    [S("rooftop", [A("nino", "idle", pos=[0, 2], facing=3.14)], P([0, 6, 16], [0, 5.5, 13], [0, 6, -20], 56), time="sunset", sfx=[sfx("wind", 0, -33)])],
    [S("rooftop", [], P([0, 4, 10], [0, 4, 9], [10, 50, -90], 60), time="sunset")],
    # 71 J'ai ouvert six portes jusqu'à présent.                        ref #48 the attic
    [S("attic", [A("nino", "idle", pos=[0, 1], facing=0, emotion="smug", symbol="txt:6")], P([0, 5, 5.2], [0, 5, 4.8], [0, 4, 0], 56), sfx=[sfx("pad", 0, -32, 22, PAD_EERIE)])],
    # 72 Mais la prochaine est différente.                              ref #49
    [S("attic", [A("nino", "idle", pos=[0, 1], facing=0, emotion="think")], P([0, 4.6, 4], [0, 4.6, 3.6], [0, 4.6, 0.6], 50))],
    # 73 Elle est petite et verrouillée.                                ref #50 arms up to the hatch
    [S("attic", [A("nino", "hold_up", pos=[0, 0.5], facing=0)], P([0, 2.2, 4.5], [0, 2.2, 4.2], [0, 6, 0], 62), sfx=[sfx("knock", 0.3, -29)])],
    # 74 De l'autre côté, j'entends quelque chose.                     ref #51 ear against the hatch
    [S("attic", [A("nino", "hold_up", pos=[0, 0.5], facing=0, emotion="think")], FR([0, 4.8, 0.5], 2.4, az=110, pitch=-20, ratio=0.6, fov=50))],
    # 75 Un téléphone.  76 Une vidéo.  77 Une voix qui ressemble à la mienne.   ref #52-54 close-ups
    [S("attic", [A("nino", "hold_up", pos=[0, 0.5], facing=0, emotion="shocked")], FR([0, 4.8, 0.5], 2.2, az=70, pitch=-10, ratio=0.6, fov=50))],
    [S("attic", [A("nino", "hold_up", pos=[0, 0.5], facing=0, emotion="shocked")], FR([0, 4.8, 0.5], 2.0, az=100, pitch=-25, ratio=0.65, fov=52))],
    [S("attic", [A("nino", "idle", pos=[0, 0.5], facing=0, emotion="scared")], FR([0, 4.7, 0.5], 1.9, az=90, pitch=-5, ratio=0.7, fov=44), fx=["dust", "punch"])],
    # 78 Dans cette ville, personne n'est jamais allé à l'extérieur.  (echo of the opening)
    [S(SILO, [], P([0.4, 40, 1.5], [0.4, 70, 1.5], [0, -60, 0], 68), noSplit=True)],
    # 79 Alors, si quelqu'un frappe sous votre plancher cette nuit…    ref #55 Eli looks at camera
    [S("attic", [A("nino", "idle", pos=[0, 0.5], facing=0, emotion="neutral")], FR([0, 4.7, 0.5], 1.9, az=90, pitch=0, ratio=0.6, fov=44), sfx=[sfx("knock", 0.6, -27)])],
    # 80 S'il vous plaît, ouvrez.                                       ref #56
    [S("attic", [A("nino", "hold_up", pos=[0, 0.5], facing=0, emotion="sad")], P([0, 2.4, 4.4], [0, 2.4, 4.1], [0, 6, 0], 62))],
    # 81 Ça fait très longtemps que je grimpe.
    [S("attic", [A("nino", "idle", pos=[0, 0.5], facing=0, emotion="tired")], FR([0, 4.7, 0.5], 1.9, az=90, pitch=4, ratio=0.55, fov=44), fadeOut=0.8)],
]

cast = json.load(open(os.path.join(os.path.dirname(__file__), "cast.json")))
out = {"cast": cast, "defaults": {"time": "day"}, "max_shot": 1.9, "sentences": sentences}
json.dump(out, open(os.path.join(os.path.dirname(__file__), "direction.json"), "w"), indent=1, ensure_ascii=False)
print(len(sentences), "sentences,", sum(len(p) for p in sentences), "shots")
