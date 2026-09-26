import type { Arrow, Mark, Rect, TextMark } from './types';

export const textFont = (size: number) => `600 ${size}px Figtree, ui-sans-serif, system-ui, sans-serif`;
export const TEXT_LINE_HEIGHT = 1.2;

let measureCtx: CanvasRenderingContext2D | null = null;
export function textWidth(t: Pick<TextMark, 'text' | 'size'>): number {
  measureCtx ??= document.createElement('canvas').getContext('2d')!;
  measureCtx.font = textFont(t.size);
  return measureCtx.measureText(t.text).width;
}

/** Dark outline for light colors and vice versa, so labels read on any screenshot. */
export function outlineFor(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.55 ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.85)';
}

/**
 * SVG path data for a stroke, smoothed with quadratic curves through the midpoints.
 */
export function strokePath(p: number[]): string {
  const n = p.length;
  if (n < 2) return '';
  // A tap still leaves a dot: round caps need a non-zero-length segment.
  if (n <= 4) return `M${p[0]} ${p[1]}L${p[n - 2] + 0.01} ${p[n - 1]}`;
  let d = `M${p[0]} ${p[1]}`;
  for (let i = 2; i < n - 2; i += 2) {
    d += `Q${p[i]} ${p[i + 1]} ${(p[i] + p[i + 2]) / 2} ${(p[i + 1] + p[i + 3]) / 2}`;
  }
  return d + `L${p[n - 2]} ${p[n - 1]}`;
}

/** Arrowhead corners; the shaft stops inside the head so the tip stays sharp. */
function arrowGeometry(a: Arrow) {
  const dx = a.x2 - a.x1;
  const dy = a.y2 - a.y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const head = Math.min(len, a.width * 4.5);
  const half = head * 0.6;
  const bx = a.x2 - ux * head;
  const by = a.y2 - uy * head;
  return {
    shaftEnd: [a.x2 - ux * head * 0.6, a.y2 - uy * head * 0.6],
    head: [a.x2, a.y2, bx - uy * half, by + ux * half, bx + uy * half, by - ux * half],
  };
}

const SPOT_DIM = 'rgba(0,0,0,0.55)';

/**
 * Draws spotlights, shapes and text. Redactions are skipped: they are baked into
 * the image pixels beforehand. `view` is the visible part of the screenshot, in
 * the same coordinates as the marks.
 */
export function drawMarks(ctx: CanvasRenderingContext2D, marks: Mark[], view: Rect) {
  const spots = marks.filter((m) => m.type === 'spotlight');
  if (spots.length) {
    ctx.save();
    // Each even-odd clip cuts out one hole; stacking clips intersects them, so
    // overlapping spotlights merge instead of cancelling out.
    const r = Math.max(view.w, view.h) / 200;
    for (const s of spots) {
      ctx.beginPath();
      ctx.rect(view.x, view.y, view.w, view.h);
      ctx.roundRect(s.x, s.y, s.w, s.h, r);
      ctx.clip('evenodd');
    }
    ctx.fillStyle = SPOT_DIM;
    ctx.fillRect(view.x, view.y, view.w, view.h);
    ctx.restore();
  }

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const m of marks) {
    switch (m.type) {
      case 'stroke':
        ctx.strokeStyle = m.color;
        ctx.lineWidth = m.width;
        ctx.stroke(new Path2D(strokePath(m.points)));
        break;
      case 'box':
        ctx.strokeStyle = m.color;
        ctx.lineWidth = m.width;
        ctx.beginPath();
        ctx.roundRect(m.x, m.y, m.w, m.h, Math.min(m.width * 1.5, Math.abs(m.w) / 2, Math.abs(m.h) / 2));
        ctx.stroke();
        break;
      case 'arrow': {
        const { shaftEnd, head } = arrowGeometry(m);
        ctx.strokeStyle = ctx.fillStyle = m.color;
        ctx.lineWidth = m.width;
        ctx.beginPath();
        ctx.moveTo(m.x1, m.y1);
        ctx.lineTo(shaftEnd[0], shaftEnd[1]);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(head[0], head[1]);
        ctx.lineTo(head[2], head[3]);
        ctx.lineTo(head[4], head[5]);
        ctx.closePath();
        // A thin stroke on the head softens its corners to match the round shaft.
        ctx.lineWidth = m.width * 0.5;
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'text':
        ctx.font = textFont(m.size);
        ctx.textBaseline = 'top';
        ctx.lineWidth = m.size * 0.16;
        ctx.strokeStyle = outlineFor(m.color);
        ctx.strokeText(m.text, m.x, m.y + m.size * 0.1);
        ctx.fillStyle = m.color;
        ctx.fillText(m.text, m.x, m.y + m.size * 0.1);
        break;
    }
  }
  ctx.restore();
}

function spanRect(xs: number[], ys: number[], pad: number): Rect {
  const x = Math.min(...xs) - pad;
  const y = Math.min(...ys) - pad;
  return { x, y, w: Math.max(...xs) + pad - x, h: Math.max(...ys) + pad - y };
}

/** Area a mark covers, including its line width. */
export function markBounds(m: Mark): Rect {
  switch (m.type) {
    case 'redact':
    case 'spotlight':
      return { x: m.x, y: m.y, w: m.w, h: m.h };
    case 'box':
      return { x: m.x - m.width / 2, y: m.y - m.width / 2, w: m.w + m.width, h: m.h + m.width };
    case 'arrow':
      return spanRect([m.x1, m.x2], [m.y1, m.y2], m.width * 2.8);
    case 'stroke':
      return spanRect(
        m.points.filter((_, i) => i % 2 === 0),
        m.points.filter((_, i) => i % 2 === 1),
        m.width / 2,
      );
    case 'text':
      return { x: m.x, y: m.y, w: textWidth(m), h: m.size * TEXT_LINE_HEIGHT };
  }
}

function inside(r: Rect, x: number, y: number, pad = 0) {
  return x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad;
}

function segmentDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const t = dx || dy ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy))) : 0;
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function hits(m: Mark, x: number, y: number, tol: number): boolean {
  switch (m.type) {
    case 'redact':
    case 'spotlight':
    case 'text':
      return inside(markBounds(m), x, y, tol);
    case 'box': {
      // Only the outline is grabbable, so marks drawn inside a box stay selectable.
      const d = tol + m.width / 2;
      return inside(m, x, y, d) && !inside({ x: m.x + d, y: m.y + d, w: m.w - 2 * d, h: m.h - 2 * d }, x, y);
    }
    case 'arrow':
      return segmentDistance(x, y, m.x1, m.y1, m.x2, m.y2) <= tol + m.width;
    case 'stroke': {
      const p = m.points;
      if (p.length <= 2) return Math.hypot(x - p[0], y - p[1]) <= tol + m.width / 2;
      for (let i = 0; i < p.length - 2; i += 2) {
        if (segmentDistance(x, y, p[i], p[i + 1], p[i + 2], p[i + 3]) <= tol + m.width / 2) return true;
      }
      return false;
    }
  }
}

/** Topmost mark under the point, if any. */
export function hitTest(marks: Mark[], x: number, y: number, tol: number): Mark | undefined {
  for (let i = marks.length - 1; i >= 0; i--) if (hits(marks[i], x, y, tol)) return marks[i];
  return undefined;
}

export function translateMark(m: Mark, dx: number, dy: number): Mark {
  switch (m.type) {
    case 'arrow':
      return { ...m, x1: m.x1 + dx, y1: m.y1 + dy, x2: m.x2 + dx, y2: m.y2 + dy };
    case 'stroke':
      return { ...m, points: m.points.map((v, i) => v + (i % 2 ? dy : dx)) };
    default:
      return { ...m, x: m.x + dx, y: m.y + dy };
  }
}
