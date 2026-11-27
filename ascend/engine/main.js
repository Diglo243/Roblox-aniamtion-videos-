// Browser entry for video rendering: window.setupEpisode(ep) / renderAt(t) / grab(q)
import { loadBrand } from './brandlib.js';
import { Arena } from './scene.js';

let arena = null;
window.setupEpisode = (ep) => { arena.setup(ep); return true; };
window.renderAt = (t) => arena.renderAt(t);
window.grab = (q = 0.92) => arena.overlay.toDataURL('image/jpeg', q);
loadBrand().then(() => {
  arena = new Arena(document.getElementById('c'), 1080, 1920);
  window.engineReady = true;
}).catch(e => { console.error(e); window.engineError = String(e); });
