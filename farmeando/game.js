// FARMEANDO CRINGE — combate de huachafería (versión vertical, dos botones)
// Desarrollado por MNRY · mantarraya.pe
(() => {
'use strict';
const W = 540, H = 960, SCENE_Y = 180, SCENE_H = 470, GROUND = 625, FS = 0.8; // FS: escala de los personajes
const cv = document.getElementById('cv');
const g = cv.getContext('2d');
const $ = id => document.getElementById(id);

// ---------- Configuración ----------
const STAGES = [
  { key: 'rusia', name: 'RUSIA', sub: 'Plaza Roja', idle: [0.6, 1.2], guard: [0.8, 1.3], charge: 0.85, feint: 0, stun: 1.15, atk: 0.5, dbl: 0, regen: 16 },
  { key: 'casa', name: 'CASA DE LA LITERATURA', sub: 'Silencio, por favor', idle: [0.5, 1.0], guard: [0.7, 1.2], charge: 0.72, feint: 0.1, stun: 1.05, atk: 0.52, dbl: 0, regen: 15.5 },
  { key: 'tauro', name: 'CINE TAURO', sub: 'Función de medianoche', idle: [0.42, 0.85], guard: [0.6, 1.1], charge: 0.58, feint: 0.25, stun: 0.9, atk: 0.58, dbl: 0.12, regen: 14.5, bgAnchor: 0.9 },
  { key: 'misa', name: 'LA MISA DEL PAPA', sub: 'Las Palmas · caos total', idle: [0.3, 0.65], guard: [0.45, 0.9], charge: 0.46, feint: 0.4, stun: 0.7, atk: 0.66, dbl: 0.3, regen: 12.5 },
];
const ROUND_TIME = 60, CLOSET = 5;
const CHARS = {
  kunte: { name: 'VAGUEZ KUNTE', short: 'KUNTE', aura: '#ff3fd2', accs: ['panama', 'boina', 'gorra', 'chullo', 'vaquero'] },
  espa: { name: 'CAOS ESPÁ', short: 'ESPÁ', aura: '#35c8ff', accs: ['vaquero', 'chullo', 'gorra', 'boina', 'panama'] },
};
let META = null;

// ---------- Carga ----------
const IMG = {};
function loadImg(k, src) { return new Promise(r => { const i = new Image(); i.onload = () => { IMG[k] = i; r(); }; i.onerror = () => r(); i.src = src; }); }

// ---------- Audio ----------
let AC = null, master = null, musicOn = true, sfxMute = false, userStarted = false;
function audioInit() {
  if (AC) return;
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = 0.5; master.connect(AC.destination); } catch (e) { AC = null; }
}
function tone(f, t, d, type = 'square', v = 0.15, f2 = null) {
  if (!AC || sfxMute) return;
  const o = AC.createOscillator(), gn = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  gn.gain.setValueAtTime(v, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(gn); gn.connect(master); o.start(t); o.stop(t + d + 0.02);
}
function noise(t, d, v = 0.2) {
  if (!AC || sfxMute) return;
  const b = AC.createBuffer(1, AC.sampleRate * d, AC.sampleRate), ch = b.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
  const s = AC.createBufferSource(), gn = AC.createGain(); s.buffer = b;
  gn.gain.setValueAtTime(v, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + d); s.connect(gn); gn.connect(master); s.start(t);
}
const now0 = () => AC ? AC.currentTime : 0;

// ---------- Sonidos grabados (banco "Lista de sonido") ----------
const SFXFILES = ['shoot', 'shoot2', 'hit', 'hit2', 'charge', 'shield', 'block', 'bounce', 'stun', 'rip', 'drop', 'wear', 'closet', 'combo', 'ko', 'win', 'final', 'lose', 'ouch1', 'ouch2', 'ouch3', 'ouch4', 'ohno1', 'ohno2', 'ohno3', 'ohno4', 'laugh1', 'laugh2', 'laugh3', 'laugh4', 'laughbig', 'hush', 'apagon', 'apagon2', 'static', 'water', 'spark'];
const SND = {};
SFXFILES.forEach(k => { SND[k] = (['shoot', 'hit', 'hit2', 'bounce', 'block'].includes(k) ? [0, 1, 2] : [0, 1]).map(() => { const a = new Audio('assets/sfx/' + k + '.mp3?v=5'); a.preload = 'auto'; return a; }); });
const sndIdx = {};
function snd(name, vol = 1) {
  if (sfxMute) return;
  const pool = SND[name]; if (!pool) return;
  sndIdx[name] = ((sndIdx[name] || 0) + 1) % pool.length;
  const a = pool[sndIdx[name]];
  try { a.currentTime = 0; a.volume = Math.max(0, Math.min(1, vol)); a.play().catch(() => { }); } catch (_) { }
}
function choice(...names) { return names[Math.floor(Math.random() * names.length)]; }
let crowdAud = null;
function crowdLoop(on) {
  if (on) {
    if (!crowdAud) { crowdAud = new Audio('assets/sfx/crowd.mp3?v=1'); crowdAud.loop = true; crowdAud.volume = 0.22; }
    if (!sfxMute && userStarted) crowdAud.play().catch(() => { });
  } else if (crowdAud) crowdAud.pause();
}

let apagonN = 0;
const SFX = {
  zap() { tone(1500, now0(), 0.12, 'sawtooth', 0.12, 300); snd('shoot', 0.75); },
  steal() { const t = now0(); [523, 659, 784, 1046].forEach((f, i) => tone(f, t + i * 0.04, 0.09, 'square', 0.08)); snd('rip', 0.9); },
  hit() { const t = now0(); noise(t, 0.15, 0.25); tone(160, t, 0.15, 'square', 0.15, 60); snd(choice('hit', 'hit2'), 0.9); snd(choice('ouch1', 'ouch2', 'ouch3', 'ouch4'), 0.9); },
  bounce() { tone(220, now0(), 0.25, 'sawtooth', 0.15, 90); snd('bounce', 0.8); },
  block() { const t = now0(); tone(880, t, 0.08, 'triangle', 0.16); tone(1320, t + 0.05, 0.12, 'triangle', 0.13); snd('block', 0.85); snd('shield', 0.45); },
  charge() { tone(200, now0(), 0.45, 'square', 0.05, 700); snd('charge', 0.7); },
  ko() { const t = now0(); tone(400, t, 0.9, 'sawtooth', 0.18, 50); noise(t, 0.6, 0.2); snd('ko', 1); },
  water() { noise(now0(), 0.5, 0.25); snd('water', 0.9); },
  blip() { tone(660, now0(), 0.06, 'square', 0.08); snd('wear', 0.4); },
  closet() { tone(980, now0(), 0.05, 'triangle', 0.08); snd('closet', 0.7); },
  stun() { snd('stun', 0.7); },
  combo() { snd('combo', 0.85); },
  apagon() { apagonN++; snd(apagonN % 2 ? 'apagon' : 'apagon2', 1); },
  glitch() { snd('static', 0.7); },
  win() { snd(choice('win', 'laugh1', 'laugh2', 'laugh3', 'laugh4', 'laughbig'), 1); },
  lose() { snd(choice('lose', 'ohno1', 'ohno2', 'ohno3', 'ohno4'), 1); },
  final() { snd('final', 1); },
};
const MUS = {}, ANN = {};
let curMusic = null;
['title', 'rusia', 'casa', 'tauro', 'misa'].forEach(k => { const a = new Audio('assets/audio/m_' + k + '.mp3'); a.loop = true; a.preload = 'none'; a.volume = 0.45; MUS[k] = a; });
['1', '2', '3', '4', 'bonus'].forEach(k => { const a = new Audio('assets/audio/a_' + k + '.mp3'); a.preload = 'auto'; ANN[k] = a; });
function playMusic(k) {
  Object.entries(MUS).forEach(([kk, a]) => { if (kk !== k) a.pause(); });
  if (curMusic === k && MUS[k] && !MUS[k].paused) return;
  curMusic = k;
  if (!musicOn || !userStarted) return;
  const a = MUS[k]; if (!a) return; a.currentTime = 0; a.play().catch(() => { });
}
function announce(k) { if (!musicOn || !userStarted) return; const a = ANN[k]; if (!a) return; try { a.currentTime = 0; a.play().catch(() => { }); } catch (_) { } }
const RANK_SND = new Audio('assets/audio/peruano.mp3'); RANK_SND.preload = 'none'; RANK_SND.volume = 0.7;
// Sonido de derrota: cuando el jugador pierde la partida.
const LOSE_SND = new Audio('assets/audio/pierde.mp3'); LOSE_SND.preload = 'auto'; LOSE_SND.volume = 0.9;
// Aviso: en el primer round, cuando al jugador le queda un solo outfit en el perchero.
const LAST_SND = new Audio('assets/audio/ultimo.mp3'); LAST_SND.preload = 'auto'; LAST_SND.volume = 0.9;
// Cuando Espá pierde en el 3er round (lo maneje el jugador o el rival).
const KUNTE_R2_SND = new Audio('assets/audio/kunte_pierde_r2.mp3'); KUNTE_R2_SND.preload = 'auto'; KUNTE_R2_SND.volume = 0.95;
const KUNTE_TAURO_SND = new Audio('assets/audio/kunte_pierde_tauro.mp3'); KUNTE_TAURO_SND.preload = 'auto'; KUNTE_TAURO_SND.volume = 0.95;
const ESPA_R3_SND = new Audio('assets/audio/espa_pierde_r3.mp3'); ESPA_R3_SND.preload = 'auto'; ESPA_R3_SND.volume = 0.9;
let lastOutfitWarned = false;
function checkLastOutfit(f) {
  if (f !== P || stageIdx !== 0 || lastOutfitWarned || f.closet.length !== 1) return;
  lastOutfitWarned = true;
  if (musicOn && userStarted) { try { LAST_SND.currentTime = 0; LAST_SND.play().catch(() => { }); } catch (_) { } }
}

// ---------- Easter egg: Moya ----------
const MOYA_SND = [1, 2, 3, 4].map(i => { const a = new Audio('assets/audio/moya_' + i + '.mp3'); a.preload = 'none'; a.volume = 0.85; return a; });
let moyaBag = [];
function moyaNextSound() {
  if (!moyaBag.length) moyaBag = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
  const i = moyaBag.pop();
  return MOYA_SND[i];
}
const MOYA_FRAMES = 40, MOYA_MS = 50, MOYA_DUR = MOYA_FRAMES * MOYA_MS / 1000;
let moya = { active: false, t: 0, shown: false };
function triggerMoya() {
  if (moya.shown || moya.active) return;
  if (stageIdx !== STAGES.length - 1) return;
  moya.shown = true; moya.active = true; moya.t = 0;
  if (musicOn && userStarted) { try { const a = moyaNextSound(); a.currentTime = 0; a.play().catch(() => { }); } catch (_) { } }
}
function showTop() {
  loadTop(); setState('top');
  if (musicOn && userStarted) { try { RANK_SND.currentTime = 0; RANK_SND.play().catch(() => { }); } catch (_) { } }
}

// ---------- Vestuario ----------
// pieza: {src, look} para saco/pantalón/zapatos; {acc} para el accesorio
function regY(c, f) { return META[c].top + f * META[c].h; }
// Sombreros desactivados por ahora (ninguna de las dos versiones probadas
// en producción funcionó bien: ni los rectángulos procedurales ni las
// fotos recortadas). drawAcc queda como no-op hasta tener un reemplazo
// verificado en todas las pantallas antes de volver a desplegar.
function drawAcc(x, kind, hx, top, h) { }
const AX = 0.42; // ancla horizontal (centro de piernas) dentro del cuadro
function PM(c, pose) { return (META[c] && META[c][pose]) || META[c].guard; }
function bandPx(c, pose, slot) { const m = PM(c, pose); return slot === 1 ? m.torso : slot === 2 ? m.legs : [m.feetY, META.fh]; }
function poseImg(c, pose) { return IMG[c + '_' + pose] || IMG[c + '_guard']; }
// Guardia, ataque y bloqueo: en vez de cortar franjas horizontales de una
// foto ya compuesta (que no calzan entre personajes ni entre looks), cada
// prenda es su propio recorte con alfa (silueta real) sobre el mismo cuerpo
// base compartido de esa pose. Así una prenda robada nunca deja un corte ni
// piel de más: solo cubre donde la prenda misma cubre.
const SILO_POSES = { guard: 1, attack: 1, block: 1 };
function siloImg(pose, src, slot, look) { return IMG[src + '_' + pose + '_' + (slot === 1 ? 'saco' : 'panta') + '_' + look]; }
// Expresión facial según lo que esté haciendo el personaje: la cabeza es su
// propia pieza (va al frente de todo) para poder cambiarla sin recomponer
// el resto, y para que siempre tape cualquier borde de la prenda.
function faceFor(f, pose) {
  if (pose === 'attack') return 'grito';
  if (pose === 'block') return 'serio';
  if (f.st === 'charge') return 'sonrisilla';
  // Se burla un instante cuando acaba de darle al otro.
  const foe = f === P ? R : P;
  if (foe && foe.hurt > 0.15) return 'sonrisa';
  if (f === P && combo >= 3) return 'sonrisilla';
  return 'serio';
}
// Golpeado y celebración no tienen arte propio: usan las piezas de guardia
// (siempre las prendas reales que lleva puestas) con la cara que toca.
const SILO_ALIAS = { hit: ['guard', 'grito'], win1: ['guard', 'sonrisa'], win2: ['guard', 'sonrisilla'] };
function makeCompositeSilo(f, pose, face, key) {
  const c = f.char, M = META;
  f.cv = f.cv || {};
  key = key || pose + ':' + face;
  const cvs = f.cv[key] || (f.cv[key] = document.createElement('canvas'));
  cvs.width = M.fw; cvs.height = M.fh;
  const x = cvs.getContext('2d'); x.clearRect(0, 0, M.fw, M.fh);
  // Cada prenda se reemplaza entera: si le robaron una, va la pieza "sin
  // ropa" de ese personaje (torso desnudo / short) en su lugar. Nunca hay un
  // cuerpo de fondo, así que no asoman restos de otro sprite.
  const piece = slot => {
    const p = f.slots[slot];
    return (p && siloImg(pose, p.src, slot, p.look)) || IMG[c + '_' + pose + '_' + (slot === 1 ? 'saco' : 'panta') + '_0'];
  };
  const saco = piece(1), panta = piece(2);
  // Torso desnudo va debajo del pantalón (la pretina lo tapa); un saco va encima.
  const order = f.slots[1] ? [panta, saco] : [saco, panta];
  order.forEach(img => { if (img) x.drawImage(img, 0, 0); });
  // La cabeza va siempre al frente de todo, sobre el cuello de la prenda.
  const head = IMG[c + '_' + pose + '_face_' + face]; if (head) x.drawImage(head, 0, 0);
  return key;
}
function makeComposite(f, pose, face) {
  if (SILO_POSES[pose]) return makeCompositeSilo(f, pose, face);
  if (SILO_ALIAS[pose]) return makeCompositeSilo(f, SILO_ALIAS[pose][0], SILO_ALIAS[pose][1], pose);
  const c = f.char, M = META;
  f.cv = f.cv || {};
  const cvs = f.cv[pose] || (f.cv[pose] = document.createElement('canvas'));
  cvs.width = M.fw; cvs.height = M.fh;
  const x = cvs.getContext('2d'); x.clearRect(0, 0, M.fw, M.fh);
  x.drawImage(poseImg(c, pose), 0, 0, M.fw, M.fh, 0, 0, M.fw, M.fh);
  [2, 3, 1].forEach(slot => {
    const p = f.slots[slot]; if (!p) return;
    const [y0, y1] = bandPx(c, pose, slot), [sy0, sy1] = bandPx(p.src, pose, slot);
    x.clearRect(0, y0, M.fw, y1 - y0);
    x.drawImage(poseImg(p.src, pose), p.look * M.fw, sy0, M.fw, sy1 - sy0, 0, y0, M.fw, y1 - y0);
  });
  if (f.slots[0] && (pose === 'guard' || pose === 'win1' || pose === 'win2')) { const m = PM(c, pose); drawAcc(x, f.slots[0].acc, m.hx * M.fw, m.top, 300); }
  return pose;
}
function comp(f, pose) {
  if (f.dirty) { f.cvOk = {}; f.dirty = false; }
  f.cvOk = f.cvOk || {};
  const face = SILO_POSES[pose] ? faceFor(f, pose) : null;
  const key = face ? pose + ':' + face : pose;
  if (!f.cvOk[key]) { makeComposite(f, pose, face); f.cvOk[key] = true; }
  f.lastKey = key;
  return f.cv[key];
}
const pieceCache = new Map();
function pieceImage(p, slot) {
  const key = slot + ':' + (p.acc || p.src + p.look);
  if (pieceCache.has(key)) return pieceCache.get(key);
  const M = META, c = document.createElement('canvas');
  if (slot === 0) { c.width = 90; c.height = 70; drawAcc(c.getContext('2d'), p.acc, 45, 30, 300); }
  else {
    // El pantalón ya trae el calzado pegado (misma pieza de arte), así que
    // el ícono de "zapatos" (slot 3) reusa la silueta del pantalón. Se recorta
    // a la franja donde vive cada prenda (igual en todos los looks, mismo
    // cuerpo base) solo para que el ícono no quede con medio cuadro vacío.
    const img = siloImg('guard', p.src, slot === 1 ? 1 : 2, p.look);
    const [cy0, cy1] = slot === 1 ? [110, 275] : [195, 380];
    c.width = M.fw; c.height = cy1 - cy0;
    if (img) c.getContext('2d').drawImage(img, 0, cy0, M.fw, cy1 - cy0, 0, 0, M.fw, cy1 - cy0);
  }
  pieceCache.set(key, c); return c;
}
// Efectos en sprites (fondo negro, se dibujan en modo "lighter")
let FXM = {};
function spr(name, x, y, sc = 1, o = {}) { const m = FXM[name]; if (!m || !IMG['fx_' + name]) return; fx.push(Object.assign({ k: 'spr', name, x, y, sc, t: 0, d: m.n * m.ms / 1000 }, o)); }
function drawSpr(name, x, y, sc, t, o = {}) {
  const m = FXM[name], img = IMG['fx_' + name]; if (!m || !img) return;
  let fr = Math.floor(t * 1000 / m.ms); fr = o.loop ? fr % m.n : Math.min(m.n - 1, fr);
  g.save(); g.globalCompositeOperation = 'lighter'; if (o.alpha != null) g.globalAlpha = o.alpha;
  const src = o.hue ? tintedStrip(name, o.hue) : img;
  g.translate(x, y); if (o.rot) g.rotate(o.rot); if (o.flip) g.scale(-1, 1);
  g.drawImage(src, fr * m.w, 0, m.w, m.h, -m.w * sc / 2, -m.h * sc / 2, m.w * sc, m.h * sc);
  g.restore();
}
// Versiones teñidas de los efectos, calculadas UNA vez (ctx.filter en cada cuadro hace lagear a muchos celulares).
const tintCache = {};
function tintedStrip(name, hue) {
  const key = name + '@' + hue; if (tintCache[key]) return tintCache[key];
  const img = IMG['fx_' + name], c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  try {
    const d = x.getImageData(0, 0, c.width, c.height), px = d.data, a = hue * Math.PI / 180, co = Math.cos(a), si = Math.sin(a), sa = 1.4;
    const H = [[0.213 + 0.787 * co - 0.213 * si, 0.715 - 0.715 * co - 0.715 * si, 0.072 - 0.072 * co + 0.928 * si], [0.213 - 0.213 * co + 0.143 * si, 0.715 + 0.285 * co + 0.140 * si, 0.072 - 0.072 * co - 0.283 * si], [0.213 - 0.213 * co - 0.787 * si, 0.715 - 0.715 * co + 0.715 * si, 0.072 + 0.928 * co + 0.072 * si]];
    const S = [[0.213 + 0.787 * sa, 0.715 - 0.715 * sa, 0.072 - 0.072 * sa], [0.213 - 0.213 * sa, 0.715 + 0.285 * sa, 0.072 - 0.072 * sa], [0.213 - 0.213 * sa, 0.715 - 0.715 * sa, 0.072 + 0.928 * sa]];
    const M = S.map(r => [0, 1, 2].map(j => r[0] * H[0][j] + r[1] * H[1][j] + r[2] * H[2][j]));
    for (let i = 0; i < px.length; i += 4) {
      const r = px[i], gg = px[i + 1], b = px[i + 2];
      px[i] = M[0][0] * r + M[0][1] * gg + M[0][2] * b; px[i + 1] = M[1][0] * r + M[1][1] * gg + M[1][2] * b; px[i + 2] = M[2][0] * r + M[2][1] * gg + M[2][2] * b;
    }
    x.putImageData(d, 0, 0);
  } catch (e) { }
  return tintCache[key] = c;
}
function prewarmTints() { ['hit', 'orb', 'ki', 'charge'].forEach((n, i) => setTimeout(() => { if (IMG['fx_' + n]) tintedStrip(n, HUE.kunte); }, i * 400)); }
const HUE = { kunte: 110, espa: 0 }; // los efectos son celestes; Kunte los ve fucsia

// ---------- Estado ----------
let state = 'loading', T = 0, last = 0, stateT = 0;
let pick = 'kunte', stageIdx = 0, score = 0, runStart = 0, runSecs = 0, topList = [], myEntry = null;
let P, R, fx = [], parts = [], msgs = [], combo = 0, timeLeft = ROUND_TIME, shake = 0, flash = 0, flashCol = '#fff', hz = {};
let result = null, stolenTotal = 0, stolenStage = 0;

function other(c) { return c === 'kunte' ? 'espa' : 'kunte'; }
function newFighter(c, side, look) {
  const accs = CHARS[c].accs;
  const f = {
    char: c, side, x: side < 0 ? 150 : 390, slots: [{ acc: accs[(look - 1) % accs.length] }, { src: c, look }, { src: c, look }, { src: c, look }],
    closet: [], dirty: true, cvs: null, lunge: 0, hurt: 0, shield: 0, stun: 0, cool: 0, ko: false, win: false,
    st: 'idle', stT: 0, stDur: 1, feint: false, pose: 'guard', poseT: 0, lastPose: 'guard', squash: 0,
    energy: 100, bcool: 0, fly: null,
  };
  for (let i = 0; i < CLOSET; i++) f.closet.push({ look: ((look + i) % 4) + 1, acc: accs[(look + i) % accs.length] });
  return f;
}
function lives(f) { return f.closet.length + f.slots.filter(Boolean).length; }
function startRun() { score = 0; stageIdx = 0; stolenTotal = 0; moya.shown = false; moya.active = false; runStart = performance.now(); startStage(); }
function startStage() { lastOutfitWarned = false;
  P = newFighter(pick, -1, stageIdx + 1); R = newFighter(other(pick), 1, ((stageIdx + 2) % 4) + 1);
  fx = []; parts = []; msgs = []; combo = 0; shake = 0; flash = 0; stolenStage = 0;
  timeLeft = ROUND_TIME; hz = { t: 0, next: 7 + Math.random() * 3 };
  setState('intro');
  playMusic(STAGES[stageIdx].key);
  crowdLoop(STAGES[stageIdx].key === 'misa');
  setTimeout(() => announce(String(stageIdx + 1)), 350);
}
function setState(s) { if (state === 'top' && s !== 'top') { try { RANK_SND.pause(); } catch (_) { } } state = s; stateT = 0; updateUI(); }
function say(text, col = '#ffd400', big = false) { msgs.push({ text, col, t: 0, big }); if (msgs.length > 3) msgs.shift(); }

function slotY(f, slot) {
  const m = PM(f.char, 'guard');
  const fy = [m.top + 12, (m.torso[0] + m.torso[1]) / 2, (m.legs[0] + m.legs[1]) / 2, m.feetY + 10][slot];
  return GROUND - (META.fh - fy) * FS;
}
function handPos(f) { const m = PM(f.char, 'attack'); return { x: f.x + (f.side < 0 ? 1 : -1) * (m.hand[0] - META.fw * AX) * FS, y: GROUND - (META.fh - m.hand[1]) * FS }; }
function chestPos(f) { return { x: f.x + (f.side < 0 ? 18 : -18), y: slotY(f, 1) - 20 }; }
function setPose(f, pose, d) { f.pose = pose; f.poseT = d; }
function curPose(f) {
  if (f.poseT > 0) return f.pose;
  if (state === 'fight' || state === 'intro') {
    if (f === R && R.st === 'guard') return 'block';
    if (f === R && R.st === 'stun') return 'hit';
    if (f === P && P.shield > T) return 'block';
    if (f.stun > T) return 'hit';
  }
  return 'guard';
}

// Robo: el atacante se pone la prenda; la víctima saca un cambio de su clóset
function steal(att, vic) {
  const dressed = [0, 1, 2, 3].filter(i => vic.slots[i]);
  if (!dressed.length) return;
  const slot = dressed[Math.floor(Math.random() * dressed.length)];
  const piece = vic.slots[slot];
  vic.slots[slot] = null; vic.dirty = true; vic.hurt = 1;
  burst(vic.x, slotY(vic, slot), CHARS[att.char].aura);
  fx.push({ k: 'fly', img: pieceImage(piece, slot), x0: vic.x, y0: slotY(vic, slot), x1: att.x, y1: slotY(att, slot), t: 0, d: 0.3, flip: vic.side > 0, done: () => {
    const old = att.slots[slot];
    if (old) fx.push({ k: 'drop', img: pieceImage(old, slot), x: att.x, y: slotY(att, slot), t: 0, d: 0.7, flip: att.side > 0 });
    att.slots[slot] = piece; att.dirty = true; SFX.steal();
  } });
  if (vic.closet.length) {
    const h = vic.closet.shift();
    checkLastOutfit(vic);
    const np = slot === 0 ? { acc: h.acc } : { src: vic.char, look: h.look };
    const cx = vic.side < 0 ? 70 : W - 70;
    fx.push({ k: 'fly', img: pieceImage(np, slot), x0: cx, y0: 150, x1: vic.x, y1: slotY(vic, slot), t: -0.15, d: 0.3, flip: vic.side > 0, small: true, done: () => { vic.slots[slot] = np; vic.dirty = true; SFX.closet(); } });
  }
  if (att === P) { stolenStage++; stolenTotal++; }
}

// ---------- Controles ----------
const RAY_COST = 30;
function rayo() {
  audioInit();
  if (state !== 'fight' || !P || P.stun > T || P.cool > T) return;
  if (P.energy < RAY_COST) { SFX.stun(); say('¡SIN ENERGÍA!', '#777'); return; }
  P.energy -= RAY_COST;
  P.cool = T + 0.22; P.lunge = 1; SFX.zap();
  const rs = R.st;
  if (rs === 'guard') {
    ray(P, R, '#9aa', true, () => {
      if (state !== 'fight') return;
      const sx = R.x - 70, sy = chestPos(R).y; spr('blockhit', sx, sy, 1.2); SFX.bounce();
      const c = chestPos(P);
      fx.push({ k: 'ki', x0: sx, y0: sy, x1: c.x, y1: c.y, t: 0, d: 0.14, hue: HUE[P.char], small: true, done: () => { spr('hit', c.x, c.y, 0.9, { hue: HUE[P.char] }); setPose(P, 'hit', 0.5); P.stun = T + 0.6; P.hurt = 0.6; combo = 0; say('¡REBOTÓ!', '#7cf6ff'); SFX.stun(); } });
    });
    return;
  }
  combo++;
  const mult = Math.min(5, 1 + Math.floor(combo / 3));
  let pts = 100;
  if (rs === 'charge') { pts = 200; say('¡CONTRA!', '#7cff6b'); R.st = 'idle'; R.stT = 0; R.stDur = 0.6; }
  else if (rs === 'stun') pts = 150;
  score += pts * mult;
  if (combo > 1 && combo % 3 === 0) say('COMBO x' + mult, '#ffd400');
  // Easter egg: Moya aparece en la Misa desde una racha de 3 golpes (una vez por partida).
  if (combo >= 3) triggerMoya();
  ray(P, R, CHARS[P.char].aura, false, () => { steal(P, R); SFX.hit(); });
  if (combo === 8) { say('¡RACHA HUACHAFA!', '#ff3fd2', true); announce('bonus'); SFX.combo(); spr('lines', W / 2, SCENE_Y + SCENE_H / 2, 2.4); flash = 0.8; flashCol = CHARS[P.char].aura; setTimeout(() => { if (state === 'fight') steal(P, R); }, 250); }
}
const BLOCK_DUR = 2;
function bloquear() {
  audioInit();
  if (state !== 'fight' || !P || P.stun > T || P.shield > T || P.bcool > T) return;
  P.shield = T + BLOCK_DUR; P.shieldFrom = T; P.bcool = T + BLOCK_DUR + 0.3;
}
function ray(a, b, col, missed, done) {
  setPose(a, 'attack', 0.32);
  const h = handPos(a), c = chestPos(b);
  spr('hit', h.x, h.y, 0.55, { hue: HUE[a.char] });
  fx.push({ k: 'ki', x0: h.x, y0: h.y, x1: missed ? c.x + (b.side > 0 ? -70 : 70) : c.x, y1: c.y, t: 0, d: 0.16, hue: HUE[a.char], done: () => {
    if (!missed) { spr('hit', c.x, c.y, 1.4, { hue: HUE[a.char] }); spr('impact', c.x, c.y, 1.1); setPose(b, 'hit', 0.38); flash = Math.max(flash, 0.25); flashCol = '#fff'; }
    if (done) done();
  } });
}
function burst(x, y, col) { for (let i = 0; i < 14; i++) { const a = Math.random() * 6.28, s = 100 + Math.random() * 240; parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: 0.5, t: 0, col, sz: 3 + Math.random() * 4 }); } }

// ---------- IA del rival ----------
function rivalUpdate(dt) {
  const st = STAGES[stageIdx], r = R;
  r.stT += dt;
  if (r.st === 'charge' && r.feint && r.stT > r.stDur * 0.45) { r.st = 'guard'; r.stT = 0; r.stDur = 0.6; r.feint = false; return; }
  if (r.stT < r.stDur) return;
  if (r.st === 'charge') {
    r.lunge = 1; SFX.zap();
    if (P.shield > T) {
      ray(r, P, CHARS[r.char].aura, true, () => { spr('blockhit', P.x + 75, chestPos(P).y, 1.3); spr('shield', P.x + 50, chestPos(P).y, 2.2); });
      setPose(P, 'block', 0.35);
      say('¡BLOQUEADO!', '#7cf6ff'); SFX.block(); score += 100;
      r.st = 'stun'; r.stT = 0; r.stDur = st.stun; return;
    }
    combo = 0;
    ray(r, P, CHARS[r.char].aura, false, () => { steal(r, P); SFX.hit(); shake = 0.3; });
    say('¡TE DIO!', '#ff4d6d');
    if (Math.random() < st.dbl) { r.st = 'idle'; r.stT = 0; r.stDur = 0.2; r.chain = true; return; }
  }
  r.stT = 0;
  const rnd = (a) => a[0] + Math.random() * (a[1] - a[0]);
  if (r.st !== 'idle') { r.st = 'idle'; r.stDur = rnd(st.idle); return; }
  const go = r.chain || Math.random() < st.atk; r.chain = false;
  if (go) { r.st = 'charge'; r.stDur = st.charge; r.feint = Math.random() < st.feint; SFX.charge(); }
  else { r.st = 'guard'; r.stDur = rnd(st.guard); }
}

// ---------- Peligros ----------
function hazards(dt) {
  const k = STAGES[stageIdx].key; hz.t += dt;
  if (k === 'rusia' && Math.random() < dt * (perfLow ? 14 : 50)) parts.push({ x: Math.random() * W, y: SCENE_Y, vx: -20 + Math.random() * 20, vy: 60 + Math.random() * 80, life: 12, t: 0, col: '#fff', sz: 2 + Math.random() * 3, snow: 1 });
  if (k === 'casa' && Math.random() < dt * 1.2) fx.push({ k: 'book', x: Math.random() < 0.5 ? -20 : W + 20, y: SCENE_Y + 80 + Math.random() * 180, t: 0, d: 2.4, col: ['#c0392b', '#2e86de', '#27ae60', '#f39c12'][Math.floor(Math.random() * 4)] });
  if (k === 'tauro') {
    if (hz.t > hz.next) { hz.dark = 1.8; hz.next = hz.t + 6 + Math.random() * 3; say('¡SE FUE LA LUZ!', '#ff3fd2'); SFX.apagon(); }
    if (hz.dark > 0) hz.dark -= dt;
  }
  if (k === 'misa') {
    if (hz.t > hz.next) {
      hz.next = hz.t + 8 + Math.random() * 4;
      if (Math.random() < 0.55) {
        hz.water = 1; SFX.water(); say('¡BALDAZO DE AGUA!', '#7cf6ff');
        [P, R].forEach(f => { if (f.slots[1]) { const p = f.slots[1]; f.slots[1] = null; f.dirty = true; fx.push({ k: 'drop', img: pieceImage(p, 1), x: f.x, y: slotY(f, 1), t: 0, d: 0.8, flip: f.side > 0 }); if (f.closet.length) { const h = f.closet.shift(); checkLastOutfit(f); setTimeout(() => { if (!f.slots[1]) { f.slots[1] = { src: f.char, look: h.look }; f.dirty = true; } }, 450); } } });
      } else { hz.glitch = 2.5; say('¡SE CAYERON LAS PANTALLAS!', '#ff4d6d'); SFX.glitch(); }
    }
    if (hz.water > 0) hz.water -= dt * 1.5;
    if (hz.glitch > 0) hz.glitch -= dt;
    if (Math.random() < dt * 0.5) fx.push({ k: 'rosary', x: Math.random() < 0.5 ? -30 : W + 30, y: SCENE_Y + 60 + Math.random() * 120, t: 0, d: 2.2 });
  }
}

// ---------- Bucle ----------
let slowmo = 0;
function update(dt) {
  const realDt = dt;
  if (slowmo > 0) { dt *= 0.22; slowmo = Math.max(0, slowmo - realDt); }
  T += dt; stateT += dt;
  if (state === 'intro' && stateT > 2.3) { setState('fight'); R.st = 'idle'; R.stT = 0; R.stDur = 1.0; }
  if (state === 'fight') {
    timeLeft = Math.max(0, timeLeft - dt);
    rivalUpdate(dt); hazards(dt);
    P.energy = Math.min(100, P.energy + dt * STAGES[stageIdx].regen);
    const pl = P.slots.some(Boolean) || P.closet.length, rl = R.slots.some(Boolean) || R.closet.length;
    if (!pl || !rl || timeLeft <= 0) endRound();
  }
  if (state === 'ko' && stateT > 3.4) afterKO();
  [P, R].forEach(f => {
    if (!f) return;
    f.lunge = Math.max(0, f.lunge - dt * 5); f.hurt = Math.max(0, f.hurt - dt * 3); f.poseT -= dt; f.squash = Math.max(0, f.squash - dt * 7);
    if (f.fly) { f.fly.t += dt; f.fly.x += f.fly.vx * dt; f.fly.y += f.fly.vy * dt; f.fly.vy += 640 * dt; f.fly.rot += f.fly.vr * dt; }
  });
  shake = Math.max(0, shake - dt); flash = Math.max(0, flash - dt * 2);
  if (moya.active) { moya.t += realDt; if (moya.t >= MOYA_DUR) moya.active = false; }
  if (P && (state === 'fight' || state === 'intro')) {
    const rb = $('rayBar'), bb = $('blockBar');
    if (rb) rb.style.width = Math.max(0, Math.min(100, P.energy)) + '%';
    $('btnRay') && $('btnRay').classList.toggle('low', P.energy < RAY_COST);
    const blocking = P.shield > T;
    if (bb) bb.style.width = blocking ? Math.max(0, Math.min(100, (P.shield - T) / BLOCK_DUR * 100)) + '%' : (P.bcool > T ? 0 : 100) + '%';
    $('btnBlock') && $('btnBlock').classList.toggle('locked', blocking);
  }
  const doneCbs = [];
  fx = fx.filter(e => { e.t += dt; if (e.t >= e.d) { if (e.done) doneCbs.push(e.done); return false; } return true; });
  doneCbs.forEach(cb => cb());
  parts = parts.filter(p => { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; if (!p.snow) p.vy += 500 * dt; return p.t < p.life && p.y < SCENE_Y + SCENE_H; });
  msgs = msgs.filter(m => (m.t += dt) < 1.1);
}
function endRound() {
  const won = lives(P) >= lives(R) && lives(P) > 0;
  result = won;
  const loser = won ? R : P, winner = won ? P : R;
  fx = fx.filter(e => e.k !== 'fly');
  loser.slots.forEach((p, i) => { if (p) fx.push({ k: 'drop', img: pieceImage(p, i), x: loser.x, y: slotY(loser, i), t: 0, d: 1, up: 1 }); });
  loser.slots = [null, null, null, null]; loser.closet = []; loser.dirty = true; loser.ko = true; winner.win = true;
  const dir = loser.side < 0 ? -1 : 1;
  loser.fly = { t: 0, x: 0, y: 0, rot: 0, vx: dir * 300, vy: -520, vr: dir * 3.2 };
  slowmo = 1.3;
  SFX.ko(); flash = 1; flashCol = '#fff'; shake = 0.6;
  spr('boom', loser.x, chestPos(loser).y, 1.8); spr('ko', loser.x, GROUND - 30, 1.6); spr('lines', W / 2, SCENE_Y + SCENE_H / 2, 2.4);
  if (won) score += lives(P) * 150 + 1000;
  setTimeout(() => {
    if (state !== 'ko') return;
    if (loser.char === 'kunte' && stageIdx === 1 && musicOn && userStarted) { try { KUNTE_R2_SND.currentTime = 0; KUNTE_R2_SND.play().catch(() => { }); return; } catch (_) { } }
    if (loser.char === 'kunte' && stageIdx === 2 && musicOn && userStarted) { try { KUNTE_TAURO_SND.currentTime = 0; KUNTE_TAURO_SND.play().catch(() => { }); return; } catch (_) { } }
    if (loser.char === 'espa' && stageIdx === 2 && musicOn && userStarted) { try { ESPA_R3_SND.currentTime = 0; ESPA_R3_SND.play().catch(() => { }); return; } catch (_) { } }
    if (won) { SFX.win(); return; }
    if (musicOn && userStarted) { try { LOSE_SND.currentTime = 0; LOSE_SND.play().catch(() => SFX.lose()); } catch (_) { SFX.lose(); } } else SFX.lose();
  }, 550);
  if (won && stageIdx === STAGES.length - 1) setTimeout(() => { if (state === 'ko') SFX.final(); }, 1300);
  setState('ko');
}
function afterKO() {
  if (result && stageIdx < STAGES.length - 1) { stageIdx++; startStage(); }
  else { runSecs = (performance.now() - runStart) / 1000; crowdLoop(false); setState('name'); playMusic('title'); }
}

// ---------- Dibujo ----------
function txt(t, x, y, size, col = '#fff', align = 'center', stroke = 6) {
  g.font = size + 'px "Press Start 2P", monospace'; g.textAlign = align; g.lineJoin = 'round';
  g.lineWidth = stroke; g.strokeStyle = '#000'; g.strokeText(t, x, y); g.fillStyle = col; g.fillText(t, x, y);
}
const bgCache = {};
function bgScaled(key, full, anchorX, img) {
  const k = key + (full ? 'F' : 'S') + anchorX; if (bgCache[k]) return bgCache[k];
  const ah = full ? H : SCENE_H, c = document.createElement('canvas'); c.width = W; c.height = ah;
  const x = c.getContext('2d'), sc = Math.max(W / img.width, ah / img.height), w = img.width * sc, h = img.height * sc;
  x.drawImage(img, (W - w) * anchorX, ah - h, w, h);
  return bgCache[k] = c;
}
function drawBG(key, dim = 0, full = false, anchorX = 0.5) {
  const img = IMG['bg_' + key];
  g.fillStyle = '#12061f'; g.fillRect(0, 0, W, H);
  if (img) {
    const y0 = full ? 0 : SCENE_Y, ah = full ? H : SCENE_H;
    g.drawImage(bgScaled(key, full, anchorX, img), 0, y0);
    if (!full) { g.fillStyle = '#ff3fd2'; g.fillRect(0, y0 + ah, W, 3); }
  }
  if (dim) { g.fillStyle = `rgba(10,0,25,${dim})`; g.fillRect(0, 0, W, H); }
}
function drawFighter(f) {
  if (!f) return;
  if (f.ko) {
    if (f.fly) {
      const t = f.fly.t;
      if (t < 1.7) {
        const cvs = comp(f, 'hit');
        const w = META.fw * FS, h = META.fh * FS, ax = META.fw * AX * FS;
        const alpha = t > 1.2 ? Math.max(0, 1 - (t - 1.2) / 0.5) : 1;
        g.save(); g.globalAlpha = alpha; g.translate(f.x + f.fly.x, GROUND + f.fly.y); g.rotate(f.fly.rot); if (f.side > 0) g.scale(-1, 1);
        g.drawImage(cvs, -ax, -h, w, h);
        g.restore();
      }
      return;
    }
    const img = IMG[f.char + '_ko'];
    if (img) { const h = 250, w = img.width * h / img.height; g.save(); g.translate(f.x, GROUND); if (f.side > 0) g.scale(-1, 1); g.rotate(-Math.min(0.25, stateT * 0.4)); g.drawImage(img, -w / 2, -h, w, h); g.restore(); return; }
  }
  if (f.win && state === 'ko') {
    const prog = Math.min(1, Math.max(0, (stateT - 0.3) / 1.0));
    const laughing = prog > 0.95;
    const bounce = laughing && Math.floor(T * 5) % 2 === 1;
    const cvs = comp(f, bounce ? 'win2' : 'win1');
    const cx = f.x + (W / 2 - f.x) * prog;
    const sc = 1 + 0.25 * prog;
    const w = META.fw * FS * sc, h = META.fh * FS * sc, ax = META.fw * AX * FS * sc;
    const bobY = bounce ? -14 : 0;
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(cx, GROUND - 3, 60 * sc, 11, 0, 0, 6.3); g.fill();
    g.save(); g.translate(cx, GROUND + bobY); if (f.side > 0) g.scale(-1, 1);
    g.drawImage(cvs, -ax, -h, w, h);
    g.restore();
    if (laughing) txt('¡JA JA JA!', cx, GROUND - h - 14, 14, '#ffd400', 'center', 4);
    return;
  }
  const pose = curPose(f);
  if (pose !== f.lastPose) { f.squash = 1; f.lastPose = pose; }
  const cvs = comp(f, pose);
  const w = META.fw * FS, h = META.fh * FS, ax = META.fw * AX * FS;
  const dir = f.side < 0 ? 1 : -1;
  const kick = pose === 'attack' ? 26 : pose === 'hit' ? -22 : pose === 'block' ? -6 : 0;
  const lx = dir * (f.lunge * 12 + kick * Math.min(1, f.squash * 2 + 0.6)) + (f.hurt ? (Math.random() - 0.5) * 8 * f.hurt : 0);
  const breathe = Math.sin(T * 4.5 + (f.side > 0 ? 1.3 : 0));
  const bob = 0;
  const sx = 1 + 0.07 * f.squash + 0.006 * breathe, sy = 1 - 0.06 * f.squash + 0.012 * breathe;
  const charging = f === R && R.st === 'charge' && state === 'fight';
  // aura de carga (detrás)
  if (charging) drawSpr('fire', f.x, GROUND - h * 0.42, 1.25, T, { loop: true, alpha: 0.85, hue: 0 });
  // sombra
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(f.x + lx * 0.5, GROUND - 3, 58, 10, 0, 0, 6.3); g.fill();
  g.save(); g.translate(f.x + lx, GROUND + bob); if (f.side > 0) g.scale(-1, 1); if (pose === 'hit') g.rotate(-0.16); g.scale(sx, sy);
  if (charging) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.3 + 0.2 * Math.sin(T * 40); g.drawImage(cvs, -ax, -h, w, h); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
  g.drawImage(cvs, -ax, -h, w, h);
  if (f.hurt > 0.4) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = (f.hurt - 0.4) * 0.8; g.drawImage(cvs, -ax, -h, w, h); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
  g.restore();
  if (charging) { const hp = handPos(f); drawSpr('charge', f.x, GROUND - h * 0.45, 0.9, T, { loop: true, alpha: 0.8, hue: HUE[f.char] }); drawSpr('orb', hp.x + 30, hp.y, 0.6 + 0.6 * Math.min(1, R.stT / R.stDur), T, { loop: true, hue: HUE[f.char] }); }
  // escudo: esfera translúcida
  const shield = (f === P && P.shield > T) || (f === R && R.st === 'guard' && state === 'fight');
  if (shield) {
    const c = chestPos(f), cx = c.x + (f.side < 0 ? 22 : -22), cy = GROUND - h * 0.42, r = 128;
    g.save(); g.globalCompositeOperation = 'lighter';
    const gr = g.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
    gr.addColorStop(0, 'rgba(80,190,255,0.05)'); gr.addColorStop(0.75, 'rgba(80,190,255,0.16)'); gr.addColorStop(0.95, 'rgba(160,230,255,0.55)'); gr.addColorStop(1, 'rgba(160,230,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, 6.3); g.fill();
    g.strokeStyle = 'rgba(200,245,255,0.5)'; g.lineWidth = 2;
    for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(cx, cy, r * (0.9 - i * 0.05), r * (0.35 + 0.25 * Math.sin(T * 3 + i)), T * 0.8 + i, 0, 6.3); g.stroke(); }
    g.restore();
    drawSpr('shield', cx, cy, 1.5, T, { loop: true, alpha: 0.7 });
  }
  if (f.stun > T || (f === R && R.st === 'stun' && state === 'fight')) { for (let i = 0; i < 3; i++) { const a = T * 6 + i * 2.1; txt('*', f.x + Math.cos(a) * 30, GROUND - h * 0.86 + Math.sin(a) * 8, 16, '#ffd400', 'center', 3); } }
}
function drawCloset(f, x0) {
  const w = 250, y0 = 82;
  g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(x0, y0, w, 96);
  g.fillStyle = '#c9a15a'; g.fillRect(x0 + 8, y0 + 18, w - 16, 5);
  txt('CLÓSET ' + CHARS[f.char].short + ' · ' + f.closet.length, x0 + w / 2, y0 + 13, 8, f.closet.length ? '#ccc' : '#ff4d6d', 'center', 3);
  for (let i = 0; i < CLOSET; i++) {
    const cx = x0 + 29 + i * 48, h = f.closet[i];
    g.strokeStyle = '#ddd'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, y0 + 20); g.lineTo(cx, y0 + 28); g.moveTo(cx - 16, y0 + 36); g.lineTo(cx, y0 + 28); g.lineTo(cx + 16, y0 + 36); g.stroke();
    if (h) { const im = pieceImage({ src: f.char, look: h.look }, 1); const s = 0.42; g.drawImage(im, cx - im.width * s / 2, y0 + 32, im.width * s, im.height * s); }
  }
}
function rivalLabel() {
  if (state !== 'fight') return;
  const m = { idle: ['¡DISPARA!', '#7cff6b'], guard: ['ESCUDO', '#4db8ff'], charge: ['¡BLOQUEA!', '#ff3b5c'], stun: ['¡ATURDIDO!', '#ffd400'] }[R.st];
  const y = SCENE_Y + 34, big = R.st === 'charge' || R.st === 'stun';
  g.fillStyle = 'rgba(0,0,0,0.7)'; g.fillRect(W / 2 - 150, y - 28, 300, 42);
  txt('RIVAL: ' + m[0], W / 2, y + 2, big ? 16 : 14, (big && Math.floor(T * 10) % 2) ? '#fff' : m[1], 'center', 4);
}
function drawHUD() {
  drawHUD0();
  if (hz.glitch > 0) {
    g.globalAlpha = 0.45;
    for (let i = 0; i < 14; i++) { g.fillStyle = ['#f00', '#0f0', '#00f', '#fff', '#ff0'][i % 5]; g.fillRect(Math.random() * W, Math.random() * SCENE_Y, 40 + Math.random() * 120, 2 + Math.random() * 3); }
    g.globalAlpha = 1;
    g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(W / 2 - 205, SCENE_Y + SCENE_H - 44, 410, 30);
    txt('PANTALLAS GIGANTES CAÍDAS · SIGUE PELEANDO', W / 2, SCENE_Y + SCENE_H - 22, 9, '#ff4d6d', 'center', 3);
  }
}
function drawHUD0() {
  g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, 0, W, 78);
  txt(CHARS[P.char].name, 12, 26, 11, CHARS[P.char].aura, 'left', 4);
  txt(CHARS[R.char].name, W - 12, 26, 11, CHARS[R.char].aura, 'right', 4);
  txt(String(Math.ceil(timeLeft)), W / 2, 36, 24, timeLeft < 10 ? '#ff4d6d' : '#fff', 'center', 5);
  txt('PUNTOS ' + score, 12, 54, 9, '#7cf6ff', 'left', 3);
  txt(STAGES[stageIdx].name, W - 12, 54, 8, '#ffd400', 'right', 3);
  txt('ROBADAS ' + stolenTotal, 12, 71, 8, '#fff', 'left', 3);
  if (combo >= 3) txt('COMBO ' + combo, W - 12, 71, 8, '#7cff6b', 'right', 3);
  drawCloset(P, 10); drawCloset(R, W - 260);
}
function render() {
  g.save();
  if (shake > 0) g.translate((Math.random() - 0.5) * 16 * shake, (Math.random() - 0.5) * 16 * shake);
  if (state === 'loading') { g.fillStyle = '#12061f'; g.fillRect(0, 0, W, H); txt('CARGANDO...', W / 2, H / 2, 18, '#ff3fd2'); g.restore(); return; }
  if (state === 'title') { drawTitle(); g.restore(); return; }
  if (state === 'select') { drawSelect(); g.restore(); return; }
  if (state === 'name' || state === 'top') { drawBG('lima', 0.8, true); g.restore(); return; }
  drawBG(STAGES[stageIdx].key, 0, false, STAGES[stageIdx].bgAnchor ?? 0.5);
  drawFighter(P); drawFighter(R);
  fx.forEach(e => {
    if (e.t < 0) return;
    const p = e.t / e.d;
    if (e.k === 'spr') { drawSpr(e.name, e.x, e.y, e.sc, e.t, e); return; }
    if (e.k === 'ki') {
      const xe = e.x0 + (e.x1 - e.x0) * p, ye = e.y0 + (e.y1 - e.y0) * p;
      for (let k = perfLow ? 2 : 5; k >= 1; k--) { const q = Math.max(0, p - k * 0.06); drawSpr('orb', e.x0 + (e.x1 - e.x0) * q, e.y0 + (e.y1 - e.y0) * q, (e.small ? 0.5 : 0.9) * (1 - k * 0.12), T, { loop: true, alpha: 0.5 - k * 0.08, hue: e.hue }); }
      drawSpr('orb', xe, ye, e.small ? 0.8 : 1.5, T, { loop: true, hue: e.hue });
      drawSpr('ki', xe - (e.x1 > e.x0 ? 40 : -40), ye, 0.9, e.t, { rot: e.x1 > e.x0 ? -0.6 : 2.5, hue: e.hue, alpha: 0.8 });
      return;
    }
    if (e.k === 'ray') {
      const xe = e.x0 + (e.x1 - e.x0) * p, ye = e.y0 + (e.y1 - e.y0) * p;
      g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
      g.strokeStyle = e.col; g.lineWidth = 24; g.globalAlpha = 0.5; g.beginPath(); g.moveTo(e.x0, e.y0); g.lineTo(xe, ye); g.stroke();
      g.strokeStyle = '#fff'; g.lineWidth = 8; g.globalAlpha = 1; g.beginPath(); g.moveTo(e.x0, e.y0); g.lineTo(xe, ye); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(xe, ye, 14, 0, 6.3); g.fill(); g.restore();
    } else if (e.k === 'fly') {
      const x = e.x0 + (e.x1 - e.x0) * p, y = e.y0 + (e.y1 - e.y0) * p - Math.sin(Math.PI * p) * 90;
      const s = FS * (e.small ? 0.4 + 0.6 * p : 1);
      g.save(); g.translate(x, y); g.rotate(p * 8 * (e.x1 > e.x0 ? 1 : -1)); if (e.flip) g.scale(-1, 1);
      g.drawImage(e.img, -e.img.width * s / 2, -e.img.height * s / 2, e.img.width * s, e.img.height * s); g.restore();
    } else if (e.k === 'drop') {
      g.save(); g.globalAlpha = 1 - p;
      const dx = e.up ? p * 180 * (e.x > W / 2 ? 1 : -1) : (e.flip ? -1 : 1) * p * 40;
      g.translate(e.x + dx, e.y + (e.up ? -p * 240 + p * p * 420 : p * p * 260)); g.rotate(p * 4); if (e.flip) g.scale(-1, 1);
      g.drawImage(e.img, -e.img.width * FS / 2, -e.img.height * FS / 2, e.img.width * FS, e.img.height * FS); g.restore();
    } else if (e.k === 'shield') {
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = '#7cf6ff'; g.lineWidth = 10; g.globalAlpha = 1 - p;
      g.beginPath(); g.arc(e.x + 70, e.y, 40 + p * 60, -1.3, 1.3); g.stroke(); g.restore();
    } else if (e.k === 'rosary' || e.k === 'book') {
      const x = e.x < W / 2 ? -30 + p * (W + 60) : W + 30 - p * (W + 60), y = e.y + Math.sin(p * 9) * 30;
      g.save(); g.translate(x, y); g.rotate(p * 12);
      if (e.k === 'rosary') { g.strokeStyle = '#d9b26a'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 14, 0, 6.3); g.stroke(); g.fillStyle = '#d9b26a'; g.fillRect(-2, 12, 4, 12); g.fillRect(-6, 17, 12, 4); }
      else { g.fillStyle = e.col; g.fillRect(-14, -10, 28, 20); g.fillStyle = '#fff'; g.fillRect(-12, -8, 3, 16); }
      g.restore();
    }
  });
  parts.forEach(p => { g.globalAlpha = Math.max(0, 1 - p.t / p.life); g.fillStyle = p.col; g.fillRect(p.x, p.y, p.sz, p.sz); }); g.globalAlpha = 1;
  if (hz.dark > 0) {
    const a = 0.55 + 0.07 * Math.sin(T * 9);
    g.fillStyle = `rgba(12,0,30,${a})`; g.fillRect(0, SCENE_Y, W, SCENE_H);
    g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(W / 2 - 190, SCENE_Y + SCENE_H - 44, 380, 30);
    txt('APAGÓN EN EL CINE · SIGUE PELEANDO', W / 2, SCENE_Y + SCENE_H - 22, 10, '#ffd400', 'center', 3);
  }
  if (hz.water > 0) { g.fillStyle = `rgba(90,180,255,${hz.water * 0.45})`; g.fillRect(0, SCENE_Y, W, SCENE_H); for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(200,240,255,0.8)'; g.fillRect(Math.random() * W, SCENE_Y + Math.random() * SCENE_H, 3, 18); } }
  if (flash > 0) { g.globalAlpha = flash * 0.6; g.fillStyle = flashCol; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  if (moya.active && IMG.moya_strip) {
    const img = IMG.moya_strip, cw = img.width / MOYA_FRAMES, ch = img.height;
    const fr = Math.min(MOYA_FRAMES - 1, Math.floor(moya.t * 1000 / MOYA_MS));
    // Busto (del pecho para arriba) pegado a la esquina inferior derecha de la escena: el corte queda en el borde.
    const dh = 230, dw = cw * dh / ch, bottom = SCENE_Y + SCENE_H;
    const e = Math.min(1, moya.t / 0.25), out = Math.min(1, Math.max(0, (MOYA_DUR - moya.t) / 0.25));
    const rise = (1 - Math.min(e, out)) * (1 - Math.min(e, out)) * dh;
    g.save(); g.beginPath(); g.rect(0, SCENE_Y, W, SCENE_H); g.clip();
    g.drawImage(img, fr * cw, 0, cw, ch, W - dw * 158 / 165, bottom - dh + rise, dw, dh);
    g.restore();
  }
  if (state === 'fight' && P.stun > T) { g.fillStyle = 'rgba(90,90,100,0.35)'; g.fillRect(0, SCENE_Y, W, SCENE_H); }
  rivalLabel();
  drawHUD();
  msgs.forEach((m, i) => {
    const y = SCENE_Y + 110 + i * 36 - m.t * 30, size = m.big ? 24 : 19;
    g.globalAlpha = Math.min(1, 2 - m.t * 1.8);
    g.font = size + 'px "Press Start 2P", monospace';
    const tw = g.measureText(m.text).width;
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(W / 2 - tw / 2 - 10, y - size, tw + 20, size + 10);
    txt(m.text, W / 2, y, size, m.col, 'center', 7);
    g.globalAlpha = 1;
  });
  if (state === 'intro') {
    g.fillStyle = 'rgba(0,0,0,0.72)'; g.fillRect(0, SCENE_Y + 70, W, 170);
    if (stateT < 1.6) { txt('ESCENARIO ' + (stageIdx + 1) + ' DE 4', W / 2, SCENE_Y + 110, 13, '#7cf6ff'); txt(STAGES[stageIdx].name, W / 2, SCENE_Y + 165, STAGES[stageIdx].name.length > 14 ? 19 : 34, '#ffd400', 'center', 8); txt(STAGES[stageIdx].sub, W / 2, SCENE_Y + 210, 11, '#fff'); }
    else txt('¡A FARMEAR!', W / 2, SCENE_Y + 170, 34, '#ff3fd2');
  }
  if (state === 'ko') {
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, SCENE_Y + 80, W, 140);
    txt(result ? '¡HUACHAFO!' : '¡TE CALATEÓ!', W / 2, SCENE_Y + 150, 42, result ? '#ffd400' : '#ff4d6d', 'center', 8);
    if (stateT > 1.1) txt(result ? (stageIdx < 3 ? 'Le robaste ' + stolenStage + ' prendas' : '¡GANASTE LA MISA!') : 'Te dejaron sin ropa', W / 2, SCENE_Y + 195, 12, '#fff');
  }
  g.restore();
}
function drawTitle() {
  drawBG('lima', 0.55, true);
  const kk = IMG.kunte_win, ee = IMG.espa_win;
  if (ee) { const h = 300, w = ee.width * h / ee.height; g.drawImage(ee, 20, 740 - h, w, h); }
  if (kk) { const h = 300, w = kk.width * h / kk.height; g.save(); g.translate(W - 20, 740 - h); g.scale(-1, 1); g.drawImage(kk, 0, 0, w, h); g.restore(); }
  g.save(); g.translate(W / 2, 200); g.rotate(Math.sin(T * 2) * 0.02);
  txt('FARMEANDO', 0, -20, 40, '#ff3fd2', 'center', 9);
  txt('CRINGE', 0, 46, 54, '#ffd400', 'center', 9);
  g.restore();
  txt('Combate de huachafería', W / 2, 300, 13, '#fff', 'center', 4);
  if (Math.floor(T * 2) % 2 === 0) txt('TOCA PARA JUGAR', W / 2, 810, 18, '#7cf6ff');
  txt('RAYO: róbale la ropa y póntela', W / 2, 856, 10, '#fff', 'center', 3);
  txt('BLOQUEAR: cuando brilla en rojo', W / 2, 878, 10, '#fff', 'center', 3);
  txt('Desarrollado por MNRY · mantarraya.pe', W / 2, H - 34, 9, '#ccc', 'center', 3);
  txt('Creado y licenciado por MR', W / 2, H - 14, 8, '#999', 'center', 3);
}
const SEL = {};
function drawSelect() {
  drawBG('lima', 0.55, true);
  txt('ELIGE A TU VIEJO', W / 2, 150, 24, '#ffd400');
  ['espa', 'kunte'].forEach((c, i) => {
    const f = SEL[c]; const fcv = comp(f, 'guard');
    const x = i ? 395 : 145, sel = pick === c, w = META.fw * FS, h = META.fh * FS;
    g.save(); g.translate(x, 640 + (sel ? Math.sin(T * 6) * 4 : 0)); if (i) g.scale(-1, 1);
    if (sel) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35; for (let k = -1; k <= 1; k++) g.drawImage(fcv, -META.fw * AX * FS + k * 6, -h, w, h); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
    g.drawImage(fcv, -META.fw * AX * FS, -h, w, h); g.restore();
    txt(CHARS[c].name, x, 690, 14, sel ? CHARS[c].aura : '#fff', 'center', 4);
  });
  txt('Toca otra vez para pelear', W / 2, 800, 12, '#ccc', 'center', 3);
}

// ---------- UI ----------
function updateUI() {
  $('pad').style.display = state === 'fight' || state === 'intro' || state === 'ko' ? 'grid' : 'none';
  $('namebox').style.display = state === 'name' ? 'flex' : 'none';
  $('topbox').style.display = state === 'top' ? 'flex' : 'none';
  const menu = state === 'title' || state === 'select' || state === 'top' || state === 'name';
  $('mute').style.display = menu ? 'block' : 'none';
  $('toptitle').style.display = state === 'title' || state === 'select' ? 'block' : 'none';
  if (state === 'name') {
    $('finalscore').textContent = score.toLocaleString('es-PE');
    $('finalmsg').textContent = (result && stageIdx === 3 ? '¡Sobreviviste a la Misa del Papa!' : 'Llegaste hasta: ' + STAGES[stageIdx].name) + ' · Prendas robadas: ' + stolenTotal;
    $('nameerr').textContent = '';
  }
}
const API = /keikotaptap|mantarraya/.test(location.hostname) ? 'https://farmeando-cringe.onrender.com' : '';
async function loadTop() { try { const r = await fetch(API + '/api/top'); topList = await r.json(); } catch (e) { topList = []; } renderTop(); }
function renderTop() {
  const ol = $('toplist'); ol.innerHTML = '';
  if (!topList.length) { ol.innerHTML = '<li class="empty">Nadie ha farmeado todavía. ¡Sé el primero!</li>'; return; }
  topList.forEach((r, i) => {
    const li = document.createElement('li');
    if (myEntry && r.name === myEntry.name && r.score === myEntry.score) li.className = 'me';
    li.innerHTML = `<span class="pos">${i + 1}</span><span class="nm"></span><span class="sc">${Number(r.score).toLocaleString('es-PE')}</span>`;
    li.querySelector('.nm').textContent = r.name;
    ol.appendChild(li);
  });
}
async function submitName(e) {
  e && e.preventDefault();
  const name = $('nm').value.trim();
  if (!name) { $('nameerr').textContent = 'Escribe tu nombre primero'; return; }
  $('send').disabled = true;
  try {
    const r = await fetch(API + '/api/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, score, fighter: pick, stage: stageIdx + 1, dur: runSecs }) });
    const d = await r.json();
    if (!r.ok) { $('nameerr').textContent = d.error || 'No se pudo guardar'; $('send').disabled = false; return; }
    myEntry = { name: name.slice(0, 12), score }; topList = d.top; renderTop();
    try { localStorage.setItem('fc_name', name); } catch (_) { }
    setState('top');
    if (musicOn && userStarted) { try { RANK_SND.currentTime = 0; RANK_SND.play().catch(() => { }); } catch (_) { } }
    setTimeout(() => { if (state === 'top') $('support').hidden = false; }, 1800);
  } catch (err) { $('nameerr').textContent = 'Sin conexión. Intenta de nuevo.'; }
  $('send').disabled = false;
}
function shareWA() {
  const t = `Le robé ${stolenTotal} prendas y saqué ${score.toLocaleString('es-PE')} puntos en FARMEANDO CRINGE. ¿Me ganas? ${location.origin}`;
  window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank');
}

// ---------- Entrada ----------
function canvasPoint(ev) { const r = cv.getBoundingClientRect(); return { x: (ev.clientX - r.left) * W / r.width, y: (ev.clientY - r.top) * H / r.height }; }
function startAudio() { audioInit(); if (AC && AC.state === 'suspended') AC.resume(); if (!userStarted) { userStarted = true; playMusic(curMusic || 'title'); } }
cv.addEventListener('pointerdown', ev => {
  startAudio();
  if (state === 'title') { setState('select'); playMusic('title'); SFX.blip(); return; }
  if (state === 'select') {
    const p = canvasPoint(ev); if (p.y < 250) return;
    const c = p.x < W / 2 ? 'espa' : 'kunte';
    if (pick === c) startRun(); else { pick = c; SFX.blip(); }
  }
});
function bindBtn(id, fn) { const b = $(id); b.addEventListener('pointerdown', ev => { ev.preventDefault(); startAudio(); fn(); b.classList.add('on'); setTimeout(() => b.classList.remove('on'), 110); }); }
bindBtn('btnRay', rayo); bindBtn('btnBlock', bloquear);
document.addEventListener('keydown', ev => {
  if (state === 'name') return;
  const k = ev.key.toLowerCase();
  if (k === 'arrowright' || k === 'l' || k === 'k') { if (state === 'select') pick = 'kunte'; else rayo(); }
  if (k === 'arrowleft' || k === 'a' || k === 's') { if (state === 'select') pick = 'espa'; else bloquear(); }
  if (k === ' ' || k === 'enter') { ev.preventDefault(); startAudio(); if (state === 'title') setState('select'); else if (state === 'select') startRun(); }
});
$('namebox').addEventListener('submit', submitName);
$('again').addEventListener('click', () => { myEntry = null; setState('select'); playMusic('title'); });
$('share').addEventListener('click', shareWA);
$('mute').addEventListener('click', () => { musicOn = !musicOn; sfxMute = !musicOn; $('mute').textContent = musicOn ? '♪ ON' : '♪ OFF'; if (musicOn) { userStarted = true; const k = curMusic; curMusic = null; playMusic(k || 'title'); if (crowdAud && state === 'fight' && STAGES[stageIdx].key === 'misa') crowdAud.play().catch(() => { }); } else { Object.values(MUS).forEach(a => a.pause()); if (crowdAud) crowdAud.pause(); } });
$('toptitle').addEventListener('click', () => { showTop(); });
// Cierre: Yape y MNRY
$('yapeBtn').addEventListener('click', () => { $('support').hidden = false; });
$('supCl').addEventListener('click', () => { $('support').hidden = true; });
async function saveQR() {
  const b = $('supSave');
  try {
    const blob = await (await fetch('assets/yape-qr.png')).blob(), file = new File([blob], 'yape-farmeando-cringe.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] }) && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) await navigator.share({ files: [file] });
    else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'yape-farmeando-cringe.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
    b.textContent = '¡LISTO!';
  } catch (e) { b.textContent = 'TOMA UNA CAPTURA'; }
  setTimeout(() => { b.textContent = 'GUARDAR QR'; }, 2200);
}
$('supSave').addEventListener('click', saveQR); $('supQr').addEventListener('click', saveQR);
$('mnryBtn').addEventListener('click', () => { try { window.open('https://mantarraya.pe', '_blank', 'noopener'); } catch (e) { } });

function fit() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const s = Math.min(vw / W, vh / H);
  const wrap = $('wrap'); wrap.style.width = W * s + 'px'; wrap.style.height = H * s + 'px'; wrap.style.setProperty('--s', s);
}
window.addEventListener('resize', fit);
// Límite de ~60 cuadros (en pantallas de 90/120 Hz se hacía el doble de trabajo) y modo ligero si el teléfono va lento.
let perfLow = false, perfAcc = 0, perfN = 0;
function loop(now) {
  const raw = (now - last) / 1000 || 0;
  if (raw < 0.0145) { requestAnimationFrame(loop); return; }
  const dt = Math.min(0.05, raw); last = now;
  if (state === 'fight') { perfAcc += raw; if (++perfN >= 90) { perfLow = perfAcc / perfN > 0.026; perfAcc = 0; perfN = 0; } }
  update(dt); render(); requestAnimationFrame(loop);
}

(async function boot() {
  fit(); requestAnimationFrame(loop); setTimeout(prewarmTints, 1500);
  try { META = await (await fetch('assets/meta.json?v=14')).json(); } catch (e) { }
  await Promise.all([
    ...['kunte', 'espa'].flatMap(c => ['guard', 'attack', 'block', 'hit', 'win1', 'win2'].map(p => loadImg(c + '_' + p, 'assets/' + c + '_' + p + '.png?v=14'))),
    ...['kunte', 'espa'].flatMap(c => Object.keys(SILO_POSES).flatMap(pose => [
      ...['sonrisa', 'grito', 'serio', 'sonrisilla'].map(fn => loadImg(c + '_' + pose + '_face_' + fn, 'assets/silo/' + c + '_' + pose + '_face_' + fn + '.png?v=21')),
      ...[0, 1, 2, 3, 4].flatMap(i => [loadImg(c + '_' + pose + '_saco_' + i, 'assets/silo/' + c + '_' + pose + '_saco_' + i + '.png?v=21'), loadImg(c + '_' + pose + '_panta_' + i, 'assets/silo/' + c + '_' + pose + '_panta_' + i + '.png?v=21')])
    ])),
    fetch('assets/fx/fx.json?v=7').then(r => r.json()).then(j => { FXM = j; return Promise.all(Object.keys(j).map(k => loadImg('fx_' + k, 'assets/fx/' + k + '.png?v=7'))); }).catch(() => { }),
    loadImg('kunte_ko', 'assets/kunte_ko.png'), loadImg('espa_ko', 'assets/espa_ko.png'),
    loadImg('moya_strip', 'assets/fx/moya.png?v=1'),
    loadImg('kunte_win', 'assets/kunte_win.png'), loadImg('espa_win', 'assets/espa_win.png'),
    loadImg('bg_lima', 'assets/bg_lima.jpg?v=14'),
    ...STAGES.map(s => loadImg('bg_' + s.key, 'assets/bg_' + s.key + '.jpg')),
    document.fonts ? document.fonts.load('20px "Press Start 2P"') : null,
  ]);
  SEL.kunte = newFighter('kunte', 1, 1); SEL.espa = newFighter('espa', -1, 1);
  window.__fc = {
    ko: () => { if (R) { R.slots = [null, null, null, null]; R.closet = []; } }, st: () => R && R.st, state: () => state,
    swap: () => { if (P && R) { [1, 2, 3].forEach(s => { const t = P.slots[s]; P.slots[s] = R.slots[s]; R.slots[s] = t; }); P.dirty = true; R.dirty = true; } },
    pose: (who, p, d) => { const f = who === 'P' ? P : R; if (f) setPose(f, p, d || 3); },
  };
  try { const n = localStorage.getItem('fc_name'); if (n) $('nm').value = n; } catch (_) { }
  setState('title'); loadTop();
})();
})();
