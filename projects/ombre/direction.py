"""Shot list for « Ton ombre révèle ton avenir » — written from the reference video's grammar
(shadow-on-wall shots, colourful cobbled town, hills, cave, cut-away of the town, collapse,
evacuation, rebuilding). Run:  python3 projects/ombre/direction.py  -> direction.json
Positions are relative to each environment's stage; camera 'path' = from/to + look."""
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


def sfx(name, at=0, gain=None, dur=None):
    e = {"name": name, "at": at}
    if gain is not None:
        e["gain"] = gain
    if dur:
        e["dur"] = dur
    return e


# --- camera presets -----------------------------------------------------------------
WALL_WIDE = P([11, 4.5, 15], [10, 4.5, 13], [-6, 5.5, -5], 50)
WALL_WIDE2 = P([12, 6, 12], [11, 5.5, 11], [-6, 5, -6], 50)
WALL_CLOSE = P([7, 4, 9], [6, 4, 7.5], [-7, 6, -3.5], 50)
WALL_LOW = P([6, 1.2, 9], [5.5, 1.4, 8], [-7, 7, -4], 54)
WALL_SHADOW = P([4, 5, 7], [3.2, 5, 6], [-8, 5.5, -2.5], 48)       # mostly the shadow on the wall
HILL_TOWN = P([6, 20, 26], [5, 19, 22], [0, -70, -158], 50)
HILL_BACKS = P([0, 18, 24], [0, 18, 22], [0, -75, -158], 52)
CROSS_WIDE = P([0, -22, 160], [0, -22, 138], [0, -26, 0], 50)
CROSS_CLOSE = P([20, -8, 80], [16, -8, 70], [0, -10, 0], 48)
PLAZA_EST = P([0, 30, 40], [0, 20, 32], [0, 6, -36], 55)
PLAZA_HIGH = P([0, 40, 30], [0, 34, 26], [0, 0, -6], 55)

T = {}  # shared kwargs
CROWD_PLAZA = dict(n=16, area=[-22, -26, 22, 14], action=["walk", "idle", "talk"], facing=0, spread=3.1)

sentences = [
    # 0  Dans cette ville, ton ombre révèle ton avenir.
    [S("town_plaza", [], PLAZA_EST, crowd=[CROWD_PLAZA], sfx=[sfx("whoosh", 0, -26)]),
     S("shadow_wall", [A("hero", "idle", facing=-0.6, shadow=dict(action="wave"))], WALL_WIDE, cut="ton", sfx=[sfx("sparkle", 0.2, -28)])],
    # 1  Ce que ton ombre est en train de faire maintenant, c'est exactement ce que tu feras dans 24 heures.
    [S("shadow_wall", [A("hero", "idle", facing=-0.6, shadow=dict(action="dance"))], WALL_CLOSE),
     S("shadow_wall", [A("hero", "idle", facing=-0.5, shadow=dict(action="jump"))], WALL_LOW, cut="c'est"),
     S("shadow_wall", [A("hero", "jump", facing=-0.5, symbol="txt:24H")], WALL_WIDE2, cut="24", sfx=[sfx("ding", 0, -26)])],
    # 2  Et les gens utilisent ce pouvoir à leur avantage.
    [S("town_plaza", [A("ami", "think", pos=[3, 6], facing=0.3, symbol="idea")], P([10, 6, 24], [4, 6, 24], [0, 4, -4], 52),
       crowd=[dict(n=12, area=[-18, -20, 18, 4], action=["look_down", "think", "point", "celebrate"], facing=0, spread=2.5)])],
    # 3  Un jour, mon voisin a vu son ombre tenir un énorme chèque.
    [S("shadow_wall", [A("voisin", "walk", facing=3.14, dir=3.14, speed=0.5)], WALL_WIDE),
     S("shadow_wall", [A("voisin", "shocked", facing=-0.5, symbol="!", shadow=dict(action="celebrate", prop="check"))], WALL_CLOSE, cut="son",
       sfx=[sfx("cash", 0.3, -24)])],
    # 4  Il a immédiatement acheté un ticket de loterie.
    [S("town_plaza", [A("voisin", "give", pos=[5, -10], facing=1.2, prop="ticket")], P([17, 5, 2], [16, 5, 0], [6, 5, -12], 50),
       envOpts={"kiosk": {"pos": [10, -6], "ry": -0.4}}, sfx=[sfx("cash", 1.0, -26)])],
    # 5  Le lendemain, il est devenu millionnaire.
    [S("town_plaza", [A("voisin", "celebrate", pos=[-5, -36], prop="check")], P([-5, 3, -16], [-5, 3.5, -20], [-5, 8, -40], 52),
       crowd=[dict(n=12, area=[-15, -42, 5, -39], action=["celebrate", "jump", "wave"], facing=0, spread=0.8)],
       fx=["confetti"], sfx=[sfx("cheer", 0, -27), sfx("sparkle", 0.2, -27)])],
    # 6  À l'école, mon meilleur ami a vu son ombre pleurer devant un contrôle de maths raté.
    [S("school_new", [A("ami", "walk", dir=0, speed=0.6)], P([0, 5, 34], [0, 5, 28], [0, 8, -4], 52), crowd=[dict(n=6, area=[-20, -2, 20, 8], action="walk", dir=0)]),
     S("shadow_wall", [A("ami", "idle", facing=-0.6, shadow=dict(action="cry", prop="paper_f"))], WALL_CLOSE, cut="son", sfx=[sfx("heartbeat", 0.2, -28)])],
    # 7  Il a étudié toute la nuit et, finalement, son ombre a changé.
    [S("bedroom", [A("ami", "sit_work")], {"type": "medium", "angle": 30}, time="night"),
     S("shadow_wall", [A("ami", "happy" if False else "idle", facing=-0.6, emotion="happy", shadow=dict(action="celebrate", prop="paper_a"))], WALL_CLOSE, cut="finalement",
       sfx=[sfx("sparkle", 0.1, -26)])],
    # 8  C'est ça, le meilleur dans cette histoire.
    [S("school_new", [A("ami", "celebrate", prop="paper_a")], {"type": "low", "angle": -15}, crowd=[dict(n=5, area=[-10, -4, 10, 2], action=["wave", "celebrate"], facing=0)], fx=["sparkles"])],
    # 9  L'avenir n'est pas définitif.
    [S("shadow_wall", [A("hero", "idle", facing=-1.0, shadow=dict(action="think"))], WALL_SHADOW)],
    # 10 Tu peux le changer.
    [S("shadow_wall", [A("hero", "point", facing=-1.3, emotion="happy", shadow=dict(action="celebrate"))], WALL_LOW, sfx=[sfx("pop", 0.1, -26)])],
    # 11 Mais un matin, quelque chose d'étrange s'est produit.
    [S("town_plaza", [], P([30, 8, 40], [24, 8, 34], [0, 6, -20], 52), crowd=[dict(n=8, area=[-20, -20, 20, 10], action="walk", facing=0, spread=3)]),
     S("town_plaza", [A("hero", "look_around", symbol="?")], {"type": "dutch", "dir": 1}, cut="quelque", sfx=[sfx("riser", 0, -28)])],
    # 12 En allant à l'école, j'ai remarqué une femme debout en plein soleil…
    [S("town_street", [A("hero", "walk", dir=0, prop="bag")], {"type": "follow", "side": 0.7}),
     S("shadow_wall", [A("femme", "idle", facing=0.4, noShadow=True)], WALL_WIDE, cut="une")],
    # 13 Mais elle n'avait aucune ombre.
    [S("shadow_wall", [A("femme", "idle", facing=0.4, noShadow=True), A("hero", "shocked", pos=[-0.5, -8], facing=2.4, symbol="!")], WALL_WIDE, sfx=[sfx("heartbeat", 0, -26)])],
    # 14 Ensuite, un homme d'affaires a perdu la sienne.
    [S("town_street", [A("affaires", "walk", pos=[9.5, 0], dir=0, speed=0.5, noShadow=True)], P([4, 1.5, 14], [5, 1.5, 12], [9, 4, 0], 50, follow=True))],
    # 15 Puis, un policier.
    [S("town_plaza", [A("policier", "look_around", pos=[4, 0], noShadow=True)], {"type": "low", "angle": -20},
       worldProps=[{"kind": "police_car", "pos": [-4, -6], "facing": 0.6}], sfx=[sfx("whoosh", 0, -27)])],
    # 16 En quelques heures, presque toute la ville avait perdu son ombre.
    [S("town_plaza", [A("hero", "look_around", pos=[0, 0])], PLAZA_HIGH,
       crowd=[dict(n=26, area=[-22, -24, 22, 14], action=["idle", "walk", "look_around", "talk"], facing=0, spread=3.1, noShadow=True)])],
    # 17 Personne ne comprenait pourquoi.
    [S("town_plaza", [], {"type": "wide", "angle": 10},
       crowd=[dict(n=10, area=[-8, -6, 8, 4], action=["think", "look_around", "scared"], facing=0, spread=0.7, noShadow=True, symbols=["?"])])],
    # 18 Même les scientifiques n'avaient jamais rien vu de pareil.
    [S("town_plaza", [A("scientifique1", "think", prop="clipboard"), A("scientifique2", "look_down", prop="clipboard"), A("femme", "idle", noShadow=True)],
       {"type": "orbit", "dir": 1}, symbol=None)],
    # 19 Mais mon ombre, elle, était toujours là.
    [S("shadow_wall", [A("hero", "idle", facing=-0.6, emotion="happy")], WALL_WIDE2),
     S("shadow_wall", [A("hero", "look_down", facing=-1.0)], WALL_SHADOW, cut="était")],
    # 20 Elle me montrait debout sur une montagne, à l'extérieur de la ville, en train de regarder quelque chose avec horreur.
    [S("shadow_wall", [A("hero", "idle", facing=-0.6, shadow=dict(action="scared", lift=4.5))], WALL_CLOSE,
       worldProps=[{"kind": "shadow_mountain", "pos": [0, 0], "r": 4.5, "h": 5}], sfx=[sfx("wind", 0, -30)]),
     S("hills", [A("hero", "scared", facing=3.14)], P([4, 14, 18], [3, 13, 16], [0, -70, -158], 50), envOpts={"town": True}, cut="à"),
     S("hills", [A("hero", "scared", facing=0.3)], {"type": "closeup", "angle": 10}, cut="regarder", sfx=[sfx("heartbeat", 0, -26)])],
    # 21 Je devais faire une randonnée là-bas le lendemain.
    [S("bedroom", [A("hero", "think", prop="bag", symbol="txt:DEMAIN")], {"type": "medium", "angle": -20})],
    # 22 Mais j'ai décidé d'y aller dès aujourd'hui.
    [S("town_street", [A("hero", "run", dir=0)], {"type": "follow", "side": 0.6}, fx=["speed"], sfx=[sfx("whoosh", 0.1, -25)])],
    # 23 Une fois arrivé sur la montagne, j'ai remarqué d'immenses fissures dans le sol, tout autour de notre ville.
    [S("hills", [A("hero", "walk", dir=3.14, speed=0.4)], P([3, 5, 22], [3, 6, 18], [0, 2, -20], 52), envOpts={"town": True}),
     S("hills", [A("hero", "shocked", facing=3.14, symbol="!")], P([6, 14, 12], [5, 13, 10], [0, 0, -18], 50), envOpts={"town": True, "cracksNear": True}, cut="j'ai",
       sfx=[sfx("crack", 0.2, -24)]),
     S("hills", [A("hero", "scared", facing=3.14)], HILL_TOWN, envOpts={"town": True, "cracks": True}, cut="tout", sfx=[sfx("rumble", 0, -27)])],
    # 24 J'en ai suivi une jusqu'à une grotte souterraine.
    [S("cave_entrance", [A("hero", "walk", dir=3.14, speed=0.6)], P([3, 5, 28], [2, 5, 22], [0, 7, -6], 55))],
    # 25 Et ce que j'ai découvert m'a terrifié.
    [S("cave", [A("hero", "scared", facing=0)], {"type": "medium", "angle": 0}, sfx=[sfx("heartbeat", 0, -25)])],
    # 26 Il y avait un immense vide juste sous notre ville.
    [S("cave", [A("hero", "idle", facing=3.14, emotion="shocked")], P([0, 3, 14], [0, 6, 18], [0, 22, -90], 62), sfx=[sfx("wind", 0, -28)])],
    # 27 Toute la ville reposait sur une fine couche de roche qui était en train de se briser lentement.
    [S("cross_section", [], CROSS_WIDE, envOpts={"crack": 0.2}),
     S("cross_section", [], CROSS_CLOSE, envOpts={"crack": 0.6, "quake": True}, cut="qui", sfx=[sfx("crack", 0.3, -25), sfx("rumble", 0, -28)])],
    # 28 Soudain, tout est devenu clair.
    [S("cave", [A("hero", "shocked", facing=0, symbol="!")], {"type": "crash_zoom"}, fx=["flash", "punch"], sfx=[sfx("boom", 0, -26)])],
    # 29 Le lendemain, toute la ville allait s'effondrer.
    [S("cross_section", [], CROSS_WIDE, envOpts={"crack": 1, "quake": True, "sink": {"start": 0.35, "end": 1.0}}, fx=["shake"],
       sfx=[sfx("rumble", 0, -24), sfx("boom", 0.9, -25)])],
    # 30 Et tous ceux qui avaient perdu leur ombre ne survivraient pas.
    [S("town_plaza", [], P([0, 12, 30], [0, 10, 24], [0, 2, -10], 52), fx=["dark"],
       crowd=[dict(n=18, area=[-16, -18, 16, 8], action=["idle", "sad", "look_around"], facing=0, spread=1.5, noShadow=True)], sfx=[sfx("heartbeat", 0.3, -27)])],
    # 31 Je suis immédiatement retourné en ville et j'ai montré au maire des photos de la cavité souterraine.
    [S("town_street", [A("hero", "run", dir=0)], {"type": "low", "angle": 15}, fx=["speed"], sfx=[sfx("whoosh", 0, -25)]),
     S("town_plaza", [A("hero", "give", pos=[-2, -36], facing=0.9, prop="photo"), A("maire", "shocked", pos=[2, -36], facing=-0.9)],
       P([3, 4.5, -21], [2, 4.5, -23], [0, 4.5, -36], 46), cut="j'ai", sfx=[sfx("shutter", 0.4, -24)])],
    # 32 Il a aussitôt ordonné l'évacuation.
    [S("town_plaza", [A("maire", "point", pos=[0, -36], symbol="!")], P([3, 1.5, -27], [2, 1.7, -28], [0, 6, -36], 52), fx=["red"], sfx=[sfx("alarm", 0, -30)])],
    # 33 Les familles ont rassemblé leurs affaires.
    [S("town_street", [A("papa", "carry", pos=[-10, 0], dir=0, speed=0.3, prop="suitcase"), A("maman", "walk", pos=[-12, -2], dir=0, speed=0.3, prop="suitcase"),
                       A("enfant", "walk", pos=[-11, 2], dir=0, speed=0.3, prop="bag", scale=0.72)],
       P([-2, 5, 12], [-3, 5, 10], [-11, 3, 0], 50, follow=True), camera_focus=0)],
    # 34 Des bus ont transporté les enfants et les personnes âgées.
    [S("town_street", [], P([4, 8, 40], [4, 8, 34], [0, 3, -20], 50),
       crowd=[dict(n=12, area=[-7, -14, 7, 18], action="walk", dir=3.14, speed=0.6, kids=0.5, old=0.5)],
       worldProps=[{"kind": "bus", "pos": [-4, -10], "facing": 3.14, "move": [0, -40]}], sfx=[sfx("engine", 0, -27)])],
    # 35 Des milliers d'habitants ont abandonné leurs maisons.
    [S("town_street", [], P([0, 22, 40], [0, 20, 34], [0, 0, -40], 55),
       crowd=[dict(n=34, area=[-8, -60, 8, 20], action="walk", dir=3.14, speed=0.7, props=["suitcase", "bag", None])],
       worldProps=[{"kind": "bus", "pos": [-4, -30], "facing": 3.14, "move": [0, -30]}])],
    # 36 Et à mesure qu'ils arrivaient en lieu sûr, leurs ombres ont commencé à réapparaître.
    [S("hills", [], P([0, 4, 34], [0, 4, 30], [0, 3, 0], 52), envOpts={"town": True},
       crowd=[dict(n=14, area=[-10, -4, 10, 12], action="walk", dir=0, speed=0.5, props=["suitcase", "bag", None], noShadow=True)]),
     S("hills", [], P([8, 2.5, 14], [7, 3, 12], [-4, 1, -2], 52), envOpts={"town": True}, cut="leurs",
       crowd=[dict(n=10, area=[-8, -6, 8, 6], action=["idle", "look_down", "celebrate"], facing=0, spread=0.6, shadowFrom=0.3, shadowJitter=2.0)],
       sfx=[sfx("sparkle", 0.3, -26), sfx("sparkle", 1.4, -28)])],
    # 37 Au coucher du soleil, tout le monde avait réussi à s'échapper.
    [S("hills", [A("hero", "idle", pos=[0, 0], facing=3.14)], P([6, 6, 22], [3, 7, 20], [0, 0, -40], 52), time="sunset", envOpts={"town": True},
       crowd=[dict(n=16, area=[-14, -6, 14, 8], action=["idle", "hug", "wave"], facing=3.14, spread=0.5)])],
    # 38 Le lendemain matin, depuis la montagne, nous avons regardé notre ville entière disparaître sous terre.
    [S("hills", [], HILL_BACKS, envOpts={"town": True}, crowd=[dict(n=14, area=[-12, -4, 12, 6], action="idle", facing=3.14, spread=0.3)]),
     S("hills", [], P([10, 6, -40], [8, 4, -50], [0, -75, -158], 52), envOpts={"town": True, "sink": {"start": 0.0, "end": 1.0}}, cut="notre",
       fx=["shake"], sfx=[sfx("rumble", 0, -23), sfx("boom", 0.6, -24), sfx("crack", 1.2, -26)]),
     S("hills", [A("hero", "shocked", facing=0.2)], {"type": "closeup", "angle": -10}, envOpts={"town": True}, cut="disparaître",
       crowd=[dict(n=4, area=[-6, -4, 6, -1], action="shocked", facing=0)])],
    # 39 Nous avions perdu nos maisons, nos écoles et tout ce que nous avions construit.
    [S("hills", [], P([14, 8, -36], [12, 7, -44], [0, -75, -158], 52), envOpts={"town": True, "sink": {"from": 0.6, "to": 0.95}}, fx=["dark"]),
     S("hills", [], {"type": "high"}, envOpts={"town": True}, cut="tout",
       crowd=[dict(n=10, area=[-8, -4, 8, 6], action=["sad", "cry"], facing=0, spread=0.6)])],
    # 40 Mais nous étions toujours ensemble.
    [S("hills", [A("hero", "hug", pos=[-1.3, 0], facing=1.25, emotion="happy"), A("ami", "hug", pos=[1.3, 0], facing=-1.25, emotion="happy")],
       {"type": "two_shot", "angle": 0}, envOpts={"town": True}, close=True, fx=["hearts"],
       crowd=[dict(n=8, area=[-10, -8, 10, -3], action=["hug", "idle", "wave"], facing=0)])],
    # 41 Au cours des mois suivants, tout le monde a travaillé main dans la main pour construire une nouvelle ville sur un terrain solide.
    [S("construction", [], {"type": "establish"}, crowd=[dict(n=10, area=[-30, -14, 30, 8], action=["build", "carry", "walk"], props=["hammer", None])]),
     S("construction", [A("hero", "build", prop="hammer", facing=0.4)], P([6, 5, 12], [5, 5, 10], [0, 3.5, 0], 46), cut="main",
       crowd=[dict(n=5, area=[-8, -6, 8, 0], action=["build", "carry"], props=["hammer"])], sfx=[sfx("pop", 0.2, -28), sfx("pop", 0.7, -28), sfx("pop", 1.2, -28)]),
     S("construction", [], P([30, 10, 30], [18, 14, 34], [0, 10, -20], 55), cut="construire", crowd=[dict(n=8, area=[-24, -10, 24, 8], action=["build", "carry"])])],
    # 42 De nouvelles maisons, de nouveaux magasins et même une école encore plus grande.
    [S("town_street", [], P([0, 6, 30], [0, 7, 20], [0, 8, -60], 52), crowd=[dict(n=8, area=[-6, -40, 6, 10], action="walk", dir=0)]),
     S("town_street", [], P([-4, 4, 6], [-2, 4.5, 2], [14, 7, -14], 52), cut="magasins", crowd=[dict(n=5, area=[8, -14, 13, 4], action=["walk", "idle"], facing=-1.5)]),
     S("school_new", [], P([0, 2, 40], [0, 4, 34], [0, 22, -10], 58), envOpts={"big": True}, cut="même", sfx=[sfx("sparkle", 0, -26)])],
    # 43 Un matin, j'ai baissé les yeux vers mon ombre.
    [S("shadow_wall", [A("hero", "look_down", facing=-0.7)], WALL_CLOSE)],
    # 44 Elle me montrait entouré de gens qui célébraient l'ouverture de notre nouvelle ville.
    [S("shadow_wall", [A("hero", "idle", facing=-0.7, emotion="happy", shadow=dict(action="celebrate"))], WALL_WIDE2,
       crowd=[dict(n=6, area=[-2, -9, 3, 3], action=["celebrate", "jump", "dance"], facing=-1.57, spread=0.1, shadowOnly=True)], sfx=[sfx("cheer", 0.2, -29)]),
     S("school_new", [A("hero", "celebrate")], {"type": "low", "angle": 12}, envOpts={"big": True, "ribbon": True}, cut="l'ouverture", fx=["confetti"],
       crowd=[dict(n=14, area=[-16, -2, 16, 10], action=["celebrate", "jump", "wave", "dance"], facing=0, spread=0.8)], sfx=[sfx("cheer", 0, -25), sfx("sparkle", 0.3, -27)])],
    # 45 Pour la première fois, je n'avais pas besoin de mon ombre pour savoir que demain serait une belle journée.
    [S("town_plaza", [A("hero", "idle", emotion="happy", pos=[0, 2])], {"type": "closeup", "angle": 15},
       crowd=[dict(n=10, area=[-14, -16, 14, -4], action=["walk", "idle", "talk"], facing=0, spread=2)]),
     S("town_plaza", [A("hero", "wave", pos=[0, 2], emotion="happy")], P([0, 4, 16], [0, 30, 50], [0, 5, 0], 52, look_to=[0, 14, -40]),
       cut="savoir", time="sunset", crowd=[dict(n=14, area=[-20, -24, 20, 10], action=["walk", "idle", "wave"], facing=0, spread=3)], fadeOut=0.6,
       sfx=[sfx("sparkle", 0.5, -28)])],
]

# clean helper keys
for plan in sentences:
    for sh in plan:
        if "camera_focus" in sh:
            sh["camera"]["focus"] = sh.pop("camera_focus")
        if sh.get("symbol", "x") is None:
            sh.pop("symbol")

cast = json.load(open(os.path.join(os.path.dirname(__file__), "cast.json")))
out = {"cast": cast, "defaults": {"time": "day"}, "sentences": sentences}
json.dump(out, open(os.path.join(os.path.dirname(__file__), "direction.json"), "w"), indent=1, ensure_ascii=False)
print(len(sentences), "sentences,", sum(len(p) for p in sentences), "shots")
