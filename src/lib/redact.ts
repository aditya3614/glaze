import type { Redaction } from './types';

/**
 * Bakes redactions into a copy of the screenshot. Each area is applied on top of
 * the previous result, so overlapping areas never reveal the original pixels.
 */
export function applyRedactions(src: HTMLCanvasElement, list: Redaction[]): HTMLCanvasElement {
  if (!list.length) return src;

  const out = document.createElement('canvas');
  out.width = src.width;
  out.height = src.height;
  const ctx = out.getContext('2d')!;
  ctx.drawImage(src, 0, 0);

  const tmp = document.createElement('canvas');
  const t = tmp.getContext('2d')!;
  const longest = Math.max(src.width, src.height);

  for (const r of list) {
    const x = Math.round(r.x);
    const y = Math.round(r.y);
    const w = Math.max(1, Math.round(r.w));
    const h = Math.max(1, Math.round(r.h));

    if (r.style === 'solid') {
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(x, y, w, h);
      continue;
    }

    // Downsample the area, then scale it back up: hard edges for pixelate, smooth for blur.
    const block = r.style === 'pixelate' ? Math.max(6, Math.round(longest / 110)) : Math.max(8, Math.round(longest / 45));
    tmp.width = Math.max(1, Math.round(w / block));
    tmp.height = Math.max(1, Math.round(h / block));
    t.imageSmoothingEnabled = true;
    t.imageSmoothingQuality = 'high';
    t.drawImage(out, x, y, w, h, 0, 0, tmp.width, tmp.height);

    ctx.save();
    ctx.imageSmoothingEnabled = r.style === 'blur';
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(tmp, 0, 0, tmp.width, tmp.height, x, y, w, h);
    ctx.restore();
  }
  return out;
}
