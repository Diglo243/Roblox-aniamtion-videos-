#!/usr/bin/env python3
"""Sous-titres « mot à mot » (style viral) : timings de mots → overlays Kaz de 1 à 3 mots.

Usage : python3 captions.py words.json scene.json [--max 3] [--y 1340] [--size 46] [--keywords mot1,mot2]
- words.json : soit {"words":[{"word","start","end"}]} (timestamps.py),
  soit la sortie de director/audio_align.py ({"words":[{"word","punct","start","end"}]}).
- Remplace les overlays de type caption de scene.json et retire les captions des plans.
- Les mots de --keywords (ou les nombres) sont mis en jaune.
"""
import json, re, sys

def main():
    a = sys.argv[1:]
    if len(a) < 2:
        sys.exit(__doc__)
    opt = lambda n, d: a[a.index('--' + n) + 1] if '--' + n in a else d
    mx, y, size = int(opt('max', 3)), float(opt('y', 1340)), int(opt('size', 46))
    kws = {k.strip().lower() for k in opt('keywords', '').split(',') if k.strip()}
    words = json.load(open(a[0]))['words']
    scene = json.load(open(a[1]))

    chunks, cur = [], []
    for w in words:
        cur.append(w)
        p = (w.get('punct') or '') + w['word'][-1:]
        if len(cur) >= mx or re.search(r'[.,;:!?…]', p):
            chunks.append(cur); cur = []
    if cur:
        chunks.append(cur)

    def fmt(w):
        t = w['word'] + (w.get('punct') or '').strip()
        bare = re.sub(r'\W', '', w['word']).lower()
        return f'*{t}*' if bare in kws or re.search(r'\d', bare) else t

    caps = []
    for i, c in enumerate(chunks):
        start = c[0]['start']
        end = chunks[i + 1][0]['start'] if i + 1 < len(chunks) else c[-1]['end'] + 0.4
        caps.append({"type": "caption", "text": ' '.join(fmt(w) for w in c), "from": round(start, 2),
                     "to": round(end, 2), "y": y, "size": size, "dur": 0.08, "outDur": 0.05})

    scene['overlays'] = [o for o in scene.get('overlays', []) if o.get('type') != 'caption'] + caps
    for sh in scene['shots']:
        sh['elements'] = [e for e in sh.get('elements', []) if e.get('type') != 'caption']
    json.dump(scene, open(a[1], 'w'), ensure_ascii=False, indent=1)
    print(f'{len(caps)} sous-titres écrits dans {a[1]}')

if __name__ == '__main__':
    main()
