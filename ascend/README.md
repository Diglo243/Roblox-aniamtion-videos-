# ASCEND.MIND — format « course des concepts » (YouTube Shorts / TikTok)

Vidéos de ~18 s, sans voix off et sur musique : des personnages-concepts (OBSESSION, DISCIPLINE,
MOTIVATION…) gravissent un escalier, et un seul arrive au sommet. Tout est généré : 3D, musique,
textes, filigrane.

```
python3 ascend/make.py ascend/episodes/01_who_reaches_the_top.json
→ output/ascend/01_who_reaches_the_top.mp4   (1080×1920, 30 fps, H.264 + AAC)
```

## Identité visuelle (identique dans chaque vidéo)

Elle est définie dans `ascend/brand.json`, que lisent le moteur, le kit et la musique.

| Élément | Règle |
|---|---|
| Nom / pseudo | **ASCEND.MIND** — `@Ascend.Mind` — « One step. Every day. » |
| Logo | Un « A » dont la jambe gauche est un escalier, surmonté d'un point lumineux (l'esprit) |
| Couleurs | Fond `#07080D`, or `#FFC24A`, pierre graphite, blanc cassé `#F4F1EA` |
| Personnages | **Les Minds** : corps mat d'une couleur fixe par concept, contour encre, **yeux lumineux**, emblème Λ doré sur la poitrine |
| Décor | Escaliers en pierre, **nez de marche éclairés en or**, numéros dorés, sommet gravé du logo qui s'allume avec un faisceau |
| Textes | Étiquette du concept au-dessus de la tête (Poppins 900, couleur du personnage, petit soulignement), titre d'accroche en haut avec les mots-clés en or |
| Filigrane | Emblème + `@Ascend.Mind` en bas au centre |
| Son | Musique sombre générée + **logo sonore** : trois cloches dorées montantes à l'arrivée au sommet |

### Les Minds (couleurs fixes, ne jamais les changer)

| Concept | Couleur | Signe | Rôle type |
|---|---|---|---|
| DISCIPLINE | bleu `#3FA9FF` | bandeau | lent mais constant, gagne |
| OBSESSION | rouge `#FF2E43` | — | fonce, se brûle (fissures rouges) |
| MOTIVATION | or `#FFB21E` | cape | démarre fort, s'essouffle |
| EGO | violet `#A35CFF` | couronne | trop fier, tombe |
| CONSISTENCY | vert `#22E39A` | — | une marche par jour |
| TALENT | rose `#FF5FCB` | étoile | saute des marches puis se repose |
| LAZINESS | gris `#8E94A3` | — | reste assis en bas |
| FEAR | cyan `#2FD3E0` | — | recule |
| PATIENCE | ivoire `#F2E6C9` | — | n'accélère jamais, arrive |
| DOUBT | indigo `#6C7BFF` | — | se retourne sans cesse |

## Kit de marque — `assets/ascend/`

`node ascend/kit.js` régénère tout à partir de `brand.json` (avec les mêmes personnages 3D que les vidéos).

| Fichier | Usage |
|---|---|
| `avatar.png` (1024²) | photo de profil YouTube / TikTok |
| `banner.png` (2560×1440) | bannière YouTube (logo dans la zone sûre 1546×423) |
| `logo_full.png`, `logo_mark.png` | logo horizontal et emblème seul (fond transparent) |
| `watermark.png` | filigrane transparent (pour d'autres montages) |
| `cast_sheet.png` | planche officielle des 10 Minds |
| `cards/<concept>.png` (1080×1920) | fiche verticale de chaque personnage (post communauté, story) |
| `cover.png` | modèle de miniature « A vs B » |
| `guide.png` | charte : palette, typographie, règles |

## Écrire un nouvel épisode

Copier `ascend/episodes/01_who_reaches_the_top.json` puis, pour chaque couloir (`lanes`) :

* `concept` : un nom du casting (couleur, yeux et accessoire viennent automatiquement de `brand.json`) ;
* `keys` : `[[temps, marche], …]`, la position dans le temps (0 = sol, `steps + 1` = bord du sommet), interpolée en douceur ; finir un arrêt sur une marche entière ;
* `acts` : `[[temps, pose, {options}], …]`, avec les poses `climb` (par défaut), `stand`, `kneel` (mains sur les genoux), `sit` (abandonne, se retourne et s'assoit), `collapse` (s'effondre), `crawl` (rampe), `fall` (dégringole, à combiner avec des `keys` descendantes), `lie` (allongé), `celebrate`, `look_back` ;
* `damage` : `[[t, 0..1]]`, l'usure (fissures rouges sur le corps, traces sur les marches) ;
* `fatigue` : `[[t, 0..1]]`, la posture voûtée.

Au niveau de l'épisode :
* `duration` et `steps` ;
* `summitAt` : instant où le logo du sommet s'allume, avec la lumière et le logo sonore ;
* `title` : accroche, les `*mots*` entre astérisques sont en or ;
* `outro` : phrase de fin ;
* `camera.dist` : `[[t, distance]]` ;
* `camera.focusWeights` : qui la caméra suit en priorité ;
* `crowd` : spectateurs.

### Effets et son
* `"music": false` → pas de musique, **effets sonores seuls** (`ascend/sfx.py`) : pas à chaque marche, souffle et chocs
  quand quelqu'un tombe, « pop » des bulles de texte, et au sommet un petit impact, des scintillements et le logo sonore.
  Le volume est bas : les crêtes sont réglées par `sfx_peak_db` (−9 dB par défaut, environ −26 LUFS).
* `fx` : `[{t, type, …}]`, avec les types `pop` (texte BD au-dessus d'un personnage : `lane`, `text`, `size`, `color`),
  `puff` (nuage de poussière), `burst` (étincelles dorées), `shake` (tremblement caméra, `amp`), `whoosh` (son seul).
  La poussière et le tremblement aux chutes, ainsi que les étincelles au sommet, sont ajoutés automatiquement (`"autoFx": false` pour les couper).
* La taille des personnages à l'écran se règle par `camera.dist` : plus la distance est grande, plus ils sont petits.

Pour tester rapidement avant le rendu complet :
`node ascend/render.js <episode.json> <dossier> --stills 1,6,12,16` (images fixes).
