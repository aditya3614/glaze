// Synthesizes the 40s, 120 BPM Glaze promo track, synced to the visual timeline.
//   node synth.mjs <disco|marimba|anthem|house>  -> music-<style>.wav
// Every style shares the same form and the picture-synced sound effects; only the band changes.
import { writeFileSync } from 'node:fs';

const SR = 48000, DUR = 40.0, N = Math.round(SR * DUR);
const bus = () => [new Float32Array(N), new Float32Array(N)];
const drums = bus(), bass = bus(), music = bus(), fx = bus(), verbSend = bus(), delaySend = bus();

let seed = 1234567;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const noise = () => rnd() * 2 - 1;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

function add(b, i, l, r) { if (i >= 0 && i < N) { b[0][i] += l; b[1][i] += r; } }
function panLR(p) { const a = (p + 1) * Math.PI / 4; return [Math.cos(a), Math.sin(a)]; }

// biquad
function biquad(type, f, q) {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0, b0, b1, b2, a1, a2;
  const set = (f, q) => {
    f = clamp(f, 20, SR * 0.45);
    const w = 2 * Math.PI * f / SR, cs = Math.cos(w), al = Math.sin(w) / (2 * q);
    let B0, B1, B2; const A0 = 1 + al;
    if (type === 'lp') { B0 = (1 - cs) / 2; B1 = 1 - cs; B2 = B0; }
    else if (type === 'hp') { B0 = (1 + cs) / 2; B1 = -(1 + cs); B2 = B0; }
    else { B0 = al; B1 = 0; B2 = -al; }
    b0 = B0 / A0; b1 = B1 / A0; b2 = B2 / A0; a1 = -2 * cs / A0; a2 = (1 - al) / A0;
  };
  set(f, q);
  const fn = (x) => { const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
  fn.set = set;
  return fn;
}

// ---------------------------------------------------------------- instruments
function kick(t, vel = 1, soft = false) {
  const s0 = Math.round(t * SR), len = Math.round(0.5 * SR);
  let ph = 0;
  const lp = biquad('lp', soft ? 900 : 8000, 0.7);
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    const f = 44 + (soft ? 90 : 150) * Math.exp(-tt * 30);
    ph += 2 * Math.PI * f / SR;
    let v = Math.sin(ph) * Math.exp(-tt * (soft ? 9 : 6.5));
    if (!soft && i < 240) v += noise() * 0.5 * (1 - i / 240);
    v = Math.tanh(v * 1.6) * 0.95 * vel;
    v = lp(v);
    add(drums, s0 + i, v, v);
  }
}
function clap(t, vel = 1) {
  const s0 = Math.round(t * SR), len = Math.round(0.35 * SR);
  const bp = biquad('bp', 1300, 1.1), hp = biquad('hp', 600, 0.7);
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    let env = 0;
    for (const o of [0, 0.011, 0.022]) if (tt >= o) env = Math.max(env, Math.exp(-(tt - o) * 180));
    env = Math.max(env, tt > 0.022 ? 0.55 * Math.exp(-(tt - 0.022) * 16) : 0);
    const v = hp(bp(noise())) * env * 1.4 * vel;
    add(drums, s0 + i, v * 0.9, v);
    add(verbSend, s0 + i, v * 0.35, v * 0.35);
  }
}
function snare(t, vel = 1) {
  const s0 = Math.round(t * SR), len = Math.round(0.2 * SR);
  const bp = biquad('bp', 2200, 0.8);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    ph += 2 * Math.PI * 190 / SR;
    const v = (bp(noise()) * 1.1 * Math.exp(-tt * 28) + Math.sin(ph) * 0.4 * Math.exp(-tt * 40)) * vel;
    add(drums, s0 + i, v, v);
    add(verbSend, s0 + i, v * 0.2, v * 0.2);
  }
}
function hat(t, vel = 1, open = false, pan = 0) {
  const s0 = Math.round(t * SR), len = Math.round((open ? 0.3 : 0.07) * SR);
  const hp = biquad('hp', 7500, 0.8), hp2 = biquad('hp', 9000, 0.7);
  const [l, r] = panLR(pan);
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    const v = hp2(hp(noise())) * Math.exp(-tt * (open ? 11 : 70)) * 0.5 * vel;
    add(drums, s0 + i, v * l, v * r);
  }
}
function crash(t, vel = 1, dur = 2.2) {
  const s0 = Math.round(t * SR), len = Math.round(dur * SR);
  const hp = biquad('hp', 3500, 0.6), bp = biquad('bp', 6500, 0.5);
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    const e = Math.exp(-tt * 2.2) * (1 - Math.exp(-tt * 400));
    const a = hp(noise()), b = bp(noise());
    add(fx, s0 + i, (a * 0.35 + b * 0.25) * e * vel, (a * 0.3 + b * 0.3) * e * vel);
    add(verbSend, s0 + i, a * 0.12 * e * vel, a * 0.12 * e * vel);
  }
}
function revCymbal(tEnd, dur = 1.0, vel = 1) {
  const s0 = Math.round((tEnd - dur) * SR), len = Math.round(dur * SR);
  const hp = biquad('hp', 3000, 0.6);
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    const e = Math.pow(tt / dur, 3.2);
    const v = hp(noise()) * e * 0.45 * vel;
    add(fx, s0 + i, v, v * 0.9);
  }
}
function boom(t, vel = 1, dur = 1.8) {
  const s0 = Math.round(t * SR), len = Math.round(dur * SR);
  let ph = 0;
  const lp = biquad('lp', 400, 0.7);
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    const f = 30 + 55 * Math.exp(-tt * 6);
    ph += 2 * Math.PI * f / SR;
    let v = Math.sin(ph) * Math.exp(-tt * 2.4) * 1.1;
    v += lp(noise()) * Math.exp(-tt * 9) * 0.9;
    v = Math.tanh(v * 1.4) * vel * 0.85;
    add(fx, s0 + i, v, v);
  }
}
function riser(t0, t1, vel = 1, f0 = 300, f1 = 9000) {
  const s0 = Math.round(t0 * SR), len = Math.round((t1 - t0) * SR);
  const bp = biquad('bp', f0, 2.5);
  let ph = 0, ph2 = 0;
  for (let i = 0; i < len; i++) {
    const p = i / len;
    if (i % 32 === 0) bp.set(f0 * Math.pow(f1 / f0, p * p), 2.5);
    const f = 180 * Math.pow(5, p * p);
    ph += 2 * Math.PI * f / SR; ph2 += 2 * Math.PI * f * 1.005 / SR;
    const saw = ((ph / Math.PI) % 2 - 1) * 0.5 + ((ph2 / Math.PI) % 2 - 1) * 0.5;
    const e = Math.pow(p, 2.2);
    const v = (bp(noise()) * 1.3 + saw * 0.08) * e * vel;
    const [l, r] = panLR(Math.sin(p * 14) * 0.4);
    add(fx, s0 + i, v * l, v * r);
    add(verbSend, s0 + i, v * 0.3, v * 0.3);
  }
}
function whoosh(t0, t1, vel = 1, up = true, panFrom = -0.8, panTo = 0.8) {
  const s0 = Math.round(t0 * SR), len = Math.round((t1 - t0) * SR);
  const bp = biquad('bp', 400, 1.6);
  for (let i = 0; i < len; i++) {
    const p = i / len;
    if (i % 32 === 0) bp.set(up ? 300 * Math.pow(20, p) : 5000 * Math.pow(1 / 12, p), 1.6);
    const e = Math.pow(Math.sin(Math.PI * Math.pow(p, up ? 0.8 : 0.5)), 2);
    const v = bp(noise()) * e * 1.2 * vel;
    const [l, r] = panLR(panFrom + (panTo - panFrom) * p);
    add(fx, s0 + i, v * l, v * r);
    add(verbSend, s0 + i, v * 0.2, v * 0.2);
  }
}
function blip(t, midi, vel = 1, pan = 0, dec = 18) {
  const s0 = Math.round(t * SR), len = Math.round(0.35 * SR);
  const f = mtof(midi);
  const [l, r] = panLR(pan);
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    const m = Math.sin(2 * Math.PI * f * 2 * tt) * 2.2 * Math.exp(-tt * 30);
    const v = Math.sin(2 * Math.PI * f * tt + m) * Math.exp(-tt * dec) * 0.22 * vel;
    add(music, s0 + i, v * l, v * r);
    add(delaySend, s0 + i, v * 0.45, v * 0.45);
    add(verbSend, s0 + i, v * 0.3, v * 0.3);
  }
}
function bell(t, midi, vel = 1, pan = 0, dur = 3) {
  const s0 = Math.round(t * SR), len = Math.round(dur * SR);
  const f = mtof(midi);
  const [l, r] = panLR(pan);
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    const m = Math.sin(2 * Math.PI * f * 3.5 * tt) * 3 * Math.exp(-tt * 5);
    const v = Math.sin(2 * Math.PI * f * tt + m) * Math.exp(-tt * 2.2) * 0.14 * vel * (1 - Math.exp(-tt * 800));
    add(music, s0 + i, v * l, v * r);
    add(verbSend, s0 + i, v * 0.6, v * 0.6);
  }
}
function tick(t, vel = 1, pan = 0) {
  const s0 = Math.round(t * SR), len = Math.round(0.02 * SR);
  const hp = biquad('hp', 2500, 0.7);
  const [l, r] = panLR(pan);
  for (let i = 0; i < len; i++) {
    const v = hp(noise()) * Math.exp(-i / SR * 350) * 0.5 * vel;
    add(fx, s0 + i, v * l, v * r);
  }
}
// supersaw voice
function saw(t, dur, midi, vel, opts = {}) {
  const { voices = 5, detune = 0.012, cut0 = 5000, cut1 = 900, cutDecay = 8, att = 0.003, rel = 0.08, busL = music, pan = 0, send = 0.2, dsend = 0 } = opts;
  const s0 = Math.round(t * SR), len = Math.round((dur + rel) * SR);
  const f = mtof(midi);
  const phs = Array.from({ length: voices }, () => rnd() * 2);
  const inc = phs.map((_, k) => 2 * f * (1 + detune * (k - (voices - 1) / 2) / ((voices - 1) / 2 || 1)) / SR);
  const lpL = biquad('lp', cut0, 0.8), lpR = biquad('lp', cut0, 0.8);
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    if (i % 32 === 0) { const c = cut1 + (cut0 - cut1) * Math.exp(-tt * cutDecay); lpL.set(c, 0.8); lpR.set(c, 0.8); }
    let l = 0, r = 0;
    for (let k = 0; k < voices; k++) {
      phs[k] += inc[k]; if (phs[k] > 1) phs[k] -= 2;
      const w = (k / (voices - 1 || 1)) * 2 - 1;
      l += phs[k] * (1 - w * 0.6); r += phs[k] * (1 + w * 0.6);
    }
    let env = Math.min(1, tt / att);
    if (tt > dur) env *= Math.max(0, 1 - (tt - dur) / rel);
    const g = env * vel / voices;
    const [pl, pr] = panLR(pan);
    const L = lpL(l * g) * pl, R = lpR(r * g) * pr;
    add(busL, s0 + i, L, R);
    if (send) add(verbSend, s0 + i, L * send, R * send);
    if (dsend) add(delaySend, s0 + i, L * dsend, R * dsend);
  }
}
function bassNote(t, dur, midi, vel = 1) {
  const s0 = Math.round(t * SR), len = Math.round((dur + 0.03) * SR);
  const f = mtof(midi);
  let ph = 0, ph2 = 0;
  const lp = biquad('lp', 600, 1.2);
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    if (i % 32 === 0) lp.set(220 + 900 * Math.exp(-tt * 14), 1.2);
    ph += f / SR; ph2 += f / 2 / SR;
    const sawv = (ph % 1) * 2 - 1;
    let env = Math.min(1, tt / 0.004) * (tt > dur ? Math.max(0, 1 - (tt - dur) / 0.03) : 1);
    const v = (lp(sawv) * 0.55 + Math.sin(2 * Math.PI * ph2) * 0.6) * env * vel;
    add(bass, s0 + i, Math.tanh(v * 1.3) * 0.7, Math.tanh(v * 1.3) * 0.7);
  }
}

// ---------------------------------------------------------------- extra voices
/** water droplet: a fast upward sine chirp */
function plip(t, vel = 1, f0 = 500, f1 = 2200) {
  const s0 = Math.round(t * SR), len = Math.round(0.14 * SR);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    ph += 2 * Math.PI * (f0 * Math.pow(f1 / f0, Math.min(1, tt / 0.05))) / SR;
    const v = Math.sin(ph) * Math.exp(-tt * 30) * 0.5 * vel;
    add(fx, s0 + i, v, v);
    add(verbSend, s0 + i, v * 0.8, v * 0.8);
  }
}
/** a dull, low "thunk" for the solid redactions */
function thunk(t, vel = 1, pan = 0) {
  const s0 = Math.round(t * SR), len = Math.round(0.12 * SR);
  let ph = 0;
  const [l, r] = panLR(pan);
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    ph += 2 * Math.PI * (90 + 160 * Math.exp(-tt * 60)) / SR;
    const v = (Math.sin(ph) * Math.exp(-tt * 38) + (i < 90 ? noise() * 0.4 * (1 - i / 90) : 0)) * 0.8 * vel;
    add(fx, s0 + i, v * l, v * r);
  }
}
/** marker-drag texture: band-passed noise whose pitch follows the drag */
function scratch(t0, t1, vel = 1, f0 = 900, f1 = 2600) {
  const s0 = Math.round(t0 * SR), len = Math.round((t1 - t0) * SR);
  const bp = biquad('bp', f0, 3);
  for (let i = 0; i < len; i++) {
    const p = i / len;
    if (i % 32 === 0) bp.set(f0 * Math.pow(f1 / f0, p), 3);
    const e = Math.sin(Math.PI * Math.min(1, p * 1.1)) ** 0.6 * (0.7 + 0.3 * Math.sin(i / SR * 2 * Math.PI * 23));
    const v = bp(noise()) * e * 0.9 * vel;
    add(fx, s0 + i, v * 0.8, v);
  }
}
/** tape stop: a sagging low tone */
function tapeStop(t0, dur, midi) {
  const s0 = Math.round(t0 * SR), len = Math.round(dur * SR);
  let ph = 0;
  const lp = biquad('lp', 1200, 0.7);
  for (let i = 0; i < len; i++) {
    const p = i / len;
    ph += mtof(midi) * Math.pow(1 - p, 1.6) / SR;
    const v = lp(((ph % 1) * 2 - 1) * 0.5 + Math.sin(2 * Math.PI * ph) * 0.5) * (1 - p) * 0.55;
    add(bass, s0 + i, v, v);
  }
}

// ---------------------------------------------------------------- more instruments
function rhodes(t, dur, midi, vel = 1, pan = 0) {
  const s0 = Math.round(t * SR), rel = 0.25, len = Math.round((dur + rel) * SR);
  const f = mtof(midi), [l, r] = panLR(pan);
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    const m = Math.sin(2 * Math.PI * f * tt) * (1.8 * Math.exp(-tt * 7) + 0.35);
    let v = Math.sin(2 * Math.PI * f * tt + m) * Math.exp(-tt * 1.6) + Math.sin(2 * Math.PI * f * 14 * tt) * 0.06 * Math.exp(-tt * 40);
    v *= Math.min(1, tt / 0.002) * (tt > dur ? Math.max(0, 1 - (tt - dur) / rel) : 1) * 0.2 * vel;
    const tr = Math.sin(2 * Math.PI * 4.5 * tt) * 0.3;
    add(music, s0 + i, v * l * (1 + tr), v * r * (1 - tr));
    add(verbSend, s0 + i, v * 0.25, v * 0.25);
    add(delaySend, s0 + i, v * 0.12, v * 0.12);
  }
}
function marimba(t, midi, vel = 1, pan = 0, dec = 5) {
  const s0 = Math.round(t * SR), len = Math.round(0.9 * SR);
  const f = mtof(midi), [l, r] = panLR(pan);
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    let v = Math.sin(2 * Math.PI * f * tt) * Math.exp(-tt * dec) + 0.35 * Math.sin(2 * Math.PI * f * 3.93 * tt) * Math.exp(-tt * 22) + 0.12 * Math.sin(2 * Math.PI * f * 9.2 * tt) * Math.exp(-tt * 60);
    if (i < 150) v += noise() * 0.25 * (1 - i / 150);
    v *= Math.min(1, tt / 0.001) * 0.3 * vel;
    add(music, s0 + i, v * l, v * r);
    add(verbSend, s0 + i, v * 0.3, v * 0.3);
    add(delaySend, s0 + i, v * 0.15, v * 0.15);
  }
}
function piano(t, dur, midi, vel = 1, pan = 0) {
  const s0 = Math.round(t * SR), rel = 0.18, len = Math.round((dur + rel) * SR);
  const f = mtof(midi), [l, r] = panLR(pan);
  const hi = 1 + Math.max(0, midi - 60) / 30;
  const P = Array.from({ length: 9 }, (_, k) => { const n = k + 1; return { f: f * n * Math.sqrt(1 + 0.00035 * n * n), a: Math.pow(n, -1.15) * (n > 1 ? 0.3 + 0.7 * vel : 1), d: (0.9 + n * 0.55) * hi }; });
  const lp = biquad('lp', 2500, 0.7);
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    let v = 0;
    for (const p of P) { if (p.f > SR * 0.45) continue; v += Math.sin(2 * Math.PI * p.f * tt) * p.a * Math.exp(-tt * p.d); }
    if (i < 400) v += lp(noise()) * 0.5 * (1 - i / 400);
    v *= Math.min(1, tt / 0.002) * (tt > dur ? Math.max(0, 1 - (tt - dur) / rel) : 1) * 0.13 * vel;
    add(music, s0 + i, v * l, v * r);
    add(verbSend, s0 + i, v * 0.3, v * 0.3);
  }
}
function whistle(t, dur, midi, vel = 1, pan = 0) {
  const s0 = Math.round(t * SR), rel = 0.07, len = Math.round((dur + rel) * SR);
  const f = mtof(midi), [l, r] = panLR(pan);
  const hp = biquad('hp', 3000, 0.7);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    const fv = f * (0.97 + 0.03 * Math.min(1, tt / 0.04)) * (1 + 0.013 * Math.sin(2 * Math.PI * 5.5 * tt) * Math.min(1, tt / 0.15));
    ph += 2 * Math.PI * fv / SR;
    let v = Math.sin(ph) + 0.08 * Math.sin(2 * ph) + hp(noise()) * 0.05;
    v *= Math.min(1, tt / 0.02) * (tt > dur ? Math.max(0, 1 - (tt - dur) / rel) : 1) * 0.2 * vel;
    add(music, s0 + i, v * l, v * r);
    add(verbSend, s0 + i, v * 0.3, v * 0.3);
    add(delaySend, s0 + i, v * 0.3, v * 0.3);
  }
}
function funkBass(t, dur, midi, vel = 1) {
  const s0 = Math.round(t * SR), len = Math.round((dur + 0.02) * SR);
  const f = mtof(midi), lp = biquad('lp', 2000, 5);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    if (i % 16 === 0) lp.set(260 + 2400 * Math.exp(-tt * 28), 5);
    ph += f / SR;
    const x = ((ph % 1) * 2 - 1) * 0.6 + (ph % 1 < 0.5 ? 0.4 : -0.4);
    const env = Math.min(1, tt / 0.003) * (tt > dur ? Math.max(0, 1 - (tt - dur) / 0.02) : 1);
    const v = Math.tanh(lp(x) * 1.8 + Math.sin(2 * Math.PI * f * tt) * 0.5) * env * 0.6 * vel;
    add(bass, s0 + i, v, v);
  }
}
function subBass(t, dur, midi, vel = 1) {
  const s0 = Math.round(t * SR), len = Math.round((dur + 0.04) * SR);
  const f = mtof(midi);
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    const env = Math.min(1, tt / 0.005) * (tt > dur ? Math.max(0, 1 - (tt - dur) / 0.04) : 1);
    const v = (Math.sin(2 * Math.PI * f * tt) + 0.2 * Math.sin(4 * Math.PI * f * tt)) * env * 0.75 * vel;
    add(bass, s0 + i, v, v);
  }
}
function reese(t, dur, midi, vel = 1) {
  const s0 = Math.round(t * SR), len = Math.round((dur + 0.05) * SR);
  const f = mtof(midi), lpL = biquad('lp', 750, 0.9), lpR = biquad('lp', 750, 0.9);
  let a = 0, b = 0.37;
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    a += f * 1.0035 / SR; b += f * 0.9965 / SR;
    const env = Math.min(1, tt / 0.01) * (tt > dur ? Math.max(0, 1 - (tt - dur) / 0.05) : 1);
    const sa = (a % 1) * 2 - 1, sb = (b % 1) * 2 - 1, sub = Math.sin(2 * Math.PI * f * 0.5 * tt);
    add(bass, s0 + i, Math.tanh((lpL(sa) * 0.5 + sub * 0.6) * 1.4) * env * 0.6 * vel, Math.tanh((lpR(sb) * 0.5 + sub * 0.6) * 1.4) * env * 0.6 * vel);
  }
}
const VOWELS = { a: [[800, 1], [1150, 0.6], [2900, 0.25]], o: [[450, 1], [800, 0.55], [2830, 0.2]], e: [[400, 1], [1900, 0.5], [2600, 0.25]], u: [[330, 1], [700, 0.35], [2500, 0.12]] };
/** vocal chop: a detuned saw through three formant filters */
function vox(t, dur, midi, vel = 1, vowel = 'a', pan = 0) {
  const s0 = Math.round(t * SR), rel = 0.08, len = Math.round((dur + rel) * SR);
  const f = mtof(midi), [l, r] = panLR(pan);
  const fs = VOWELS[vowel].map(([fr, g]) => ({ bp: biquad('bp', fr, 7), g }));
  let a = 0, b = 0.5;
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    const fv = f * (0.94 + 0.06 * Math.min(1, tt / 0.035)) * (1 + 0.008 * Math.sin(2 * Math.PI * 5.8 * tt));
    a += fv / SR; b += fv * 1.004 / SR;
    const x = ((a % 1) * 2 - 1) + ((b % 1) * 2 - 1);
    let v = 0;
    for (const q of fs) v += q.bp(x) * q.g;
    v *= Math.min(1, tt / 0.008) * (tt > dur ? Math.max(0, 1 - (tt - dur) / rel) : 1) * 0.55 * vel;
    add(music, s0 + i, v * l, v * r);
    add(verbSend, s0 + i, v * 0.3, v * 0.3);
    add(delaySend, s0 + i, v * 0.3, v * 0.3);
  }
}
function snap(t, vel = 1, pan = 0) {
  const s0 = Math.round(t * SR), len = Math.round(0.09 * SR);
  const bp = biquad('bp', 1900, 1.4), [l, r] = panLR(pan);
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    const v = (bp(noise()) * 1.6 * Math.exp(-tt * 85) + (i < 40 ? noise() * 0.4 : 0)) * vel;
    add(drums, s0 + i, v * l, v * r);
    add(verbSend, s0 + i, v * 0.3, v * 0.3);
  }
}
function shaker(t, vel = 1, pan = 0) {
  const s0 = Math.round(t * SR), len = Math.round(0.08 * SR);
  const hp = biquad('hp', 6500, 0.7), [l, r] = panLR(pan);
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    const v = hp(noise()) * Math.min(1, tt / 0.012) * Math.exp(-tt * 45) * 0.28 * vel;
    add(drums, s0 + i, v * l, v * r);
  }
}
function padChord(t0, t1, notes, vel = 0.16, cut = 2400, att = 0.08) {
  for (const n of notes) saw(t0, t1 - t0 - 0.02, n, vel, { voices: 5, detune: 0.02, cut0: cut, cut1: cut * 0.45, cutDecay: 1, att, rel: 0.15, send: 0.5 });
}
const pluck = (t, m, vel = 0.4, pan = 0, bright = 1) => saw(t, 0.08, m, vel, { voices: 3, detune: 0.008, cut0: 3800 * bright, cut1: 700, cutDecay: 24, rel: 0.05, pan, send: 0.2, dsend: 0.3 });

// ---------------------------------------------------------------- form (shared by every style)
const beat = 0.5, s16 = 0.125;
const KICKS = [];
const K = (t, v = 1, soft = false) => { kick(t, v, soft); if (!soft && v > 0.75) KICKS.push(t); };
const grid = (a, b, fn) => { for (let t = a; t < b - 1e-6; t += s16) fn(t, Math.round((t - a) / s16)); };
const lightChat = (t) => t >= 22.5 && t < 25.5; // the chat breathes
const halfTime = (t) => t >= 31.5 && t < 34.0;  // "every other editor": flat and dull
/** chord at time t: [bass midi, tones] */
function chordAt(S, t) {
  if (t < 4) return S.P[0];
  if (t < 6) return S.P[1];
  if (t < 10) return S.P[2];
  if (t < 34) return S.G[Math.floor((t - 10) / 2) % 4];
  if (t < 36) return S.G[0];
  return S.FIN;
}
const HOOKBARS = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 34];

function problemDrums(S) {
  K(0.5, 0.45, true); K(1.0, 0.45, true);
  grid(2.0, 7.75, (t, k) => {
    const b = k % 16;
    if (b % 4 === 0) K(t, 0.95);
    if (t >= 4.5 && (b === 4 || b === 12)) S.back(t, 0.75);
    hat(t, [0.45, 0.2, 0.35, 0.2][b % 4] * (t < 4.5 ? 0.8 : 1) * S.hatVel, false, b % 2 ? 0.3 : -0.3);
  });
}
function grooveDrums(S) {
  grid(10.0, 35.5, (t, k) => {
    const b = k % 16;
    if (halfTime(t)) {
      if (b % 8 === 0) K(t, 0.8);
      if (b === 8) snare(t, 0.35);
      if (b % 4 === 2) hat(t, 0.18, false, 0.2);
      return;
    }
    const tt = t + (S.swing && b % 2 === 1 ? S.swing : 0);
    if (b % 4 === 0) K(t, S.kickVel);
    if (b === 4 || b === 12) { if (lightChat(t)) snare(t, 0.3); else S.back(t, 1); }
    if (S.openHat && b % 4 === 2) hat(tt, lightChat(t) ? 0.4 : 0.75, true, 0.2);
    else if (b % 4 !== 0) hat(tt, [0.45, 0.22, 0.32, 0.22][b % 4] * S.hatVel, false, -0.25);
    if (S.shaker) shaker(tt, [0.9, 0.4, 0.7, 0.45][b % 4], 0.35);
    if (S.extraDrums) S.extraDrums(t, b, tt);
  });
  for (const [a, b] of [[19.5, 20.0], [25.5, 26.0]]) for (let t = a; t < b - 1e-6; t += 1 / 16) snare(t, 0.2 + (t - a) * 1.2);
  for (let t = 35.0; t < 36.0 - 1e-6;) { const p = t - 35.0; snare(t, 0.15 + p * 0.8); t += p < 0.5 ? 0.125 : p < 0.75 ? 0.0625 : 0.03125; }
}

/** the structure and every sound that is tied to something on screen; pitched bits follow the style's key */
function form(S) {
  const T = S.tr;
  // ACT I
  for (let i = 0; i < 17; i++) tick(0.4 + i * (0.85 / 17) + (i % 3) * 0.006, 0.55 + (i % 2) * 0.2, -0.15 + (i % 4) * 0.1);
  tick(1.4, 1.3, 0); thunk(1.4, 0.6); blip(1.4, 66 + T, 0.5, 0, 10);
  whoosh(1.45, 2.0, 0.55, true, 0, 0);
  [66, 69, 73, 76, 78, 81, 80, 78, 81, 85].forEach((m, i) => { const t = 2.0 + i * 0.25; S.wall(t, m + T, i); tick(t + 0.12, 0.7, (i % 5 - 2) * 0.3); });
  boom(4.5, 0.6, 1.0); crash(4.5, 0.55, 1.4);
  whoosh(4.35, 4.9, 0.5, false, 0, 0);
  whoosh(5.4, 5.62, 0.45, true, -0.5, 0.5); whoosh(6.4, 6.62, 0.45, true, 0.5, -0.5);
  tapeStop(7.72, 0.3, 42 + T);
  revCymbal(7.95, 0.5, 0.35);
  // "Why?"
  bell(8.0, 61 + T, 0.9, -0.2, 3.0); bell(8.0, 66 + T, 0.7, 0.2, 3.0); bell(8.02, 73 + T, 0.4, 0, 2.5);
  boom(8.0, 0.3, 1.6);
  // build + drop
  riser(8.9, 10.0, 1.0, 300, 9000); revCymbal(10.0, 1.1, 1.0);
  for (let t = 9.0; t < 10.0 - 1e-6;) { const p = t - 9.0; snare(t, 0.12 + p * 0.7); t += p < 0.5 ? 0.125 : p < 0.75 ? 0.0625 : 0.03125; }
  whoosh(9.3, 10.0, 0.45, false, 0, 0);
  plip(10.0, 1.2);
  for (const [t, v] of [[10.0, 1.1], [20.0, 0.6], [26.0, 0.7], [34.0, 0.8]]) { boom(t, v); crash(t, v * 0.9); }
  // reveal
  [81, 83, 85, 88, 90].forEach((m, i) => blip(10.45 + i * 0.05, m + T, 0.55, -0.4 + i * 0.2, 16));
  [[11.0, 85], [11.25, 88], [11.5, 93]].forEach(([t, m]) => { blip(t, m + T, 0.8, 0, 12); tick(t, 0.6, 0); });
  whoosh(11.75, 12.45, 0.6, true, 0.3, -0.6);
  // main example
  tick(12.42, 1.2, -0.3); thunk(12.42, 0.35); tick(12.5, 1.2, -0.2); thunk(12.5, 0.35);
  plip(12.55, 0.9, 700, 2600); blip(12.56, 81 + T, 0.6, 0, 10);
  [81, 85, 88, 93, 97].forEach((m, i) => bell(13.0 + i * 0.06, m + T, 0.45, -0.5 + i * 0.25, 1.2));
  whoosh(12.95, 13.6, 0.45, true, 0.5, -0.5);
  tick(14.1, 0.9, 0.2); scratch(14.3, 14.9, 0.3, 2000, 800); thunk(15.0, 0.6); blip(15.02, 88 + T, 0.5, 0, 14); whoosh(15.0, 15.45, 0.4, false, 0, 0);
  tick(15.85, 0.8, 0.3); scratch(15.85, 16.3, 0.6); tick(16.5, 0.8, 0.3); scratch(16.5, 16.78, 0.5, 1200, 3000);
  whoosh(17.05, 17.55, 0.45, false, 0, 0);
  [76, 81, 85].forEach((m, i) => blip(17.3 + i * 0.12, m + T, 0.5, 0, 14));
  whoosh(17.6, 18.05, 0.5, true, 0.4, -0.4); blip(18.05, 93 + T, 0.6, 0, 12);
  tick(18.82, 1.4, 0.3); tick(18.88, 0.7, 0.3);
  bell(18.95, 88 + T, 0.85, 0.2, 1.5); bell(19.07, 93 + T, 0.85, -0.2, 1.8);
  for (const t of [20.0, 26.0]) whoosh(t - 0.32, t + 0.3, 1.2, true, 0.9, -0.9);
  // chat
  [88, 85, 83, 81, 78, 76, 73, 71].forEach((m, i) => blip(20.9 + i * 0.125, m + T, 0.4, 0.5 - i * 0.12, 18));
  whoosh(22.1, 22.6, 0.35, false, 0, 0); [81, 85, 88].forEach((m, i) => blip(22.3 + i * 0.12, m + T, 0.45, 0, 14));
  blip(22.75, 93 + T, 0.6, 0.2, 10); bell(22.8, 88 + T, 0.5, 0, 1.4);
  // bank
  for (let i = 0; i < 5; i++) { thunk(27.0 + i * 0.125, 0.9, -0.4 + i * 0.2); tick(27.0 + i * 0.125, 0.5, 0); }
  for (let i = 0; i < 11; i++) blip(28.0 + i * 0.09, [93, 90, 88, 85, 83, 81, 78, 76, 73, 71, 69][i] + T, 0.3, 0.5 - i * 0.1, 20);
  whoosh(29.0, 29.5, 0.35, false, 0, 0); [81, 85, 88].forEach((m, i) => blip(29.1 + i * 0.12, m + T, 0.45, 0, 14));
  bell(29.5, 88 + T, 0.8, 0.2, 1.4); bell(29.62, 93 + T, 0.8, -0.2, 1.6);
  whoosh(31.5, 32.3, 0.6, false, 0.3, -0.3);
  // compare
  for (let i = 0; i < 6; i++) blip(32.0 + i * 0.25, 57 + T + (i % 2) * 2, 0.55, -0.5 + i * 0.2, 22);
  scratch(33.45, 33.85, 0.8, 3500, 600); thunk(33.85, 0.8);
  [[34.0, 81], [34.25, 85], [34.5, 88]].forEach(([t, m], i) => { blip(t, m + T, 0.9, -0.3 + i * 0.3, 10); bell(t, m + 12 + T, 0.35, 0, 0.8); });
  riser(35.0, 36.0, 0.9, 400, 8000); revCymbal(36.0, 0.9, 0.9); whoosh(35.55, 36.0, 0.5, true, 0, 0);
  // end card
  boom(36.0, 1.1, 1.8); crash(36.0, 1.0, 2.6); K(36.0, 1.1);
  for (const n of [S.FIN[0], S.FIN[0] + 12]) bassNote(36.0, 1.5, n, 0.8);
  [81, 85, 88, 93].forEach((m, i) => bell(36.0 + i * 0.06, m + T, 0.8, -0.4 + i * 0.27, 1.6));
  padChord(36.8, 39.9, S.FIN[1].slice(0, 4), 0.14, 1800, 0.6);
  S.hook[0].forEach((m, i) => { if (m) bell(37.5 + i * 0.25, m, 0.4, i % 2 ? 0.3 : -0.3, 1.6); });
  for (let t = 37.0; t < 39.5; t += beat) { K(t, 0.35, true); hat(t + 0.25, 0.15, false, 0.2); }
  whoosh(37.3, 38.0, 0.45, true, -0.4, 0.4);
  tick(37.75, 0.6, 0); bell(37.8, 93 + T, 0.5, 0, 1.6);
}
function playHook(S) {
  HOOKBARS.forEach((b, bi) => {
    const bar = S.hook[Math.floor((b - 10) / 2) % 4];
    const soft = b >= 22 && b < 26;
    bar.forEach((m, i) => {
      if (!m) return;
      const long = !bar[i + 1] || i === 7;
      S.lead(b + i * 0.25, long ? 0.22 : 0.1, m, soft ? 0.65 : 1, i, bi);
    });
  });
}

// ---------------------------------------------------------------- the bands
const STYLES = {
  // 1. DISCO FUNK — E major. Octave slap bass, Rhodes stabs, strings, a talk-box-ish vocal hook.
  disco: {
    tr: -5, duck: 0.45, kickVel: 1, hatVel: 1, openHat: true, shaker: true, swing: 0,
    P: [[37, [56, 59, 61, 64]], [33, [57, 61, 64, 68]], [35, [59, 63, 66, 71]]],
    G: [[33, [61, 64, 68, 71]], [35, [59, 63, 66, 71]], [32, [56, 59, 63, 66]], [37, [56, 59, 61, 64]]],
    FIN: [28, [64, 68, 71, 75, 78]],
    hook: [[76, 0, 76, 78, 80, 0, 78, 76], [78, 0, 78, 80, 81, 0, 80, 78], [80, 0, 78, 76, 75, 0, 76, 0], [73, 0, 75, 76, 0, 71, 73, 0]],
    back(t, v) { clap(t, 0.85 * v); snare(t, 0.25 * v); },
    wall(t, m, i) { rhodes(t, 0.12, m, 0.9, (i % 5 - 2) * 0.25); rhodes(t, 0.12, m - 12, 0.5, 0); },
    lead(t, d, m, v, i) { vox(t, d, m, 1.15 * v, 'o', 0); if (v > 0.8) vox(t, d, m - 12, 0.25, 'a', 0); },
    music() {
      padChord(0, 7.7, this.P[0][1], 0.12, 900, 1.4);
      grid(2.0, 7.75, (t, k) => {
        const c = chordAt(this, t), b = k % 16;
        if ([0, 3, 6, 10, 11, 14].includes(b)) funkBass(t, 0.08, c[0] + 12 + (b === 6 || b === 14 ? 12 : 0), 0.55);
        if (b === 6 || b === 14) for (const n of c[1]) rhodes(t, 0.1, n, 0.35);
      });
      for (const [t, i] of [[4.5, 0], [5.55, 1], [6.55, 2]]) for (const n of this.P[i][1]) { rhodes(t, 0.3, n, 0.9); saw(t, 0.2, n, 0.3, { cut0: 5000, cut1: 900, cutDecay: 9, rel: 0.3, send: 0.45 }); }
      grid(10.0, 35.5, (t, k) => {
        if (halfTime(t)) { if (k % 16 === 0) funkBass(t, 1.0, chordAt(this, t)[0] + 12, 0.6); return; }
        const c = chordAt(this, t), b = k % 16;
        const BL = { 0: 0, 2: 12, 3: 0, 5: 12, 6: 0, 8: 0, 10: 12, 11: 0, 13: 12, 14: 7 };
        if (b in BL) funkBass(t, b === 0 || b === 8 ? 0.12 : 0.07, c[0] + 12 + BL[b], b % 8 === 0 ? 1 : 0.75);
        if (!lightChat(t) && [2, 7, 10, 15].includes(b)) for (const n of c[1]) rhodes(t, 0.12, n, 0.7, 0.2);
        if (lightChat(t) && b === 0) for (const n of c[1]) rhodes(t, 1.8, n, 0.5);
      });
      for (let b = 10; b < 34; b += 2) if (!halfTime(b + 0.1)) padChord(b, b + 2, chordAt(this, b + 0.1)[1].map((n) => n + 12), lightChat(b + 0.1) ? 0.08 : 0.11, 3200, 0.3);
      padChord(34, 35.5, this.G[0][1].map((n) => n + 12), 0.12, 3200, 0.3);
      for (const n of this.FIN[1]) rhodes(36.0, 1.6, n, 0.9);
      for (const n of this.FIN[1]) saw(36.0, 1.6, n + 12, 0.3, { voices: 7, detune: 0.018, cut0: 7000, cut1: 1600, cutDecay: 1.5, rel: 0.5, send: 0.7 });
      // string runs into each section
      for (const t0 of [19.5, 25.5, 33.5]) [0, 2, 4, 5, 7, 9, 11, 12].forEach((d, i) => saw(t0 + i * 0.0625, 0.06, 64 + d, 0.2, { voices: 5, cut0: 6000, cut1: 2000, cutDecay: 6, rel: 0.1, send: 0.4 }));
      playHook(this);
    },
  },

  // 2. MARIMBA POP — C major. Bright and playful: marimba, finger snaps, shaker, sub bass, a whistled hook.
  marimba: {
    tr: 3, duck: 0.65, kickVel: 0.85, hatVel: 0.55, openHat: false, shaker: true, swing: 0,
    P: [[45, [57, 60, 64, 69]], [41, [57, 60, 65, 69]], [43, [55, 59, 62, 67]]],
    G: [[36, [60, 64, 67, 72]], [43, [59, 62, 67, 71]], [45, [57, 60, 64, 69]], [41, [57, 60, 65, 69]]],
    FIN: [36, [60, 64, 67, 72, 76]],
    hook: [[79, 0, 76, 79, 0, 76, 74, 72], [74, 0, 71, 74, 0, 79, 77, 74], [76, 0, 72, 76, 0, 81, 79, 76], [77, 0, 76, 74, 72, 0, 74, 0]],
    back(t, v) { snap(t, 0.9 * v, -0.2); clap(t, 0.45 * v); },
    extraDrums(t, b) { if (!lightChat(t) && (b === 7 || b === 15)) snap(t, 0.35, 0.4); },
    wall(t, m, i) { marimba(t, m, 1, (i % 5 - 2) * 0.25); marimba(t, m + 12, 0.35, 0); },
    lead(t, d, m, v, i, bi) { whistle(t, d + 0.04, m, v, 0); if (bi % 2 === 1) marimba(t, m + 12, 0.35 * v, 0.3, 9); },
    music() {
      padChord(0, 7.7, this.P[0][1], 0.1, 900, 1.4);
      grid(2.0, 7.75, (t, k) => {
        const c = chordAt(this, t), b = k % 16;
        if (b % 2 === 0) marimba(t, c[1][[0, 2, 1, 3, 2, 1, 3, 2][(b / 2) % 8]] + 12, 0.45, b % 4 ? 0.3 : -0.3, 9);
        if (b === 0 || b === 10) subBass(t, 0.3, c[0], 0.8);
      });
      for (const [t, i] of [[4.5, 0], [5.55, 1], [6.55, 2]]) for (const n of this.P[i][1]) marimba(t, n + 12, 0.8, 0);
      grid(10.0, 35.5, (t, k) => {
        const c = chordAt(this, t), b = k % 16;
        if (halfTime(t)) { if (k % 16 === 0) subBass(t, 1.0, c[0], 0.7); return; }
        const BL = { 0: 0, 3: 0, 6: 7, 8: 0, 11: 12, 14: 7 };
        if (b in BL) subBass(t, 0.18, c[0] + BL[b], b === 0 ? 1 : 0.8);
        // 3-3-2 marimba chord pattern + a quiet 16th ostinato on top
        if ([0, 3, 6, 8, 11, 14].includes(b)) for (const n of c[1].slice(0, 3)) marimba(t, n + 12, lightChat(t) ? 0.35 : 0.55, 0);
        if (!lightChat(t) && b % 2 === 1) marimba(t, c[1][b % 8 < 4 ? 3 : 2] + 24, 0.18, b % 4 === 1 ? -0.5 : 0.5, 14);
      });
      for (let b = 10; b < 34; b += 2) if (!halfTime(b + 0.1)) padChord(b, b + 2, chordAt(this, b + 0.1)[1], 0.07, 2000, 0.3);
      for (const n of this.FIN[1]) { marimba(36.0, n + 12, 1, 0, 2.5); marimba(36.0, n, 0.7, 0, 2.5); }
      [72, 76, 79, 84, 88].forEach((m, i) => marimba(35.5 + i * 0.1, m, 0.6, -0.4 + i * 0.2, 7));
      playHook(this);
    },
  },

  // 3. ELECTRO-POP ANTHEM — D major. Pumping supersaws, reese bass, chopped vocal hook, big drums.
  anthem: {
    tr: 5, duck: 0.14, kickVel: 1.1, hatVel: 1, openHat: true, shaker: false, swing: 0,
    P: [[35, [59, 62, 66, 71]], [43, [59, 62, 67, 71]], [45, [57, 61, 64, 69]]],
    G: [[38, [62, 66, 69, 74]], [45, [61, 64, 69, 73]], [47, [62, 66, 71, 74]], [43, [62, 67, 71, 74]]],
    FIN: [38, [62, 66, 69, 74, 78]],
    hook: [[74, 74, 0, 76, 78, 0, 76, 74], [73, 73, 0, 74, 76, 0, 74, 73], [71, 71, 0, 73, 74, 0, 78, 0], [79, 0, 78, 0, 76, 74, 76, 0]],
    back(t, v) { clap(t, 0.9 * v); snare(t, 0.7 * v); },
    extraDrums(t, b) { if (!lightChat(t) && b === 14) for (let j = 1; j < 4; j++) hat(t + j * 0.03125, 0.3, false, 0.4); },
    wall(t, m, i) { pluck(t, m, 0.55, (i % 5 - 2) * 0.25, 0.8); vox(t, 0.1, m - 12, 0.4, 'a'); },
    lead(t, d, m, v, i, bi) { vox(t, d, m, 1.2 * v, ['o', 'a', 'e', 'a'][i % 4], i % 2 ? 0.15 : -0.15); vox(t, d, m + 12, 0.25 * v, 'u', 0); },
    music() {
      padChord(0, 7.7, this.P[0][1], 0.12, 800, 1.4);
      grid(2.0, 7.75, (t, k) => {
        const c = chordAt(this, t), b = k % 16;
        if (b % 2 === 1) reese(t, 0.1, c[0], 0.6);
        pluck(t, c[1][[0, 1, 2, 3, 2, 1, 2, 3][k % 8]] + 12, 0.25, k % 2 ? 0.3 : -0.3, 0.45 + seg01(t, 2, 7.7) * 0.6);
      });
      for (const [t, i] of [[4.5, 0], [5.55, 1], [6.55, 2]]) for (const n of this.P[i][1]) saw(t, 0.2, n, 0.5, { voices: 7, cut0: 7000, cut1: 1200, cutDecay: 8, rel: 0.3, send: 0.5 });
      grid(10.0, 35.5, (t, k) => {
        const c = chordAt(this, t), b = k % 16;
        if (halfTime(t)) { if (k % 16 === 0) reese(t, 1.0, c[0], 0.6); return; }
        if (b % 4 === 2) reese(t, 0.22, c[0], 1);
        pluck(t, c[1][[0, 1, 2, 3, 2, 1, 2, 3][k % 8]] + 24, 0.22 * (k % 2 ? 0.7 : 1), k % 2 ? 0.4 : -0.4, lightChat(t) ? 0.6 : 1.2);
      });
      // pumping supersaw chords (the sidechain does the pumping)
      for (let b = 10; b < 34; b += 2) if (!halfTime(b + 0.1)) for (const n of chordAt(this, b + 0.1)[1]) saw(b, 1.98, n, lightChat(b + 0.1) ? 0.14 : 0.24, { voices: 7, detune: 0.022, cut0: lightChat(b + 0.1) ? 2200 : 5200, cut1: 2600, cutDecay: 1, att: 0.02, rel: 0.1, send: 0.45 });
      for (const n of this.G[0][1]) saw(34, 1.5, n, 0.24, { voices: 7, detune: 0.022, cut0: 3000, cut1: 7000, cutDecay: 1.2, att: 0.02, rel: 0.1, send: 0.45 });
      for (const n of this.FIN[1]) saw(36.0, 1.6, n, 0.45, { voices: 7, detune: 0.018, cut0: 9000, cut1: 1800, cutDecay: 1.5, rel: 0.5, send: 0.7 });
      playHook(this);
    },
  },

  // 4. PIANO HOUSE — F major. 90s house piano stabs, shuffled hats, stomp claps, bouncing bass.
  house: {
    tr: -4, duck: 0.35, kickVel: 1, hatVel: 0.9, openHat: true, shaker: true, swing: 0.022,
    P: [[38, [57, 62, 65, 69]], [46, [58, 62, 65, 70]], [36, [55, 60, 64, 67]]],
    G: [[38, [62, 65, 69, 72]], [46, [62, 65, 70, 74]], [41, [60, 65, 69, 72]], [36, [60, 64, 67, 72]]],
    FIN: [41, [65, 69, 72, 77, 81]],
    hook: [[81, 0, 79, 77, 0, 77, 76, 77], [77, 0, 74, 77, 0, 79, 81, 0], [81, 0, 84, 81, 79, 0, 77, 0], [79, 0, 77, 76, 0, 72, 74, 76]],
    back(t, v) { clap(t, v); kick(t, 0.35 * v, true); },
    wall(t, m, i) { piano(t, 0.15, m, 0.9, (i % 5 - 2) * 0.25); piano(t, 0.15, m - 12, 0.5); },
    lead(t, d, m, v) { piano(t, d + 0.1, m, 1.5 * v, 0.1); piano(t, d + 0.1, m - 12, 0.45 * v, -0.1); bell(t, m + 12, 0.18 * v, 0, 0.6); },
    music() {
      padChord(0, 7.7, this.P[0][1], 0.11, 900, 1.4);
      grid(2.0, 7.75, (t, k) => {
        const c = chordAt(this, t), b = k % 16;
        if (b === 0) for (const n of c[1]) piano(t, 1.8, n, 0.4);
        if (b % 4 === 2) bassNote(t, 0.15, c[0], 0.8);
      });
      for (const [t, i] of [[4.5, 0], [5.55, 1], [6.55, 2]]) for (const n of this.P[i][1]) piano(t, 0.4, n + 12, 1);
      grid(10.0, 35.5, (t, k) => {
        const c = chordAt(this, t), b = k % 16;
        if (halfTime(t)) { if (k % 16 === 0) for (const n of c[1]) piano(t, 1.8, n, 0.35); if (k % 16 === 0) bassNote(t, 1, c[0], 0.6); return; }
        const tt = t + (b % 2 === 1 ? this.swing : 0);
        if (b % 4 === 2) bassNote(tt, 0.2, c[0], 1);
        if (b === 7 || b === 15) bassNote(tt, 0.1, c[0] + 12, 0.6);
        const STAB = lightChat(t) ? [0] : [0, 3, 6, 10, 12];
        if (STAB.includes(b)) for (const n of c[1]) piano(tt, lightChat(t) ? 1.8 : 0.16, n + (lightChat(t) ? 0 : 12), lightChat(t) ? 0.5 : 0.75, 0);
      });
      for (let b = 10; b < 34; b += 2) if (!halfTime(b + 0.1)) padChord(b, b + 2, chordAt(this, b + 0.1)[1], 0.07, 2000, 0.2);
      for (const n of this.FIN[1]) { piano(36.0, 2.4, n, 1); piano(36.0, 2.4, n - 12, 0.6); }
      playHook(this);
    },
  },
};
const seg01 = (t, a, b) => clamp((t - a) / (b - a), 0, 1);

const STYLE = process.argv[2] || 'disco';
const S = STYLES[STYLE];
if (!S) throw new Error(`unknown style "${STYLE}"; pick one of ${Object.keys(STYLES).join(', ')}`);
problemDrums(S);
grooveDrums(S);
S.music();
form(S);

// ---------------------------------------------------------------- processing
// sidechain (music + bass) from the main kicks
const duck = new Float32Array(N).fill(1);
const kicks = KICKS;
for (const kt of kicks) {
  const s0 = Math.round(kt * SR);
  for (let i = 0; i < 0.3 * SR; i++) {
    const tt = i / SR;
    const g = S.duck + (1 - S.duck) * Math.pow(Math.min(1, tt / 0.26), 1.6);
    if (s0 + i < N) duck[s0 + i] = Math.min(duck[s0 + i], g);
  }
}
for (let i = 0; i < N; i++) { for (const b of [music, bass]) { b[0][i] *= duck[i]; b[1][i] *= duck[i]; } }

// stereo ping-pong delay (dotted 8th)
{
  const d = Math.round(0.375 * SR);
  const [l, r] = delaySend;
  const lp = [biquad('lp', 3500, 0.7), biquad('lp', 3500, 0.7)];
  const bl = new Float32Array(N), br = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const fl = i >= d ? br[i - d] : 0, fr = i >= d ? bl[i - d] : 0;
    bl[i] = l[i] + lp[0](fl) * 0.42; br[i] = r[i] * 0.2 + lp[1](fr) * 0.42;
    music[0][i] += (i >= d ? bl[i - d] : 0) * 0.5 * duck[i];
    music[1][i] += (i >= d ? br[i - d] : 0) * 0.5 * duck[i];
  }
}
// freeverb-style reverb
function freeverb(inL, inR, room = 0.86, damp = 0.35) {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((x) => Math.round(x * SR / 44100));
  const alls = [556, 441, 341, 225].map((x) => Math.round(x * SR / 44100));
  const out = [new Float32Array(N), new Float32Array(N)];
  [inL, inR].forEach((inp, ch) => {
    const spread = ch ? 23 : 0;
    const cb = combs.map((n) => ({ buf: new Float32Array(n + spread), i: 0, st: 0 }));
    const ab = alls.map((n) => ({ buf: new Float32Array(n + spread), i: 0 }));
    const o = out[ch];
    for (let s = 0; s < N; s++) {
      const x = inp[s] * 0.015;
      let y = 0;
      for (const c of cb) {
        const v = c.buf[c.i];
        c.st = v * (1 - damp) + c.st * damp;
        c.buf[c.i] = x + c.st * room;
        c.i = (c.i + 1) % c.buf.length;
        y += v;
      }
      for (const a of ab) {
        const v = a.buf[a.i];
        a.buf[a.i] = y + v * 0.5;
        a.i = (a.i + 1) % a.buf.length;
        y = v - y;
      }
      o[s] = y;
    }
  });
  return out;
}
const verb = freeverb(verbSend[0], verbSend[1]);

// mix
const out = [new Float32Array(N), new Float32Array(N)];
const hpL = biquad('hp', 28, 0.7), hpR = biquad('hp', 28, 0.7);
for (let i = 0; i < N; i++) {
  for (let ch = 0; ch < 2; ch++) {
    let v = (drums[ch][i] * 0.62 + bass[ch][i] * 0.72 + music[ch][i] * 1.9 + fx[ch][i] * 0.85 + verb[ch][i] * 3.4) * 0.6;
    out[ch][i] = v;
  }
  out[0][i] = hpL(out[0][i]); out[1][i] = hpR(out[1][i]);
}
// glue: soft clip + normalize, fades
let peak = 0;
for (let ch = 0; ch < 2; ch++) for (let i = 0; i < N; i++) { out[ch][i] = Math.tanh(out[ch][i] * 1.1); peak = Math.max(peak, Math.abs(out[ch][i])); }
const g = 0.93 / peak;
for (let ch = 0; ch < 2; ch++) for (let i = 0; i < N; i++) {
  const t = i / SR;
  const fade = Math.min(1, t / 0.01) * (t > 38.4 ? Math.max(0, 1 - (t - 38.4) / 1.6) ** 1.5 : 1);
  out[ch][i] *= g * fade;
}
// report bus levels
const rms = (b) => Math.sqrt(b[0].reduce((a, x) => a + x * x, 0) / N);
console.log('rms drums', rms(drums).toFixed(3), 'bass', rms(bass).toFixed(3), 'music', rms(music).toFixed(3), 'fx', rms(fx).toFixed(3), 'verb', (rms(verb) * 3.2).toFixed(3), 'peak', peak.toFixed(3));

// write 16-bit WAV
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(clamp(out[0][i], -1, 1) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(clamp(out[1][i], -1, 1) * 32767), 46 + i * 4); }
writeFileSync(new URL(`./music-${STYLE}.wav`, import.meta.url), buf);
console.log(`wrote music-${STYLE}.wav`);
