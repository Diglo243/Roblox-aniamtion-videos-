"""Shot list for « Hush » — big-head town. Uses the channel's brand cast:
Nino (narrator), Sam (best friend), Mamie Rose (grandma). Reference grammar: fast cuts (~1 s),
pastel suburb, heads that inflate, float, shrink and drop back.
python3 projects/hush/direction.py -> direction.json"""
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


def sfx(name, at=0, gain=None):
    e = {"name": name, "at": at}
    if gain is not None:
        e["gain"] = gain
    return e


POP = lambda at=0.05: sfx("pop", at, -24)
BIGHEADS = dict(n=10, area=[-10, -14, 10, 8], action=["walk", "idle", "talk"], facing=0, spread=1.2, head=[1.8, 3.2])
FLOATERS = dict(n=16, area=[-30, -60, 30, 10], action=["idle", "wave"], facing=0, spread=3, head=[3.5, 6], float=[14, 34])

sentences = [
    # 0 Dans cette ville, chaque Hush fait grossir ta tête.
    [S("street", [], P([6, 12, 30], [4, 9, 22], [0, 5, -30], 52), crowd=[dict(BIGHEADS, n=8)], sfx=[sfx("whoosh", 0, -28)]),
     S("street", [A("voisin", "talk", head=[1, 2], animAt=[0.15, 0.5], animEase="pop")], C("closeup", angle=12), cut="chaque", sfx=[POP(0.35)])],
    # 1 Hush hush hush !
    [S("street", [A("voisin", "talk", head=[2, 2.6], animAt=[0, 0.4], animEase="pop")], C("closeup", angle=-10), sfx=[POP()]),
     S("street", [A("voisin", "talk", head=[2.6, 3.2], animAt=[0, 0.4], animEase="pop")], C("medium", angle=15), w=1, sfx=[POP()]),
     S("street", [A("voisin", "shocked", head=[3.2, 4], animAt=[0, 0.4], animEase="pop")], C("low", angle=0), w=1, sfx=[POP()])],
    # 2 Vous voyez, le facteur fait Hush devant chaque maison.
    [S("house_ext", [A("facteur", "walk", dir=1.57, speed=0.6, head=2.4, prop="letter")], C("follow", side=0.8), worldProps=[{"kind": "mail_truck", "pos": [-10, 6], "facing": 1.57}]),
     S("house_ext", [A("facteur", "talk", head=[2.4, 3], animAt=[0.1, 0.4], animEase="pop", prop="letter", pos=[0, -6], facing=0.3)], C("medium", angle=-15), cut="hush", sfx=[POP(0.15)])],
    # 3 Maintenant, sa tête ne rentre même plus dans son camion postal.
    [S("street", [A("facteur", "push", head=4.2, pos=[6.5, 3], facing=3.14)], P([16, 6, 14], [14, 6, 12], [5, 5, -2], 52), worldProps=[{"kind": "mail_truck", "pos": [5, -4], "facing": 0}]),
     S("street", [A("facteur", "sad", head=4.2, pos=[6.5, 3], facing=0.6)], P([24, 10, 30], [22, 10, 27], [6.5, 6.5, 3], 46), worldProps=[{"kind": "mail_truck", "pos": [5, -4], "facing": 0}], cut="dans")],
    # 4 La tête de grand-mère est tellement énorme qu'elle a sa propre météo.
    [S("house_ext", [A("mamie_rose", "idle", head=5.5, emotion="happy")], C("low", angle=10), sfx=[sfx("whoosh", 0, -28)]),
     S("house_ext", [A("mamie_rose", "idle", head=5.5, weather=True, emotion="tired")], P([3, 12, 26], [2, 13, 23], [0, 15, 0], 50), cut="qu'elle", sfx=[sfx("wind", 0, -28)])],
    # 5 Mon meilleur ami a fait Hush une seule fois sous la douche.
    [S("shower", [A("sam", "talk", head=1)], C("medium", angle=15)),
     S("shower", [A("sam", "shocked", head=[1, 3.1], animAt=[0.05, 0.4], animEase="pop")], C("medium", angle=-10), cut="hush", sfx=[POP(0.1)])],
    # 6 Il est toujours coincé dedans.
    [S("shower", [A("sam", "cry", head=3.1)], C("wide", angle=20))],
    # 7 Mais moi, ma tête est parfaitement normale.
    [S("street", [A("nino", "walk", dir=0, emotion="happy")], C("follow", side=0.7), crowd=[dict(BIGHEADS, n=6, area=[-10, -20, 10, -6])])],
    # 8 Parce que je n'ai jamais fait Hush.
    [S("street", [A("nino", "idle", emotion="smug")], C("closeup", angle=-12))],
    # 9 Pas une seule fois.
    [S("street", [A("nino", "wave", emotion="smug")], C("low", angle=10))],
    # 10 Tout le monde se moque de moi.
    [S("street", [A("nino", "sad", pos=[0, 2])], C("wide", angle=8), crowd=[dict(n=6, area=[-8, -6, 8, -2], action=["laugh", "point"], emotion="joy", facing=0, spread=0.4, head=[2.2, 3.4])], sfx=[sfx("cheer", 0, -30)])],
    # 11 Mec, pourquoi ta tête est aussi petite ?
    [S("street", [A("sam", "laugh", pos=[2, 0], facing=-0.9, head=2.4, emotion="joy"), A("nino", "idle", pos=[-2, 0], facing=0.9)], C("ots", focus=0)),
     S("street", [A("sam", "point", pos=[2, 0], facing=-0.9, head=2.4, emotion="smug"), A("nino", "idle", pos=[-2, 0], facing=0.9)], C("two_shot", angle=-8), cut="ta")],
    # 12 Je me contente de sourire.
    [S("street", [A("nino", "idle", emotion="happy")], C("closeup", angle=8))],
    # 13 Je suis le seul qui peut encore passer les portes.
    [S("house_ext", [A("nino", "walk", pos=[0, -2.5], dir=3.14, speed=0.5, emotion="happy")], P([4, 5, 8], [3, 5, 6], [0, 4, -6], 50)),
     S("house_ext", [A("voisin", "push", pos=[0, -2.8], facing=3.14, head=3.6)], P([9, 6, 6], [8, 6, 5], [0, 6, -4], 50), cut="passer", sfx=[sfx("crack", 0.2, -29)])],
    # 14 Puis, les choses ont empiré.
    [S("street", [], P([8, 6, 22], [5, 6, 20], [0, 6, -4], 52, roll=0.2), crowd=[dict(BIGHEADS, n=10, head=[3, 4.5])], fx=["dark"], sfx=[sfx("riser", 0, -28)])],
    # 15 Quand ta tête devient trop grosse, tu te mets à flotter.
    [S("street", [A("voisin", "shocked", head=[3, 5.5], float=[0, 7], animAt=[0.2, 1])], C("wide", angle=10), sfx=[sfx("whoosh", 0.6, -27)])],
    # 16 Le maire a fait Hush en plein milieu de son discours.
    [S("town_plaza", [A("maire", "talk", pos=[0, 3], float=1.6)], C("wide", angle=0), worldProps=[{"kind": "stage", "pos": [0, 0], "label": "MAIRIE"}],
       crowd=[dict(n=12, area=[-12, 10, 12, 20], action="idle", facing=3.14, spread=0.4)]),
     S("town_plaza", [A("maire", "talk", pos=[0, 3], float=1.6)], C("medium", angle=10), worldProps=[{"kind": "stage", "pos": [0, 0], "label": "MAIRIE"}], cut="en")],
    # 17 Hush !
    [S("town_plaza", [A("maire", "shocked", pos=[0, 3], float=1.6, head=[1, 3], animAt=[0, 0.35], animEase="pop")], C("xcu"), worldProps=[{"kind": "stage", "pos": [0, 0], "label": "MAIRIE"}], sfx=[POP()])],
    # 18 Et il s'est envolé directement depuis la scène.
    [S("town_plaza", [A("maire", "wave", pos=[0, 3], head=3.2, float=[1.6, 24], animAt=[0.1, 1])], P([0, 2, 26], [0, 3, 24], [0, 14, 0], 58),
       worldProps=[{"kind": "stage", "pos": [0, 0], "label": "MAIRIE"}], crowd=[dict(n=10, area=[-12, 10, 12, 18], action="shocked", facing=3.14, spread=0.3)], sfx=[sfx("whoosh", 0.2, -25)])],
    # 19 Vendredi, la moitié de la ville flottait déjà au-dessus des maisons.
    [S("street", [], P([30, 70, 50], [26, 66, 40], [0, 14, -40], 56), crowd=[FLOATERS], sfx=[sfx("wind", 0, -29)]),
     S("street", [], P([2, 2, 14], [2, 2.4, 12], [0, 30, -20], 62), cut="au-dessus", crowd=[dict(FLOATERS, n=12, area=[-20, -40, 20, 0])])],
    # 20 Grand-mère est passée devant ma fenêtre en flottant.
    [S("window_room", [A("mamie_rose", "idle", head=5, float=3, pos=[0, 0], dir=1.57, facing=1.57, move="drift")], P([0, 7.5, 27], [0, 7.5, 26], [0, 8.5, 0], 46),
       actors_drift=True)],
    # 21 Elle m'a fait signe de la main.
    [S("window_room", [A("mamie_rose", "wave", head=5, float=3, pos=[0, 0], emotion="joy")], P([0, 8, 22], [0, 8.5, 20], [0, 10, 0], 42), sfx=[POP(0.3)])],
    # 22 Puis mon meilleur ami est passé à son tour et m'a demandé : Mec, tu trouves que j'ai la classe ?
    [S("window_room", [A("sam", "idle", head=5.2, float=3, pos=[0, 0], facing=1.57, move="drift")], P([0, 7.5, 27], [0, 7.5, 26], [0, 8.5, 0], 46), actors_drift=True),
     S("window_room", [A("sam", "talk", head=5.2, float=3, pos=[0, 0], emotion="smug")], P([0, 9, 21], [0, 9.5, 19], [0, 10.5, 0], 42), cut="mec")],
    # 23 J'ai répondu : Non, on dirait une sucette.
    [S("window_room", [A("nino", "talk", pos=[0, 18], facing=3.14), A("sam", "idle", head=5.2, float=3, pos=[0, 0])], P([3, 6, 30], [3, 6, 29], [0, 7, 10], 46)),
     S("street", [A("sam", "idle", head=5.6, float=6, emotion="shocked")], C("wide", angle=10), cut="on")],
    # 24 Sa tête a rétréci.
    [S("street", [A("sam", "shocked", head=[5.6, 1], float=6, animAt=[0.1, 0.6])], C("wide", angle=-10), sfx=[sfx("whoosh", 0.1, -26)])],
    # 25 Et il est retombé directement dans ses chaussures.
    [S("street", [A("sam", "shocked", head=1, float=[6, 0], animAt=[0, 0.35])], C("low", angle=12), fx=["shake"], sfx=[sfx("boom", 0.4, -28)])],
    # 26 C'est là que j'ai compris.
    [S("street", [A("nino", "think", symbol="idea")], C("closeup", angle=-10), sfx=[sfx("ding", 0.2, -26)])],
    # 27 Une seule chose peut faire rétrécir une grosse tête.
    [S("street", [A("nino", "point_cam")], C("medium", angle=12))],
    # 28 La vérité.
    [S("street", [A("nino", "idle", emotion="smug")], C("xcu"), fx=["punch", "flash"], sfx=[sfx("boom", 0, -29)])],
    # 29 Alors, j'ai grimpé dans le plus grand arbre de la ville.
    [S("park", [A("nino", "hold_up", pos=[0, -1.5], float=[0, 26], animAt=[0, 1])], P([4, 2, 22], [4, 8, 22], [0, 20, -4], 60), worldProps=[{"kind": "big_tree", "pos": [0, -4]}])],
    # 30 Monsieur le maire, vos discours sont ennuyeux !
    [S("park", [A("nino", "angry", pos=[0, 0], float=30, emotion="scream"), A("maire", "shocked", head=3.2, float=34, pos=[9, -4], facing=-1.2)], P([-6, 34, 16], [-5, 34, 14], [4, 34, -2], 52),
       worldProps=[{"kind": "big_tree", "pos": [0, -4]}], cut=None)],
    # 31 Il est redescendu.
    [S("park", [A("maire", "shocked", head=[3.2, 1], float=[34, 0], animAt=[0, 1])], P([10, 20, 30], [10, 10, 30], [6, 14, -4], 56), sfx=[sfx("whoosh", 0, -26)])],
    # 32 Facteur, tu as perdu mon colis deux fois !
    [S("park", [A("nino", "angry", pos=[0, 0], float=30, emotion="scream"), A("facteur", "shocked", head=4, float=33, pos=[-9, -2], facing=1.2)], P([7, 34, 15], [6, 34, 14], [-4, 34, -2], 52),
       worldProps=[{"kind": "big_tree", "pos": [0, -4]}])],
    # 33 Il est redescendu.
    [S("park", [A("facteur", "sad", head=[4, 1], float=[33, 0], animAt=[0, 1])], P([-10, 20, 30], [-10, 10, 30], [-6, 14, -4], 56), sfx=[sfx("whoosh", 0, -26)])],
    # 34 Grand-mère, tes biscuits ont le goût du sable !
    [S("park", [A("nino", "angry", pos=[0, 0], float=30, emotion="scream"), A("mamie_rose", "shocked", head=5, float=33, pos=[8, 4], facing=-1.9)], P([-6, 34, 18], [-5, 34, 16], [4, 34, 0], 52),
       worldProps=[{"kind": "big_tree", "pos": [0, -4]}])],
    # 35 Elle est redescendue tellement vite qu'elle m'en veut encore.
    [S("park", [A("mamie_rose", "shocked", head=[5, 1], float=[33, 0], animAt=[0, 0.35])], P([8, 6, 26], [8, 5, 24], [6, 8, 0], 58), fx=["shake"], sfx=[sfx("boom", 0.3, -26)]),
     S("park", [A("mamie_rose", "angry", pos=[6, 0], symbol="anger")], C("closeup", angle=-10), cut="qu'elle")],
    # 36 Un par un, tous les habitants ont retrouvé le sol.
    [S("street", [], P([0, 18, 40], [0, 14, 34], [0, 8, -20], 56), crowd=[dict(n=16, area=[-14, -40, 14, 6], action=["idle", "celebrate"], facing=0, spread=1, head=[3.5, 5], float=[10, 24], descend=True)],
       sfx=[sfx("pop", 0.6, -27), sfx("pop", 1.2, -27), sfx("pop", 1.8, -27)])],
    # 37 Ce soir-là, toute la ville m'a organisé une fête.
    [S("house_ext", [A("nino", "celebrate", pos=[0, 2])], P([2, 3, 16], [1, 3.5, 14], [0, 5, 0], 54), time="night", worldProps=[{"kind": "party", "pos": [0, -4]}], fx=["confetti"],
       crowd=[dict(n=14, area=[-12, -6, 12, 1], action=["celebrate", "dance", "jump"], facing=0, spread=1)], sfx=[sfx("cheer", 0, -25)])],
    # 38 Puis mon meilleur ami m'a dit : Mec, tu es le gars le plus cool de la ville !
    [S("house_ext", [A("sam", "talk", pos=[2, 2], facing=-0.9), A("nino", "idle", pos=[-2, 2], facing=0.9, emotion="happy")], C("two_shot", angle=10), time="night", worldProps=[{"kind": "party", "pos": [0, -4]}]),
     S("house_ext", [A("sam", "point", pos=[2, 2], facing=-0.9, emotion="joy")], C("closeup", angle=-12), time="night", worldProps=[{"kind": "party", "pos": [0, -4]}], cut="mec")],
    # 39 Et je n'ai pas pu me retenir.
    [S("house_ext", [A("nino", "idle", pos=[0, 2], emotion="smug")], C("xcu"), time="night", worldProps=[{"kind": "party", "pos": [0, -4]}], sfx=[sfx("riser", 0, -28)])],
    # 40 Hush hush hush !
    [S("house_ext", [A("nino", "shocked", pos=[0, 2], head=[1, 1.8], animAt=[0, 0.4], animEase="pop")], C("closeup", angle=10), time="night", worldProps=[{"kind": "party", "pos": [0, -4]}], sfx=[POP()]),
     S("house_ext", [A("nino", "shocked", pos=[0, 2], head=[1.8, 2.8], animAt=[0, 0.4], animEase="pop")], C("medium", angle=-10), time="night", worldProps=[{"kind": "party", "pos": [0, -4]}], w=1, sfx=[POP()]),
     S("house_ext", [A("nino", "shocked", pos=[0, 2], head=[2.8, 4.2], animAt=[0, 0.4], animEase="pop")], C("low", angle=0), time="night", worldProps=[{"kind": "party", "pos": [0, -4]}], w=1, sfx=[POP()])],
    # 41 Ma tête a jailli à travers les nuages.
    [S("cloud_sky", [A("nino", "idle", head=[5, 15], animAt=[0, 0.7], emotion="shocked")], P([0, 22, 40], [0, 22, 36], [0, 16, 0], 55), sfx=[sfx("whoosh", 0, -24), sfx("boom", 0.5, -28)])],
    # 42 Et maintenant, plus personne dans la ville n'ose me dire la vérité.
    [S("street", [], P([0, 2, 16], [0, 2.4, 14], [0, 16, -10], 60), crowd=[dict(n=10, area=[-10, -8, 10, 4], action="idle", emotion=["shocked", "scared"], facing=0, spread=0.4)]),
     S("cloud_sky", [A("nino", "idle", head=15, emotion="smug")], P([0, 26, 34], [0, 24, 30], [0, 15, 0], 55), cut="n'ose", fadeOut=0.5, sfx=[sfx("sparkle", 0.5, -28)])],
]

for plan in sentences:
    for sh in plan:
        sh.pop("actors_drift", None)
        if sh.get("cut", "x") is None:
            sh.pop("cut")
        for a in sh["actors"]:
            if a.pop("move", None) == "drift":
                a["action"] = "walk"  # drift past the window (the float keeps the feet off the ground)
                a["speed"] = 1.4
                a["dir"] = 1.57

cast = json.load(open(os.path.join(os.path.dirname(__file__), "cast.json")))
out = {"cast": cast, "defaults": {"time": "day"}, "sentences": sentences}
json.dump(out, open(os.path.join(os.path.dirname(__file__), "direction.json"), "w"), indent=1, ensure_ascii=False)
print(len(sentences), "sentences,", sum(len(p) for p in sentences), "shots")
