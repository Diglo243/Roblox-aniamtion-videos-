# Consignes du propriétaire

- Toujours répondre en **français**, quelle que soit la langue du message, du skill ou du prompt reçu.
- Toutes les vidéos produites (sous-titres, titres, étiquettes, textes à l'écran) sont **en français**,
  quel que soit le format des photos, images ou fichiers envoyés.
- À chaque vidéo livrée, donner aussi **un titre** accrocheur (en français) et **4 hashtags** adaptés.
- Effets sobres : un seul flash (sur la grande révélation), bruitages légers et peu nombreux
  (transitions et gros chiffres seulement, volume bas).

## Son : agréable, jamais agaçant
- La voix off est toujours au premier plan et parfaitement intelligible.
- Volume final normalisé pour les réseaux : `loudnorm` à **-14 LUFS**, crête max **-1 dBTP**.
- Bruitages environ **12 à 15 dB sous la voix**, jamais deux à moins de ~1,2 s, aucun son aigu ou strident
  répété ; musique de fond éventuelle à environ -24 dB sous la voix, avec ducking pendant la parole.
- Pas de bruitage sur chaque élément : seulement les transitions et les moments clés.

## Rétention : garder le spectateur jusqu'à la fin
- **0–3 s :** accroche immédiate, avec une image forte, une question ou un chiffre surprenant à l'écran
  dès la 1ʳᵉ image, et du mouvement tout de suite. Pas d'intro ni d'écran vide.
- **Rythme :** quelque chose change à l'écran toutes les 1,5 à 3 s (zoom, surlignage, chiffre, icône),
  aucun temps mort.
- **Milieu :** relancer la curiosité avec une boucle ouverte (« mais… », « et c'est là que ça se complique »)
  et une coupe de style (blueprint, coupe, changement de carte) vers 40–60 % de la vidéo.
- **Fin :** la réponse promise arrive seulement à la fin, avec une chute mémorable. La dernière image
  peut se relier à la première pour donner envie de revoir la vidéo.
- Avant de livrer : vérifier la planche-contact et le volume (mesure LUFS) de la vidéo finale.
- Vidéos de cartes / explications géographiques ou politiques : utiliser le skill
  `.claude/skills/kaz-map-animation` (appartient au propriétaire du dépôt).
  Playwright est préinstallé : lancer avec `NODE_PATH=$(npm root -g)`, ne pas exécuter `playwright install`.
