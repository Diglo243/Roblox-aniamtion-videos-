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
