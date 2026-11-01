// Simulador de balance: juega miles de partidas con bots de distintas estrategias
// usando el mismo CFG del juego (game/game.html).
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
const CFG = JSON.parse(html.match(/<script type="application\/json" id="cfg">([\s\S]*?)<\/script>/)[1]);
if (process.env.CFG_PATCH) Object.assign(CFG, JSON.parse(process.env.CFG_PATCH));
const rand = (a, b) => a + Math.random() * (b - a), pick = a => a[(Math.random() * a.length) | 0];
const SLOT = { minister: 'left', journalist: 'right', congress: 'modal', emergency: 'modal', advisor: 'modal', protest: 'bottom', documents: 'docs', internet: 'net' };
const multFor = c => { let m = 1; for (const [min, v] of CFG.multipliers) if (c >= min) m = v; return m; };

function play(strategy, tapRate = 7, skill = .9, threshold = 55) {
  const g = { t: 0, likes: 0, viewers: CFG.viewers0, maxV: CFG.viewers0, pending: CFG.pending0, combo: 0, lastTap: -9, acc: 0, bonus: {}, busyUntil: 0, blockUntil: 0, netUntil: 0, events: [], next: CFG.firstEvent, nextTap: 0, ignored: 0, last: null };
  const dt = 1 / 60;
  const govern = () => strategy === 'govern' || (strategy === 'smart' && g.pending >= threshold);
  const queue = []; // acciones pendientes del bot: {at, fn}
  while (g.t < 400) {
    g.t += dt;
    const ph = CFG.phases.reduce((p, x, i) => g.t >= x.start ? i : p, 0), P = CFG.phases[ph];
    // spawn
    if (g.t >= g.next) {
      const busy = new Set(g.events.map(e => SLOT[e.id]));
      let opts = P.events.filter(id => !busy.has(SLOT[id]) && id !== g.last);
      if (g.events.length < P.max && opts.length) {
        const id = pick(opts); g.last = id; const c = CFG.events[id];
        const e = { id, end: g.t + 99 }; g.events.push(e);
        // el bot reacciona después de un tiempo humano y luego "trabaja" en el evento
        const react = rand(.35, .7), start = Math.max(g.t, g.busyUntil) + react;
        let work = 0, out;
        const ok = Math.random() < skill;
        if (id === 'minister') { work = .5; out = () => { if (!ok) { g.pending += c.failPending; g.blockUntil = Math.max(g.blockUntil, g.t + c.failBlock * .5); g.ignored++; } }; }
        if (id === 'protest') { work = .9; out = () => { if (!ok) { g.viewers -= Math.max(CFG.audienceFailMin, g.viewers * c.failAudiencePct); g.pending += c.failPending; g.ignored++; } }; }
        if (id === 'journalist') { work = c.hold + .2; out = () => { if (!ok) { g.pending += c.failPending; g.blockUntil = g.t + c.failBlock; g.ignored++; } }; }
        if (id === 'internet') { work = 2.2; g.netUntil = start + work; out = () => { if (!ok) g.viewers -= Math.max(CFG.audienceFailMin, g.viewers * c.failAudiencePct); }; }
        if (id === 'documents') {
          const n = ph >= 3 ? c.countLate : c.count; work = n * .6;
          out = () => { if (govern()) { g.blockUntil = Math.max(g.t, g.blockUntil) + n * c.signTime; g.pending += n * c.signPending; } else { g.pending += n * c.laterPending; g.ignored++; } };
        }
        if (['congress', 'emergency', 'advisor'].includes(id)) {
          work = .3;
          const [blk, good, bad] = id === 'congress' ? [c.answerBlock, c.answerPending, c.rejectPending] : id === 'emergency' ? [c.attendBlock, c.attendPending, c.ignorePending] : [c.resolveBlock, c.resolvePending, c.delegatePending];
          out = () => { if (govern()) { g.blockUntil = g.t + blk; g.pending += good; } else { g.pending += bad; g.ignored++; } };
        }
        g.busyUntil = start + work;
        queue.push({ at: start + work, fn: () => { out(); e.end = g.t; } });
        g.next = g.t + rand(P.interval[0], P.interval[1]) * Math.max(CFG.escalation.minIntervalScale, 1 - CFG.escalation.intervalShrink * Math.max(0, g.t - CFG.escalation.start));
      } else g.next = g.t + .6;
    }
    for (let i = queue.length - 1; i >= 0; i--) if (g.t >= queue[i].at) { queue[i].fn(); queue.splice(i, 1); }
    g.events = g.events.filter(e => e.end > g.t);
    // tap
    const canTap = g.t >= g.busyUntil && g.t >= g.blockUntil && g.t >= g.netUntil;
    if (canTap && g.t >= g.nextTap) {
      g.nextTap = g.t + 1 / tapRate * rand(.8, 1.2);
      if (g.t - g.lastTap > CFG.comboTimeout) { g.combo = 0; g.bonus = {}; }
      g.combo++; const m = multFor(g.combo); g.likes += m; g.acc += m;
      while (g.acc >= CFG.likesPerViewer) { g.viewers++; g.acc -= CFG.likesPerViewer; }
      for (const k in CFG.comboBonus) if (g.combo >= +k && !g.bonus[k]) { g.bonus[k] = 1; g.viewers += CFG.comboBonus[k]; }
      g.lastTap = g.t;
    }
    if (g.t - g.lastTap > CFG.inactivityDelay && g.t > CFG.inactivityDelay) g.viewers -= (CFG.inactivityLoss + CFG.inactivityLossPct[ph] * g.viewers) * dt;
    g.pending = Math.min(100, Math.max(0, g.pending + (P.autoPending + CFG.escalation.pendingAccel * Math.max(0, g.t - CFG.escalation.start)) * dt));
    g.maxV = Math.max(g.maxV, g.viewers);
    if (g.pending >= 100) return { end: 'gov', t: g.t, likes: g.likes, maxV: g.maxV, ign: g.ignored };
    if (g.viewers <= 0) return { end: 'aud', t: g.t, likes: g.likes, maxV: g.maxV, ign: g.ignored };
  }
  return { end: 'timeout', t: g.t, likes: g.likes, maxV: g.maxV, ign: g.ignored };
}
const med = a => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
const runs = +process.env.RUNS || 400;
const rows = [];
for (const [name, args] of [['live', ['live']], ['govern', ['govern']], ['smart-45', ['smart', 7, .9, 45]], ['smart-60', ['smart', 7, .9, 60]], ['smart-75', ['smart', 7, .9, 75]], ['live·torpe', ['live', 5, .7]], ['smart·torpe', ['smart', 5, .7, 60]]]) {
  const r = Array.from({ length: runs }, () => play(...args));
  const ends = r.reduce((o, x) => (o[x.end] = (o[x.end] || 0) + 1, o), {});
  rows.push({ bot: name, dur_s: med(r.map(x => x.t)).toFixed(0), likes: med(r.map(x => x.likes)), maxEsp: med(r.map(x => x.maxV)).toFixed(0), fin_gob: ((ends.gov || 0) / runs * 100).toFixed(0) + '%', fin_aud: ((ends.aud || 0) / runs * 100).toFixed(0) + '%', otro: ends.timeout || 0 });
}
console.table(rows);
