# 🎬 Roblox 3D TikTok Director

Pipeline automatique qui transforme **un script + une voix off + une vidéo de référence** en une
vidéo narrative 3D de style Roblox, verticale 9:16, prête pour TikTok / Shorts / Reels.

```
projects/<mon_projet>/input/
    script.txt          ← le texte de l'histoire
    voiceover.mp3       ← la voix off (mp3, wav, m4a…)  — utilisée telle quelle, jamais modifiée
    reference.mp4       ← la vidéo modèle (mp4, mov, webm…)

python3 director/run.py projects/<mon_projet>

→ projects/<mon_projet>/output/final_tiktok_video.mp4   (1080×1920, 30 fps, H.264 High + AAC 192k)
→ output/<mon_projet>/final_tiktok_video.mp4            (copie)
```

## Ce que fait le pipeline

| Étape | Fichier | Rôle |
|---|---|---|
| 1. Analyse de la référence | `director/analyze_reference.py` | durée, détection de **chaque coupe** (liste des plans, durée moyenne/médiane, coupes/min, courbe de rythme), énergie de mouvement, **détection des sous-titres jaunes** (position verticale, taille, mots par sous-titre), colorimétrie, planche-contact `work/reference/contact_sheet.jpg` |
| 2. Analyse de la voix off | `director/audio_align.py` | durée exacte, détection des pauses (VAD), **alignement mot par mot** du script sur l'audio (programmation dynamique qui cale la ponctuation sur les silences ; Whisper utilisé automatiquement si un modèle local est fourni via `WHISPER_MODEL`) |
| 3. Découpage en plans | `director/storyboard.py` | personnages (narrateur « je », prénoms, rôles : mère, prof, policier…, foules, pronoms il/elle), lieux (14 décors), jour/nuit, actions, émotions, accessoires, effets ; chaque phrase → 1 à N plans calés sur le rythme de la référence, chaque sous-plan illustre **la proposition prononcée à ce moment** ; grammaire caméra par type de moment (hook, établissement, émotion, choc, dialogue, action, suspense, fin) |
| 4. Rendu 3D | `director/engine/*.js`, `director/render.js` | moteur Three.js rendu image par image dans Chromium headless (déterministe, 30 fps exacts), en parallèle |
| 5. Montage | `director/run.py`, `director/subtitles.py` | assemblage, étalonnage, **sous-titres jaunes contour noir épais** mot par mot (animation « pop »), voix off originale, encodage TikTok |
| 6. Contrôle qualité | `director/qc.py` | 9:16, 30 fps, codecs, synchro durée vidéo = durée voix off, absence d'images noires, toutes les phrases illustrées, cohérence du casting, rythme ; planche-contact du résultat `work/qc/contact_sheet.jpg` |

### Direction artistique (moteur 3D)
* **Personnages** style R6 : têtes cubiques arrondies, corps/bras/jambes géométriques, visages
  dessinés avec 16 expressions (joie, tristesse, pleurs, colère, choc, peur, amour, sommeil…),
  clignement des yeux, bouche synchronisée quand le personnage parle, 12 coiffures, tenues
  (costume, uniforme de police, blouse de médecin…), apparence **identique dans tous les plans**.
* **35+ animations** : marche, course, pleurs, choc, colère, peur, saut, fête, danse, salut,
  pointer, réfléchir, téléphone, câlin, coup, pousser, chute, dormir, assis, travailler sur
  ordinateur, rire, regarder autour, à genoux, se faufiler, donner…
* **14 décors** : rue résidentielle, centre-ville, devant la maison, école (extérieur), parc,
  forêt, plage, salon, chambre, cuisine, salle de classe, couloir à casiers, supermarché, hôpital —
  versions jour / coucher de soleil / nuit (lampadaires, fenêtres éclairées, étoiles).
* **Caméra** : plan d'établissement en grue, plan large, plan moyen en travelling avant, gros plan,
  très gros plan, crash-zoom, contre-plongée, plongée, orbite, travelling latéral, suivi,
  champ/contre-champ par-dessus l'épaule, plan à deux, plan hollandais ; caméra « à l'épaule »
  légère ; anti-collision (la caméra ne traverse jamais un mur ni ne se fait masquer par un meuble
  ou un autre personnage).
* **Effets** : flash, zoom-punch, tremblement, lignes de vitesse, vignettage sombre/rouge, pluie,
  confettis, billets, cœurs, étincelles, symboles au-dessus des têtes (! ? 💢 💧 Zz ★).

## La bande : personnages officiels de la chaîne

`assets/brand/cast.json` définit les personnages récurrents du compte (couleurs signature violet
`#7B3FE4`, orange `#FF7A1A`, jaune `#FFD23F`) :

| Personnage | Rôle | Signature |
|---|---|---|
| **Nino** | narrateur / héros | cheveux orange en pics, sweat violet à éclair jaune, baskets orange |
| **Lila** | meilleure amie | queue de cheval noire, lunettes, haut jaune à cœur, jupe violette |
| **Mamie Rose** | grand-mère | chignon blanc, lunettes, gilet rose à boutons dorés |
| **Max** | rival | mèche blonde, blouson noir à col rouge |
| **Papa Bruno** | père | casquette et chemise à carreaux verte, barbe |
| **Maman Sofia** | mère | carré brun, haut orange |
| **Pixel** | mascotte | chat orange au collier violet et grelot doré |

Le pipeline les applique **automatiquement** à chaque nouveau projet (`director/brand.py`) : le
narrateur « je » devient Nino (le prénom du script est conservé), les mères Maman Sofia, les pères
Papa Bruno, les grands-mères Mamie Rose, les rivaux / riches / brutes Max, les amies / sœurs Lila ;
Pixel fait une apparition dans le premier et le dernier plan. Un `appearance` dans le `cast.json`
d'un projet garde la priorité ; `"brand": false` dans `style.json` désactive la bande pour un projet.
Planche de référence : `assets/brand/brand_sheet.png`, fiches verticales : `assets/brand/cards/`
(régénérées avec `director/brand_sheet.py`).

## Réalisation dirigée (projets exigeants)

Pour une histoire très spécifique, le découpage automatique peut être remplacé par une liste de
plans écrite par le réalisateur, calée automatiquement sur la voix off :

* `projects/<p>/direction.py` → génère `direction.json` : pour chaque phrase du script, une liste de
  plans (`env`, `actors`, `crowd`, `camera`, `fx`, `worldProps`, `envOpts`, `sfx`), la coupe se faisant
  sur un mot (`"cut": "mot"`) ou au prorata (`"w"`).
* `projects/<p>/style.json` → corrections du style mesuré sur la référence (police, couleur, taille,
  position et mode mot-par-mot des sous-titres ; étalonnage ; volume des effets sonores).
* Effets spéciaux d'ombre : `shadow: {action, prop, lift}` (l'ombre fait autre chose que le
  personnage), `noShadow`, `shadowFrom` (l'ombre réapparaît), foules d'ombres seules (`shadowOnly`).
* Décors « ville colorée » : `town_plaza`, `shadow_wall`, `town_street`, `hills` (ville en
  contrebas, fissures, effondrement animé), `cave_entrance`, `cave`, `cross_section` (vue en coupe
  de la ville au-dessus du vide), `construction`, `school_new`.
* Effets sonores synthétisés (`director/sfx.py` : whoosh, grondement, craquement, boum, cloche,
  caisse, alarme, moteur, vent, battements de cœur, scintillement, foule…) mixés **à bas niveau**
  sous la voix (réglable via `sfx_gain_db`).

Exemple complet : `projects/ombre/`.

## Ajuster le résultat

* `projects/<p>/cast.json` : noms, genre, rôle de chaque personnage, et optionnellement
  `"appearance"` (`skin`, `shirt`, `pants`, `shoes`, `hair: {style, color}`, `shirtDesign`,
  `sleeves`, `accessory`) pour imposer un look précis.
* `projects/<p>/work/storyboard.json` (+ `storyboard.txt` lisible) : chaque plan peut être modifié
  (décor, caméra, action, émotion, effets) puis relancé avec
  `python3 director/run.py projects/<p> --from render --keep-storyboard`
  (seuls les plans modifiés sont re-rendus).

## Installation

```
./setup.sh          # npm (three, polices), playwright/chromium, numpy/pillow/fonttools
```
Dépendances : Node ≥ 18, Python ≥ 3.10, FFmpeg avec libx264 + libass.

Blender n'est pas utilisé : sans GPU, un rendu Cycles d'une minute de vidéo 1080×1920 prendrait
des heures ; le moteur Three.js produit la même esthétique « Roblox » en quelques minutes sur CPU.
