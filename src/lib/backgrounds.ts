interface Blob2D {
  x: number;
  y: number;
  r: number;
  c: string;
}

export type Preset =
  | { id: string; name: string; kind: 'linear'; angle: number; stops: [string, number][] }
  | { id: string; name: string; kind: 'mesh'; base: string; blobs: Blob2D[] };

export const PRESETS: Preset[] = [
  {
    id: 'rose', name: 'Rosé', kind: 'mesh', base: '#1a0510',
    blobs: [
      { x: 0.2, y: 0.08, r: 0.55, c: '#ffc4dc' },
      { x: 0.42, y: 0.35, r: 0.7, c: '#c2185b' },
      { x: 0.88, y: 0.2, r: 0.6, c: '#6a0f3c' },
    ],
  },
  {
    id: 'aurora', name: 'Aurora', kind: 'mesh', base: '#0b1026',
    blobs: [
      { x: 0.15, y: 0.2, r: 0.75, c: '#7c3aed' },
      { x: 0.85, y: 0.25, r: 0.65, c: '#06b6d4' },
      { x: 0.55, y: 0.95, r: 0.75, c: '#ec4899' },
    ],
  },
  {
    id: 'peach', name: 'Peach', kind: 'mesh', base: '#ffd6c9',
    blobs: [
      { x: 0.1, y: 0.1, r: 0.7, c: '#ff9a8b' },
      { x: 0.9, y: 0.2, r: 0.6, c: '#ffe29f' },
      { x: 0.6, y: 1, r: 0.7, c: '#ff6a88' },
    ],
  },
  {
    id: 'lagoon', name: 'Lagoon', kind: 'mesh', base: '#042f2e',
    blobs: [
      { x: 0.2, y: 0.9, r: 0.7, c: '#14b8a6' },
      { x: 0.85, y: 0.15, r: 0.7, c: '#0ea5e9' },
      { x: 0.5, y: 0.45, r: 0.4, c: '#22d3ee' },
    ],
  },
  {
    id: 'ember', name: 'Ember', kind: 'mesh', base: '#1c0a00',
    blobs: [
      { x: 0.2, y: 0.15, r: 0.7, c: '#f97316' },
      { x: 0.85, y: 0.8, r: 0.7, c: '#dc2626' },
      { x: 0.7, y: 0.1, r: 0.45, c: '#facc15' },
    ],
  },
  {
    id: 'lime', name: 'Lime', kind: 'mesh', base: '#ecfccb',
    blobs: [
      { x: 0.1, y: 0.9, r: 0.7, c: '#22c55e' },
      { x: 0.9, y: 0.1, r: 0.6, c: '#a3e635' },
      { x: 0.8, y: 0.9, r: 0.5, c: '#fde047' },
    ],
  },
  {
    id: 'dune', name: 'Dune', kind: 'mesh', base: '#f5e6d3',
    blobs: [
      { x: 0.1, y: 0.2, r: 0.6, c: '#e0a96d' },
      { x: 0.9, y: 0.9, r: 0.7, c: '#c97b63' },
      { x: 0.8, y: 0.1, r: 0.5, c: '#f7d9a8' },
    ],
  },
  { id: 'sunset', name: 'Sunset', kind: 'linear', angle: 135, stops: [['#ff7e5f', 0], ['#feb47b', 1]] },
  { id: 'candy', name: 'Candy', kind: 'linear', angle: 120, stops: [['#f472b6', 0], ['#a78bfa', 0.5], ['#60a5fa', 1]] },
  { id: 'cotton', name: 'Cotton', kind: 'linear', angle: 135, stops: [['#e0c3fc', 0], ['#8ec5fc', 1]] },
  { id: 'ocean', name: 'Ocean', kind: 'linear', angle: 160, stops: [['#2193b0', 0], ['#6dd5ed', 1]] },
  { id: 'midnight', name: 'Midnight', kind: 'linear', angle: 180, stops: [['#0f2027', 0], ['#203a43', 0.5], ['#2c5364', 1]] },
  ];

export const SOLIDS = ['#ffffff', '#f4f4f5', '#e7e5e4', '#fde68a', '#bfdbfe', '#c7d2fe', '#fbcfe8', '#18181b', '#0c0a09', '#1e1b4b'];

export function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export function drawPreset(ctx: CanvasRenderingContext2D, p: Preset, W: number, H: number) {
  if (p.kind === 'linear') {
    // Match CSS linear-gradient angle semantics: 0deg points up, 90deg points right.
    const a = (p.angle * Math.PI) / 180;
    const dx = Math.sin(a);
    const dy = -Math.cos(a);
    const len = Math.abs(W * dx) + Math.abs(H * dy);
    const g = ctx.createLinearGradient(
      W / 2 - (dx * len) / 2, H / 2 - (dy * len) / 2,
      W / 2 + (dx * len) / 2, H / 2 + (dy * len) / 2,
    );
    for (const [c, o] of p.stops) g.addColorStop(o, c);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    return;
  }

  ctx.fillStyle = p.base;
  ctx.fillRect(0, 0, W, H);
  const M = Math.max(W, H);
  for (const b of p.blobs) {
    const g = ctx.createRadialGradient(b.x * W, b.y * H, 0, b.x * W, b.y * H, b.r * M);
    g.addColorStop(0, hexA(b.c, 0.95));
    g.addColorStop(0.5, hexA(b.c, 0.4));
    g.addColorStop(1, hexA(b.c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
}

/** An approximate CSS version of a preset, for swatches and UI glows. */
export function presetCss(p: Preset): string {
  if (p.kind === 'linear') {
    return `linear-gradient(${p.angle}deg, ${p.stops.map(([c, o]) => `${c} ${o * 100}%`).join(', ')})`;
  }
  const layers = p.blobs.map(
    (b) => `radial-gradient(circle at ${b.x * 100}% ${b.y * 100}%, ${hexA(b.c, 0.95)} 0%, ${hexA(b.c, 0)} ${b.r * 110}%)`,
  );
  return [...layers, p.base].join(', ');
}
