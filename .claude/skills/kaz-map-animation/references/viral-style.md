# Style « millions de vues » : fiche de montage de référence

Tiré de l'analyse de 3 Shorts de cartes viraux fournis par le propriétaire
(élections américaines, pont Afrique–Amérique du Sud, Bermudes). **À lire avant chaque nouvelle vidéo**,
en plus de `style-guide.md`. En cas de conflit, cette fiche l'emporte.

## Mesures des références
| | durée | format | volume | coupes franches | musique |
|---|---|---|---|---|---|
| Élections USA | 114 s | 9:16 | -14,8 LUFS | 0 | lit musical continu |
| Pont Afrique–Am. du Sud | 79 s | 9:16 | -15,1 LUFS | 1 | continue, aucun silence |
| Bermudes | 92 s | 9:16 | -14,2 LUFS | 12 | continue |

À retenir : **80–115 s**, **environ -14 LUFS**, **musique de fond douce et continue sous la voix**, et presque **aucune coupe** :
la caméra **vole** d'un endroit à l'autre au lieu de couper.

## 1. Accroche (0–3 s) : la question est à l'écran dès la 1ʳᵉ image
- Première phrase = une **question ou un fait impossible** : « Pourquoi 60 000 personnes vivent ici ? »,
  « Et si on construisait un pont entre l'Afrique et l'Amérique du Sud ? », « Le 3 novembre… ».
- Dès la 1ʳᵉ image : un **gros élément visuel** qui donne l'idée, par exemple :
  - un **titre géant** en serif blanc avec un chiffre en jaune (« NOVEMBER **3** ») ;
  - des **noms de continents en 3D** couchés sur la carte (AFRIQUE, AMÉRIQUE DU SUD) ;
  - un **objet** posé sur la carte (un pont, des personnes avec « 60 000 »).
- La caméra bouge **dès la 1ʳᵉ image** (zoom lent ou travelling), jamais d'image fixe.
- Un mot fort entouré d'un **cercle jaune dessiné à la main** et d'une flèche (« cauchemar géographique »).

## 2. Sous-titres : 1 à 3 mots à la fois, au rythme de la voix
- Petits, blancs, police sans empattement, **centrés au milieu-bas** (environ 70 % de la hauteur), **1 à 3 mots
  maximum**, qui changent mot par mot avec la voix (« Pourquoi 60 000 » → « personnes vivent ici ? »).
- Mot-clé en **jaune** (« l'île des *diables* », « climat *doux* »).
- Générer avec `scripts/captions.py` (alignement mot par mot → overlays de sous-titres).

## 3. Caméra : des vols, pas des coupes
- Enchaîner les plans par des **mouvements continus** (dézoom vers le monde → zoom vers le lieu suivant)
  au lieu de coupes franches. Une coupe franche seulement pour changer de « monde » (carte ↔ infographie).
- Vue « globe » légèrement **assombrie** avec vignette, le sujet **éclairé** (halo/glow bleu ou doré).
- Changement visible toutes les **1,5 à 3 s** : zoom, nouvel élément, chiffre, flèche, icône.

## 4. Habillage graphique
- **Gros chiffres jaunes** avec une petite légende dessous (« **142 855 $** par habitant et par an »,
  « **3 000 km** », « **3 646 mètres** », « **435** / **100** »).
- **Étiquettes « pilule »** turquoise ou jaunes, légèrement inclinées, qui suivent l'objet
  (« Un immense pont », « Irréaliste », « la route des ouragans »).
- **Annotations manuscrites** blanches + flèches courbes (« Congressmen », « every 2 years », « 6 years »).
- **Icônes illustrées et colorées**, presque 3D (navires, ouragans qui tournent, coffre au trésor, Capitole,
  immeubles, livre et plume, gouttes d'eau barrées). Les faire **apparaître avec un rebond** et parfois
  **bouger** : ouragans qui tournent, bateaux qui naviguent, avions.
- **Cartes-photos** (portraits, lieux) avec bordure blanche, inclinées, qui glissent dans le cadre.
- **Trajets en pointillés** animés (routes maritimes, Gulf Stream, câbles), **flèches épaisses** blanches
  qui pointent un lieu.
- **Ambiance** quand le récit s'y prête : pluie, tempête, éclairs, pièces d'or qui tombent.
- **Infographies « blueprint »** (fond bleu quadrillé) pour expliquer une structure : organigrammes,
  bonshommes en grille, hémicycles, chiffres.
- **Zone mise en évidence** par un rectangle ou un polygone coloré avec chiffre dedans (Wyoming : **1**).

## 5. Milieu de vidéo (40–65 %) : relance + appel à s'abonner
- Une **boucle ouverte** : « Mais il y a un problème… », « Et c'est là que tout bascule ».
- Un **appel à s'abonner intégré** à l'histoire, vers 65–70 % : écran sombre, « **NE BOUGE PAS…** »
  avec un bouton rouge **S'abonner** cliqué par un curseur, puis on revient tout de suite au récit.
- Changement de style visuel (carte → blueprint → carte, ou vue sous-marine en coupe).

## 6. Fin : la réponse + une ouverture
- La réponse à la question du début arrive **seulement à la fin**.
- Dernière séquence « **tu savais… ?** » avec une anecdote bonus (Bermudes : 1609 → *La Tempête* de
  Shakespeare). Elle donne envie de revoir ou de commenter.
- Dernière image propre, qui peut reboucler visuellement sur la première.

## 7. Son
- Voix off claire au premier plan ; **musique de fond continue, douce**, environ -24 dB sous la voix, avec ducking.
- Bruitages rares et doux (whoosh sur les grands vols, petit « pop » sur les gros chiffres).
- Mixage final à **-14 LUFS**, crête max -1 dBTP.

## 8. Correspondance avec le moteur
| effet | élément Kaz |
|---|---|
| titre géant | `title` (serif) + chiffre en `*jaune*` |
| noms de continents 3D | `label` grand, `weight` 900, `rotate`, couleur blanche |
| cercle jaune + flèche | `circle` (jaune) + `arrow` |
| gros chiffre + légende | `number` + `label` petit dessous |
| pilule | `area`/`region` `labelPill`, ou `tag` |
| photos | `image` avec bordure, `rotate`, `slideFrom` |
| icônes | `icon` (`ship`, `plane`, `person`, `house`, `star`, `question`…) avec `stagger` |
| trajet pointillé | `path` `dashed`, `glow` |
| blueprint | `bg: "blueprint"` + `box`, `line`, `people`, `seats` |
| sous-titres mot à mot | `scripts/captions.py` → `overlays` |
| vols de caméra | `cam.from/to` sur plusieurs plans consécutifs, sans `flash` |

Les icônes 3D détaillées, la pluie, les ouragans qui tournent et l'écran « S'abonner » n'existent pas
encore dans le moteur : les ajouter au besoin (`ICON.nom`, `E.nom`, voir « Extending » dans SKILL.md),
ou utiliser des images PNG avec `image`.
