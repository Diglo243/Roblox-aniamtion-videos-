"""« Hush » — shot-for-shot adaptation of the reference video (50 shots) on the French voice-over.
Each sentence lists the reference shots it covers, in the same order, with the same framing;
"w" = the reference shot duration so the inner rhythm of each sentence matches the reference.
Long shots are further cut into coverage angles (max_shot) to keep the reference's ~1 s pace.
Brand cast: Nino (narrator), Sam (best friend), Mamie Rose (grandma).
python3 projects/hush/direction.py -> direction.json"""
import json
import os

SWX = 10.5          # right sidewalk (houses behind it on the right side of the street)
FACE = -1.35        # facing the camera placed on the road


def P(frm, to, look, fov=46, look_to=None, **k):
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


def sfx(name, at=0, gain=None):
    e = {"name": name, "at": at}
    if gain is not None:
        e["gain"] = gain
    return e


import math


def FR(t, W, az=0.0, pitch=8.0, fov=46, ratio=0.6, push=0.08, look_dy=0.0):
    """Camera that frames a subject of width W (world units) at `ratio` of the 9:16 frame width.
    az: direction towards the camera in degrees (0 = towards -x, i.e. the road for the right sidewalk; 90 = towards +z)."""
    d = W / (ratio * 2 * math.tan(math.radians(fov / 2)) * 0.5625)
    a, p = math.radians(az), math.radians(pitch)
    v = [-math.cos(p) * math.cos(a), math.sin(p), math.cos(p) * math.sin(a)]
    frm = [t[i] + v[i] * d for i in range(3)]
    to = [t[i] + v[i] * d * (1 - push) for i in range(3)]
    look = [t[0], t[1] + look_dy, t[2]]
    return P([round(x, 2) for x in frm], [round(x, 2) for x in to], look, fov)


def HEAD(x, z, hs=1.0, fl=0.0, **k):
    """close-up on a head of scale hs"""
    return FR([x, hy(hs, fl), z], 1.25 * hs * 1.0 + 0.6, ratio=k.pop("ratio", 0.62), fov=k.pop("fov", 42), **k)


def BODY(x, z, hs=1.0, fl=0.0, **k):
    """full figure (body + head)"""
    h = 4.0 + 1.25 * hs
    return FR([x, fl + h * 0.5, z], max(3.4, 1.25 * hs, h * 0.5), ratio=k.pop("ratio", 0.55), **k)


def hy(hs=1.0, fl=0.0):
    return 3.95 + 0.68 * hs + fl


def MED(z, h=1.0, fl=0.0, dist=7.0, side=1):
    y = hy(h, fl) - 0.6
    return P([SWX - dist, y, z + side * 3.2], [SWX - dist + 1.0, y, z + side * 2.7], [SWX, y - 0.2, z], 46)


def CU(z, h=1.0, fl=0.0, dist=3.6, low=0.0, side=1):
    y = hy(h, fl)
    d = dist * max(1.0, h * 0.85)
    return P([SWX - d, y + 0.2 - low, z + side * d * 0.35], [SWX - d * 0.9, y + 0.2 - low, z + side * d * 0.3], [SWX, y - 0.1, z], 42)


POP = lambda at=0.05: sfx("pop", at, -24)
FLOAT_FAR = dict(n=10, area=[-24, -110, 24, -40], action=["idle", "wave"], facing=0, spread=3, head=[3.5, 5.5], float=[14, 30])
SUB = "suburb"
NIGHT = dict(time="night")
NE = {"partyHouse": True, "noCars": True}

sentences = [
    # 0 Dans cette ville, chaque Hush fait grossir ta tête.           ref #0 aerial crane down to the two neighbours
    [S(SUB, [A("voisin", "talk", pos=[SWX + 0.8, -1], facing=-2.0), A("nino", "idle", pos=[SWX - 1.0, 2.0], facing=-0.9)],
       P([4, 46, 50], [3.5, 5.5, 15], [0, 0, -40], 55, look_to=[SWX, 3.6, 0]), crowd=[FLOAT_FAR], noSplit=True, sfx=[sfx("whoosh", 0, -27)])],
    # 1 Hush hush hush !                                                ref #1 low close-up, head inflates on each hush
    [S(SUB, [A("voisin", "shocked", pos=[SWX, 0], facing=FACE, head=[1.2, 1.9], animAt=[0, 0.4], animEase="pop")], HEAD(SWX, 0, 1.9, pitch=-12), sfx=[POP()]),
     S(SUB, [A("voisin", "shocked", pos=[SWX, 0], facing=FACE, head=[1.9, 2.6], animAt=[0, 0.4], animEase="pop")], HEAD(SWX, 0, 2.6, az=25, pitch=-8), sfx=[POP()]),
     S(SUB, [A("voisin", "shocked", pos=[SWX, 0], facing=FACE, head=[2.6, 3.3], animAt=[0, 0.4], animEase="pop")], HEAD(SWX, 0, 3.3, az=-20, pitch=-16), sfx=[POP()])],
    # 2 Vous voyez, le facteur fait Hush devant chaque maison.         ref #2 mailman medium -> push-in close-up
    [S(SUB, [A("facteur", "talk", pos=[SWX, 36], facing=FACE, head=2.3, prop="satchel")], BODY(SWX, 36, 2.3, az=15, push=0.15), w=1.0),
     S(SUB, [A("facteur", "talk", pos=[SWX, 36], facing=FACE, head=[2.3, 2.8], animAt=[0.1, 0.4], animEase="pop", emotion="smug", prop="satchel")],
       HEAD(SWX, 36, 2.8, az=10), cut="hush", sfx=[POP(0.1)])],
    # 3 Maintenant, sa tête ne rentre même plus dans son camion postal. ref #3 from behind, at the mail truck
    [S(SUB, [A("facteur", "push", pos=[7.2, 22], facing=3.14, head=4.4, prop="satchel")], FR([6.0, 5.5, 18], 9, az=-120, pitch=10, fov=50),
       worldProps=[{"kind": "mail_truck", "pos": [4.2, 14], "facing": 0}])],
    # 4 La tête de grand-mère est tellement énorme qu'elle a sa propre météo.   ref #4 full shot, ref #5 top of head + rain cloud
    [S(SUB, [A("mamie_rose", "idle", pos=[SWX, 53], facing=FACE, head=5.2, emotion="happy")], BODY(SWX, 53, 5.2, az=25, pitch=4, ratio=0.62), w=1.3),
     S(SUB, [A("mamie_rose", "idle", pos=[SWX, 53], facing=FACE, head=5.2, weather=True, emotion="tired")], FR([SWX, hy(5.2) + 4.0, 53], 9.5, az=15, pitch=10, ratio=0.85, fov=46),
       cut="qu'elle", w=0.8, sfx=[sfx("wind", 0, -28)])],
    # 5 Mon meilleur ami a fait Hush une seule fois sous la douche.    ref #6 wide frontal shower
    [S("shower", [A("sam", "talk", head=1.0)], FR([0, 4.4, 0], 6.2, az=90, pitch=4, fov=46, ratio=0.9)),
     S("shower", [A("sam", "sad", head=[1.0, 3.2], animAt=[0.05, 0.35], animEase="pop")], FR([0, 5.6, 0], 7.0, az=90, pitch=4, fov=46, ratio=0.9), cut="hush", sfx=[POP(0.1)])],
    # 6 Il est toujours coincé dedans.                                  ref #7 close-up crying
    [S("shower", [A("sam", "cry", head=3.2)], FR([0, hy(3.2) + 0.4, 0], 5.6, az=90, pitch=2, fov=42, ratio=0.8))],
    # 7 Mais moi, ma tête est parfaitement normale.                     ref #8 wide walking, ref #9 tracking medium
    [S(SUB, [A("nino", "walk", pos=[SWX, -6], dir=3.14, speed=0.5)], dict(BODY(SWX, -6, az=-35, pitch=6, ratio=0.3), follow=True), w=0.46),
     S(SUB, [A("nino", "walk", pos=[SWX, -2], dir=3.14, speed=0.45, emotion="happy")], dict(BODY(SWX, -2, az=-40, pitch=4, ratio=0.6), follow=True), cut="ma", w=1.24)],
    # 8 Parce que je n'ai jamais fait Hush.                             ref #10 walking towards camera 3/4
    [S(SUB, [A("nino", "walk", pos=[SWX, 2], dir=-2.6, speed=0.35, emotion="smug")], dict(BODY(SWX, 2, az=-30, pitch=5, ratio=0.5), follow=True))],
    # 9 Pas une seule fois.                                             ref #11 close-up smug, neighbour behind
    [S(SUB, [A("nino", "idle", pos=[SWX, 0], facing=FACE, emotion="smug"), A("voisin", "idle", pos=[SWX + 2.5, -3], facing=FACE, head=2.4)], HEAD(SWX, 0, 1, az=15, ratio=0.45))],
    # 10 Tout le monde se moque de moi.                                 ref #12 over-the-shoulder on laughing big heads
    [S(SUB, [A("nino", "idle", pos=[SWX - 1.5, 4], facing=2.6), A("facteur", "laugh", pos=[SWX - 2, -2], facing=0.4, head=2.6, emotion="joy"),
             A("voisin", "laugh", pos=[SWX + 1.4, -2.6], facing=0.2, head=2.8, emotion="joy"), A("jaune", "point", pos=[SWX - 5, -2.8], facing=0.6, head=2.4, emotion="joy")],
       P([SWX - 0.4, 5.6, 10.5], [SWX - 0.5, 5.6, 10.0], [SWX - 2, 6.2, -2], 48), sfx=[sfx("cheer", 0, -30)])],
    # 11 Mec, pourquoi ta tête est aussi petite ?                       ref #13 close-up laughing mailman
    [S(SUB, [A("facteur", "laugh", pos=[SWX, 0], facing=FACE, head=2.6, emotion="joy", prop="satchel")], HEAD(SWX, 0, 2.6, az=-15))],
    # 12 Je me contente de sourire.                                     ref #14 close-up smile
    [S(SUB, [A("nino", "idle", pos=[SWX, 0], facing=FACE, emotion="happy")], HEAD(SWX, 0, 1, az=10))],
    # 13 Je suis le seul qui peut encore passer les portes.             ref #15 bakery wide, ref #16 big head stuck in the door
    [S(SUB, [A("nino", "walk", pos=[-11.5, 19], dir=-1.57, speed=0.5)], FR([-14, 5, 19], 14, az=150, pitch=6, fov=48, ratio=0.9), envOpts={"bakery": True}, w=1.08),
     S(SUB, [A("jaune", "push", pos=[-13.6, 19], facing=-1.57, head=3.4), A("nino", "idle", pos=[-9.8, 21.5], facing=-2.4)], FR([-13.6, hy(3.4) - 0.5, 19], 6, az=145, pitch=4, fov=44, ratio=0.8),
       envOpts={"bakery": True}, cut="passer", w=0.67, sfx=[sfx("crack", 0.1, -30)])],
    # 14 Puis, les choses ont empiré.                                   ref #17 old man with a big head, low angle
    [S(SUB, [A("vieux", "idle", pos=[SWX, 36], facing=FACE, head=3.0, prop="cane", emotion="tired")], BODY(SWX, 36, 3.0, az=20, pitch=-6, ratio=0.6), sfx=[sfx("riser", 0, -29)])],
    # 15 Quand ta tête devient trop grosse, tu te mets à flotter.       ref #18 the head swells, then he floats away
    [S(SUB, [A("vieux", "shocked", pos=[SWX, 36], facing=FACE, head=[3.0, 4.6], animAt=[0, 0.5], prop="cane")], HEAD(SWX, 36, 4.6, az=0, ratio=0.75), w=0.8),
     S(SUB, [A("vieux", "shocked", pos=[SWX, 36], facing=FACE, head=4.6, float=[0, 9], animAt=[0, 1], prop="cane")], FR([SWX, 11, 36], 12, az=35, pitch=-12, fov=52, ratio=0.7), cut="tu", w=1.6,
       sfx=[sfx("whoosh", 0.2, -27)])],
    # 16 Le maire a fait Hush en plein milieu de son discours.          ref #19 stage seen over the crowd, ref #20 medium speech
    [S(SUB, [A("maire", "talk", pos=[0, -40], float=1.6)], P([2, 12, -12], [2, 12.5, -14], [0, 5, -40], 48), worldProps=[{"kind": "stage", "pos": [0, -43], "label": "MAIRIE"}],
       crowd=[dict(n=12, area=[-6, -30, 6, -20], action="idle", facing=3.14, spread=0.4, head=[1.4, 2.4])], w=1.0),
     S(SUB, [A("maire", "talk", pos=[0, -40], float=1.6)], BODY(0, -40, 1.0, 1.6, az=95, pitch=2, ratio=0.5), worldProps=[{"kind": "stage", "pos": [0, -43], "label": "MAIRIE"}], cut="en", w=0.5)],
    # 17 Hush !                                                          ref #21 close-up, head swells
    [S(SUB, [A("maire", "shocked", pos=[0, -40], float=1.6, head=[1.0, 2.4], animAt=[0, 0.4], animEase="pop", emotion="smug")], HEAD(0, -40, 2.4, 1.6, az=92, pitch=-4),
       worldProps=[{"kind": "stage", "pos": [0, -43], "label": "MAIRIE"}], sfx=[POP()])],
    # 18 Et il s'est envolé directement depuis la scène.                ref #22 floats up above the stage
    [S(SUB, [A("maire", "wave", pos=[0, -40], head=2.6, float=[1.6, 22], animAt=[0.05, 1], emotion="joy")], P([3, 2.5, -20], [3, 3, -21], [0, 9, -40], 58, look_to=[0, 21, -40]),
       worldProps=[{"kind": "stage", "pos": [0, -43], "label": "MAIRIE"}], noSplit=True, sfx=[sfx("whoosh", 0.1, -25)])],
    # 19 Vendredi, la moitié de la ville flottait déjà au-dessus des maisons.   ref #23 aerial over rooftops, ref #24 street level looking up
    [S(SUB, [], P([30, 34, 30], [27, 33, 24], [10, 18, -20], 55), crowd=[dict(n=16, area=[-20, -40, 30, 20], action=["idle", "wave"], facing=0, spread=3, head=[3.5, 5.5], float=[20, 34])],
       w=1.36, sfx=[sfx("wind", 0, -29)]),
     S(SUB, [], P([-3, 2.4, 20], [-3, 2.6, 18], [8, 16, -10], 58), crowd=[dict(n=14, area=[-14, -40, 20, 0], action=["idle", "wave"], facing=0, spread=3, head=[3.5, 5.5], float=[16, 30])],
       cut="au-dessus", w=1.0)],
    # 20 Grand-mère est passée devant ma fenêtre en flottant.          ref #25 at the window, grandma drifts past outside
    [S("window_room", [A("nino", "idle", pos=[4, 13], facing=3.4), A("mamie_rose", "walk", head=4.6, float=3, pos=[0, -2], dir=1.57, speed=1.2, facing=1.57)],
       P([-4, 7.5, 27], [-3.5, 7.5, 26.5], [1, 7.5, 0], 50), noSplit=True)],
    # 21 Elle m'a fait signe de la main.                                ref #26 through the window, she waves
    [S("window_room", [A("mamie_rose", "wave", head=4.6, float=3, pos=[0, 0], emotion="joy")], P([0, 9.5, 20], [0, 9.7, 19], [0, 10, 0], 42), sfx=[POP(0.3)])],
    # 22 Puis mon meilleur ami est passé à son tour et m'a demandé : Mec, tu trouves que j'ai la classe ?   ref #27 floating over the street, ref #28 big close-up
    [S(SUB, [A("sam", "idle", pos=[SWX - 2, -4], head=4.6, float=7, facing=FACE), A("nino", "idle", pos=[SWX - 1, 4], facing=2.6)], FR([SWX - 2, 12, -4], 14, az=-70, pitch=-18, fov=52, ratio=0.8),
       crowd=[dict(FLOAT_FAR, n=6, area=[-10, -60, 20, -20])], w=1.5),
     S(SUB, [A("sam", "talk", pos=[SWX - 2, -4], head=4.6, float=7, facing=FACE, emotion="smug"), A("nino", "idle", pos=[SWX - 1.6, 4.5], facing=2.7)],
       FR([SWX - 2, hy(4.6, 7), -4], 8.5, az=-85, pitch=-10, fov=46, ratio=0.8), cut="mec", w=0.8)],
    # 23 J'ai répondu : Non, on dirait une sucette.                     ref #29 close-up "no", ref #30 the lollipop over its shoes
    [S(SUB, [A("nino", "talk", pos=[SWX, 0], facing=FACE, emotion="smug")], HEAD(SWX, 0, 1, az=-10), w=0.9),
     S(SUB, [A("sam", "idle", pos=[SWX, -6], head=5.0, float=6, facing=FACE, emotion="shocked"), A("nino", "idle", pos=[SWX + 2.6, 1.5], facing=-2.4)],
       FR([SWX, 8, -6], 13, az=10, pitch=2, fov=52, ratio=0.8), cut="on", w=1.0)],
    # 24 Sa tête a rétréci.                                             ref #31 same framing, the head shrinks
    [S(SUB, [A("sam", "shocked", pos=[SWX, -6], head=[5.0, 1.0], float=6, animAt=[0.05, 0.6], facing=FACE)], FR([SWX, 7.5, -6], 13, az=10, pitch=2, fov=52, ratio=0.8), noSplit=True,
       sfx=[sfx("whoosh", 0.05, -26)])],
    # 25 Et il est retombé directement dans ses chaussures.             ref #32 low near the ground, drops into the shoes
    [S(SUB, [A("sam", "shocked", pos=[SWX, -6], head=1.0, float=[6, 0], animAt=[0, 0.3], facing=FACE)], FR([SWX, 3.0, -6], 7, az=20, pitch=-2, fov=54, ratio=0.7),
       fx=["shake"], sfx=[sfx("boom", 0.3, -29)])],
    # 26 C'est là que j'ai compris.                                     ref #33 close-up (part 1)
    [S(SUB, [A("nino", "think", pos=[SWX, 0], facing=FACE, symbol="idea")], HEAD(SWX, 0, 1, az=12, ratio=0.5), sfx=[sfx("ding", 0.2, -26)])],
    # 27 Une seule chose peut faire rétrécir une grosse tête.           ref #33 (part 2)
    [S(SUB, [A("nino", "point_cam", pos=[SWX, 0], facing=FACE)], BODY(SWX, 0, 1, az=-15, ratio=0.6))],
    # 28 La vérité.                                                     ref #33 (end)
    [S(SUB, [A("nino", "idle", pos=[SWX, 0], facing=FACE, emotion="smug")], HEAD(SWX, 0, 1, az=0, ratio=0.75), fx=["punch"], sfx=[sfx("boom", 0, -30)])],
    # 29 Alors, j'ai grimpé dans le plus grand arbre de la ville.       ref #34 climbing seen from below, ref #35 the tallest tree
    [S(SUB, [A("nino", "hold_up", pos=[9.4, 27], facing=1.57, float=[0, 14], animAt=[0, 1])], P([3.5, 1.2, 33], [3.6, 1.4, 32.5], [9.6, 14, 27], 58),
       worldProps=[{"kind": "big_tree", "pos": [12, 27]}], w=0.6),
     S(SUB, [], P([-10, 3, 66], [-10, 4, 64], [12, 30, 27], 56), worldProps=[{"kind": "big_tree", "pos": [12, 27]}], cut="le",
       crowd=[dict(n=4, area=[0, 10, 24, 30], action="idle", facing=0, spread=3, head=[4, 5], float=[34, 44])], w=1.1)],
    # 30 Monsieur le maire, vos discours sont ennuyeux !                ref #36 over the shoulder from the tree top, town below
    [S(SUB, [A("nino", "angry", pos=[9.4, 27], facing=-0.8, float=22, emotion="scream"), A("maire", "shocked", pos=[1, 18], head=2.8, float=23, facing=0.9)],
       P([6.5, 28.5, 31], [6.4, 28.6, 30.6], [1, 27, 18], 48), worldProps=[{"kind": "big_tree", "pos": [12, 27]}])],
    # 31 Il est redescendu.                                             ref #37 top-down, he drops to the street
    [S(SUB, [A("maire", "shocked", pos=[1, 18], head=[2.8, 1.0], float=[23, 0], animAt=[0, 1])], P([3, 70, 26], [3, 66, 25], [1, 0, 18], 50), noSplit=True, sfx=[sfx("whoosh", 0, -26)])],
    # 32 Facteur, tu as perdu mon colis deux fois !                     ref #38 OTS on the floating mailman, ref #39 close-up "twice"
    [S(SUB, [A("nino", "angry", pos=[9.4, 27], facing=-1.8, float=22, emotion="scream"), A("facteur", "sad", pos=[0, 32], head=3.2, float=23, facing=1.8, prop="satchel")],
       P([6, 28.5, 23.5], [6.1, 28.6, 23.8], [0, 27, 32], 48), worldProps=[{"kind": "big_tree", "pos": [12, 27]}], w=1.6),
     S(SUB, [A("nino", "angry", pos=[9.4, 27], facing=-1.4, float=22, emotion="smug")], HEAD(9.4, 27, 1, 22, az=-10), worldProps=[{"kind": "big_tree", "pos": [12, 27]}], cut="deux", w=0.4)],
    # 33 Il est redescendu.                                             ref #40 aerial, he drops
    [S(SUB, [A("facteur", "sad", pos=[0, 32], head=[3.2, 1.0], float=[23, 0], animAt=[0, 1], prop="satchel")], P([-6, 66, 40], [-6, 62, 39], [0, 0, 32], 50), noSplit=True, sfx=[sfx("whoosh", 0, -26)])],
    # 34 Grand-mère, tes biscuits ont le goût du sable !                ref #41 OTS on floating grandma
    [S(SUB, [A("nino", "angry", pos=[9.4, 27], facing=-0.4, float=22, emotion="scream"), A("mamie_rose", "sad", pos=[5, 14], head=4.2, float=21, facing=0.4)],
       P([6.4, 28.5, 32], [6.5, 28.6, 31.6], [5, 28, 14], 48), worldProps=[{"kind": "big_tree", "pos": [12, 27]}])],
    # 35 Elle est redescendue tellement vite qu'elle m'en veut encore.  ref #42 lands fast in a cloud of dust, ref #43 angry
    [S(SUB, [A("mamie_rose", "shocked", pos=[SWX, 53], head=[4.2, 1.0], float=[22, 0], animAt=[0, 0.3], facing=FACE)], BODY(SWX, 53, 1, az=25, pitch=4, ratio=0.35),
       fx=["shake"], w=1.1, noSplit=True, sfx=[sfx("boom", 0.25, -26)]),
     S(SUB, [A("mamie_rose", "angry", pos=[SWX, 53], facing=FACE, symbol="anger")], BODY(SWX, 53, 1, az=10, pitch=-8, ratio=0.6), cut="qu'elle", w=0.8)],
    # 36 Un par un, tous les habitants ont retrouvé le sol.             ref #44 aerial street, ref #45 rooftops
    [S(SUB, [], P([0, 40, 40], [0, 36, 34], [0, 0, -30], 56), crowd=[dict(n=16, area=[-12, -50, 12, 10], action=["idle", "celebrate"], facing=0, spread=1, head=[3.5, 5], float=[10, 26], descend=True)],
       w=1.2, noSplit=True, sfx=[sfx("pop", 0.6, -27), sfx("pop", 1.2, -27)]),
     S(SUB, [], P([18, 22, 44], [16, 21, 42], [0, 2, 0], 52), crowd=[dict(n=12, area=[-8, -20, 12, 20], action=["idle", "celebrate"], facing=0, spread=1.5)], cut="ont", w=0.8)],
    # 37 Ce soir-là, toute la ville m'a organisé une fête.              ref #46 night, party house, crowd
    [S(SUB, [A("nino", "celebrate", pos=[-7, -4], facing=1.4)], P([6, 5.5, 8], [5, 5.5, 7], [-14, 6, -6], 52), envOpts=NE, worldProps=[{"kind": "party", "pos": [-12, -6]}],
       crowd=[dict(n=12, area=[-13, -14, -8, 2], action=["celebrate", "dance", "jump"], facing=1.4, spread=1)], fx=["confetti"], sfx=[sfx("cheer", 0, -26)], **NIGHT)],
    # 38 Puis mon meilleur ami m'a dit : Mec, tu es le gars le plus cool de la ville !   ref #47 (part 1) close-up laughing
    [S(SUB, [A("sam", "talk", pos=[-8, -2], facing=1.9), A("nino", "idle", pos=[-5, -4], facing=1.6, emotion="happy")], FR([-6.5, 4, -3], 7, az=175, pitch=4, ratio=0.85),
       envOpts=NE, worldProps=[{"kind": "party", "pos": [-12, -6]}], w=1.0, **NIGHT),
     S(SUB, [A("sam", "laugh", pos=[-8, -2], facing=1.6, emotion="joy")], HEAD(-8, -2, 1, az=168), envOpts=NE, worldProps=[{"kind": "party", "pos": [-12, -6]}],
       cut="mec", w=1.4, **NIGHT)],
    # 39 Et je n'ai pas pu me retenir.                                  hero close-up
    [S(SUB, [A("nino", "idle", pos=[-5, -4], facing=1.6, emotion="smug")], HEAD(-5, -4, 1, az=190), envOpts=NE, sfx=[sfx("riser", 0, -28)], **NIGHT)],
    # 40 Hush hush hush !
    [S(SUB, [A("nino", "shocked", pos=[-5, -4], facing=1.6, head=[1, 1.8], animAt=[0, 0.4], animEase="pop")], HEAD(-5, -4, 1.8, az=180), envOpts=NE, sfx=[POP()], **NIGHT),
     S(SUB, [A("nino", "shocked", pos=[-5, -4], facing=1.6, head=[1.8, 2.8], animAt=[0, 0.4], animEase="pop")], HEAD(-5, -4, 2.8, az=205, pitch=-6), envOpts=NE, w=1, sfx=[POP()], **NIGHT),
     S(SUB, [A("nino", "shocked", pos=[-5, -4], facing=1.6, head=[2.8, 4.2], animAt=[0, 0.4], animEase="pop")], HEAD(-5, -4, 4.2, az=160, pitch=-12), envOpts=NE, w=1, sfx=[POP()], **NIGHT)],
    # 41 Ma tête a jailli à travers les nuages.                         ref #47 (part 2) the head pops above the clouds at night
    [S("cloud_sky", [A("nino", "idle", head=[5, 14], animAt=[0, 0.6], emotion="shocked")], P([0, 22, 46], [0, 22, 42], [0, 16, 0], 55), noSplit=True, sfx=[sfx("whoosh", 0, -24), sfx("boom", 0.5, -29)], **NIGHT)],
    # 42 Et maintenant, plus personne dans la ville n'ose me dire la vérité.   ref #48 crowd looking up, ref #49 the head in the night sky
    [S(SUB, [], P([-6, 34, 3], [-6, 32, 2], [-6, 0, -4], 46), envOpts=NE, crowd=[dict(n=12, area=[-11, -9, -1, 1], action="idle", emotion=["shocked", "scared"], facing=0.2, spread=0.5)],
       w=1.0, **NIGHT),
     S("cloud_sky", [A("nino", "idle", head=14, emotion="smug")], P([0, 28, 60], [0, 26, 52], [0, 15, 0], 55), cut="n'ose", fadeOut=0.5, w=1.0, sfx=[sfx("sparkle", 0.5, -28)], **NIGHT)],
]

cast = json.load(open(os.path.join(os.path.dirname(__file__), "cast.json")))
out = {"cast": cast, "defaults": {"time": "day"}, "max_shot": 1.25, "sentences": sentences}
json.dump(out, open(os.path.join(os.path.dirname(__file__), "direction.json"), "w"), indent=1, ensure_ascii=False)
print(len(sentences), "sentences,", sum(len(p) for p in sentences), "shots")
