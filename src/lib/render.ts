import { PRESETS, drawPreset } from './backgrounds';
import { drawMarks } from './marks';
import type { Aspect, Mark, Rect, Settings } from './types';

/** Scene geometry in layout units (1 unit = 1 screenshot pixel at 1x). */
export interface Layout {
  width: number;
  height: number;
  unit: number;
  bar: number;
  win: Rect;
  image: Rect;
}

const RATIOS: Record<Exclude<Aspect, 'auto'>, number> = {
  '16:9': 16 / 9,
  '4:3': 4 / 3,
  '1:1': 1,
  '4:5': 4 / 5,
  '9:16': 9 / 16,
};

export function computeLayout(iw: number, ih: number, s: Settings): Layout {
  const unit = Math.max(iw, ih) / 1000;
  const bar = s.frame === 'none' ? 0 : Math.round((s.frame === 'browser' ? 46 : 36) * unit);
  const winW = iw;
  const winH = ih + bar;
  const pad = s.padding * unit;

  let W = winW + pad * 2;
  let H = winH + pad * 2;
  if (s.aspect !== 'auto') {
    const r = RATIOS[s.aspect];
    if (W / H > r) H = W / r;
    else W = H * r;
  }
  W = Math.round(W);
  H = Math.round(H);

  const win = { x: Math.round((W - winW) / 2), y: Math.round((H - winH) / 2), w: winW, h: winH };
  return { width: W, height: H, unit, bar, win, image: { x: win.x, y: win.y + bar, w: iw, h: ih } };
}

interface SceneInput {
  /** Screenshot with redactions applied. */
  source: HTMLCanvasElement;
  /** Unredacted screenshot, used only for the blurred background. */
  original: HTMLCanvasElement;
  /** Part of the screenshot to show, in screenshot pixels. */
  view: Rect;
  marks: Mark[];
  layout: Layout;
  settings: Settings;
  /** Output pixels per layout unit. */
  scale: number;
}

export function renderScene(ctx: CanvasRenderingContext2D, { source, original, view, marks, layout: L, settings: s, scale }: SceneInput) {
  const u = L.unit;
  const dark = s.frameTheme === 'dark';

  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, L.width, L.height);

  drawBackground(ctx, L, s, original, view);
  if (s.grain && s.bgType !== 'none') drawGrain(ctx, L);

  const r = windowRadius(L, s);

  // Shadows ignore the canvas transform, so their sizes are scaled by hand.
  if (s.shadow > 0) {
    const k = s.shadow / 100;
    ctx.save();
    ctx.fillStyle = '#000';
    ctx.shadowColor = `rgba(0,0,0,${0.2 + 0.35 * k})`;
    ctx.shadowBlur = (10 + 120 * k) * u * scale;
    ctx.shadowOffsetY = (4 + 44 * k) * u * scale;
    roundRect(ctx, L.win, r);
    ctx.fill();
    ctx.shadowColor = 'rgba(0,0,0,0.18)';
    ctx.shadowBlur = 3 * u * scale;
    ctx.shadowOffsetY = 1 * u * scale;
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  roundRect(ctx, L.win, r);
  ctx.clip();
  if (s.frame !== 'none') drawBar(ctx, L, s, dark);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, view.x, view.y, view.w, view.h, L.image.x, L.image.y, L.image.w, L.image.h);
  if (marks.length) {
    ctx.translate(L.image.x - view.x, L.image.y - view.y);
    drawMarks(ctx, marks, view);
  }
  ctx.restore();

  // Hairline edge so the window reads cleanly against any background.
  ctx.save();
  const hair = Math.max(1 / scale, 0.8 * u);
  roundRect(ctx, { x: L.win.x + hair / 2, y: L.win.y + hair / 2, w: L.win.w - hair, h: L.win.h - hair }, Math.max(0, r - hair / 2));
  ctx.lineWidth = hair;
  ctx.strokeStyle = s.frame !== 'none' && !dark ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.14)';
  ctx.stroke();
  ctx.restore();

  if (s.watermark) drawWatermark(ctx, L, scale);
  ctx.restore();
}

function windowRadius(L: Layout, s: Settings) {
  return Math.min(s.radius * L.unit, L.win.w / 2, L.win.h / 2);
}

/** Clips to the window and maps screenshot pixels onto it, for drawing marks on an overlay. */
export function enterScreenshotSpace(ctx: CanvasRenderingContext2D, L: Layout, s: Settings, view: Rect) {
  roundRect(ctx, L.win, windowRadius(L, s));
  ctx.clip();
  ctx.translate(L.image.x - view.x, L.image.y - view.y);
}

function roundRect(ctx: CanvasRenderingContext2D, rc: Rect, r: number) {
  ctx.beginPath();
  ctx.roundRect(rc.x, rc.y, rc.w, rc.h, r);
}

function drawBackground(ctx: CanvasRenderingContext2D, L: Layout, s: Settings, original: HTMLCanvasElement, view: Rect) {
  const { width: W, height: H } = L;
  switch (s.bgType) {
    case 'none':
      return;
    case 'solid':
      ctx.fillStyle = s.bgColor;
      ctx.fillRect(0, 0, W, H);
      return;
    case 'blur':
      drawBlurredCover(ctx, original, view, W, H, L.unit);
      return;
    case 'preset':
      drawPreset(ctx, PRESETS.find((p) => p.id === s.bgPreset) ?? PRESETS[0], W, H);
  }
}

let filterSupport: boolean | null = null;
function supportsFilter(ctx: CanvasRenderingContext2D) {
  if (filterSupport === null) {
    const prev = ctx.filter;
    ctx.filter = 'blur(1px)';
    filterSupport = ctx.filter === 'blur(1px)';
    ctx.filter = prev ?? 'none';
  }
  return filterSupport;
}

/** Only the visible (cropped) part is used, so cropped-out content never shows up here. */
function drawBlurredCover(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement, view: Rect, W: number, H: number, u: number) {
  const k = Math.max(W / view.w, H / view.h) * 1.2;
  const dw = view.w * k;
  const dh = view.h * k;
  const dx = (W - dw) / 2;
  const dy = (H - dh) / 2;

  ctx.save();
  if (supportsFilter(ctx)) {
    ctx.filter = `blur(${60 * u}px) saturate(1.5)`;
    ctx.drawImage(img, view.x, view.y, view.w, view.h, dx, dy, dw, dh);
  } else {
    // Fallback: a tiny downsample stretched back up reads as a soft blur.
    const t = document.createElement('canvas');
    t.width = 24;
    t.height = Math.max(1, Math.round((24 * dh) / dw));
    const tc = t.getContext('2d')!;
    tc.imageSmoothingQuality = 'high';
    tc.drawImage(img, view.x, view.y, view.w, view.h, 0, 0, t.width, t.height);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(t, dx, dy, dw, dh);
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(0, 0, W, H);
}

let noise: HTMLCanvasElement | null = null;
function getNoise() {
  if (!noise) {
    noise = document.createElement('canvas');
    noise.width = noise.height = 160;
    const c = noise.getContext('2d')!;
    const d = c.createImageData(160, 160);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = Math.random() * 255;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
      d.data[i + 3] = 255;
    }
    c.putImageData(d, 0, 0);
  }
  return noise;
}

function drawGrain(ctx: CanvasRenderingContext2D, L: Layout) {
  const pattern = ctx.createPattern(getNoise(), 'repeat');
  if (!pattern) return;
  // Tie grain size to the layout so preview and export look identical.
  pattern.setTransform(new DOMMatrix().scale(Math.max(0.5, L.unit * 0.8)));
  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, L.width, L.height);
  ctx.restore();
}

function drawBar(ctx: CanvasRenderingContext2D, L: Layout, s: Settings, dark: boolean) {
  const { win, bar, unit: u } = L;
  ctx.fillStyle = dark ? '#232327' : '#f4f4f5';
  ctx.fillRect(win.x, win.y, win.w, bar);
  ctx.fillStyle = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
  ctx.fillRect(win.x, win.y + bar - Math.max(1, u), win.w, Math.max(1, u));

  const cy = win.y + bar / 2;
  ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => {
    ctx.beginPath();
    ctx.arc(win.x + 22 * u + i * 20 * u, cy, 6.5 * u, 0, Math.PI * 2);
    ctx.fillStyle = c;
    ctx.fill();
  });

  if (s.frame === 'browser') {
    const pw = Math.min(win.w * 0.46, 560 * u);
    const ph = bar * 0.58;
    const px = win.x + (win.w - pw) / 2;
    ctx.beginPath();
    ctx.roundRect(px, cy - ph / 2, pw, ph, ph / 2);
    ctx.fillStyle = dark ? '#34343a' : '#e4e4e7';
    ctx.fill();
    ctx.font = `500 ${13 * u}px Geist, ui-sans-serif, system-ui, sans-serif`;
    ctx.fillStyle = dark ? 'rgba(255,255,255,0.72)' : 'rgba(0,0,0,0.6)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.url.trim() || 'example.com', px + pw / 2, cy + 0.5 * u, pw - 28 * u);
  }
}

function drawWatermark(ctx: CanvasRenderingContext2D, L: Layout, scale: number) {
  const u = L.unit;
  ctx.save();
  ctx.font = `600 ${13 * u}px Geist, ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 6 * u * scale;
  ctx.fillText('✦ glazed', L.width - 16 * u, L.height - 12 * u);
  ctx.restore();
}
