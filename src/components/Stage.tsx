import { Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent, PointerEvent } from 'react';
import { computeLayout, renderScene } from '../lib/render';
import type { Rect } from '../lib/render';
import type { Settings } from '../lib/types';
import { AppIcon, Kbd, MOD, buttonPrimary, buttonSecondary, cn } from './ui';

interface Props {
  source: HTMLCanvasElement | null;
  processed: HTMLCanvasElement | null;
  settings: Settings;
  exportScale: number;
  fontsReady: boolean;
  redactMode: boolean;
  onRedact: (r: Rect) => void;
  onFile: (f: File) => void;
  onPick: () => void;
  onSample: () => void;
}

/** Keeps the live preview light; exports always render at full resolution. */
const PREVIEW_MAX = 2400;

export function Stage({ source, processed, settings, exportScale, fontsReady, redactMode, onRedact, onFile, onPick, onSample }: Props) {
  const areaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [dragOver, setDragOver] = useState(false);
  const [draft, setDraft] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);

  const layout = useMemo(() => (source ? computeLayout(source.width, source.height, settings) : null), [source, settings]);

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setBox({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !layout || !processed || !source) return;
    const ps = Math.min(1, PREVIEW_MAX / Math.max(layout.width, layout.height));
    c.width = Math.round(layout.width * ps);
    c.height = Math.round(layout.height * ps);
    renderScene(c.getContext('2d')!, { source: processed, original: source, layout, settings, scale: ps });
  }, [layout, processed, source, settings, fontsReady]);

  const fit = layout && box.w ? Math.min(box.w / layout.width, box.h / layout.height, 1) : 0;
  const dispW = layout ? layout.width * fit : 0;
  const dispH = layout ? layout.height * fit : 0;

  const local = (e: PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!redactMode) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = local(e);
    setDraft({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
  };

  const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!draft) return;
    const p = local(e);
    setDraft({ ...draft, x1: p.x, y1: p.y });
  };

  const onPointerUp = () => {
    if (!draft || !layout || !fit) return setDraft(null);
    // Display px → layout units → screenshot px, clamped to the screenshot.
    const k = 1 / fit;
    const { image } = layout;
    const clamp = (v: number, max: number) => Math.min(max, Math.max(0, v));
    const x0 = clamp(Math.min(draft.x0, draft.x1) * k - image.x, image.w);
    const x1 = clamp(Math.max(draft.x0, draft.x1) * k - image.x, image.w);
    const y0 = clamp(Math.min(draft.y0, draft.y1) * k - image.y, image.h);
    const y1 = clamp(Math.max(draft.y0, draft.y1) * k - image.y, image.h);
    if (x1 - x0 > 3 && y1 - y0 > 3) onRedact({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
    setDraft(null);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };

  return (
    <main
      className="relative flex min-h-[60vh] flex-1 flex-col lg:min-h-0"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
      }}
      onDrop={onDrop}
    >
      {redactMode && source && (
        <div className="glass rise pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2 rounded-full px-4 py-1.5 text-xs font-medium text-white">
          Drag over anything sensitive · <span className="opacity-70">Esc to finish</span>
        </div>
      )}

      <div ref={areaRef} className="relative m-6 flex-1 sm:m-10">
        {source && layout ? (
          <div className="absolute inset-0 grid place-items-center">
            <div className="relative" style={{ width: dispW, height: dispH }}>
              <div
                className={cn(
                  'absolute inset-0 overflow-hidden rounded-xl shadow-[0_40px_100px_-24px_rgba(0,0,0,.85)] ring-1 ring-white/10 transition-shadow duration-500',
                  settings.bgType === 'none' && 'checker',
                )}
              >
                <canvas
                  ref={canvasRef}
                  className={cn('block h-full w-full touch-none', redactMode && 'cursor-crosshair')}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={() => setDraft(null)}
                />
              </div>
              {draft && (
                <div
                  className="pointer-events-none absolute rounded-sm border border-dashed border-rose-200 bg-rose-glaze/25"
                  style={{
                    left: Math.min(draft.x0, draft.x1),
                    top: Math.min(draft.y0, draft.y1),
                    width: Math.abs(draft.x1 - draft.x0),
                    height: Math.abs(draft.y1 - draft.y0),
                  }}
                />
              )}
              <div className="absolute -bottom-7 left-0 right-0 text-center font-mono text-[11px] text-white/40">
                {Math.round(layout.width * exportScale)} × {Math.round(layout.height * exportScale)} px
              </div>
            </div>
          </div>
        ) : (
          <EmptyState dragOver={dragOver} onPick={onPick} onSample={onSample} />
        )}

        {source && dragOver && (
          <div className="glass absolute inset-0 z-30 grid place-items-center rounded-3xl border-dashed border-white/40 text-sm font-medium text-white">
            Drop to replace
          </div>
        )}
      </div>
    </main>
  );
}

function EmptyState({ dragOver, onPick, onSample }: { dragOver: boolean; onPick: () => void; onSample: () => void }) {
  return (
    <div className="absolute inset-0 grid place-items-center overflow-y-auto">
      <div className="max-w-3xl px-2 py-10 text-center">
        <div className="rise mb-10 flex justify-center" style={{ animationDelay: '60ms' }}>
          <div className={cn('float transition-transform duration-500', dragOver && 'scale-110')}>
            <AppIcon size={112} className={cn('transition-shadow duration-500', dragOver && 'shadow-[0_0_80px_rgba(255,92,138,.8)]')} />
          </div>
        </div>
        <h1
          className="rise text-balance text-5xl font-light leading-[1.02] tracking-[-0.035em] sm:text-7xl"
          style={{ animationDelay: '140ms' }}
        >
          {dragOver ? (
            <>
              Drop it. We&rsquo;ll <span className="font-serif italic tracking-[-0.01em]">glaze</span> it.
            </>
          ) : (
            <>
              Screenshots, <span className="font-serif italic tracking-[-0.01em]">glazed</span> to perfection
            </>
          )}
        </h1>
        <p className="rise mx-auto mt-6 max-w-xl text-lg font-light text-white/70 sm:text-xl" style={{ animationDelay: '220ms' }}>
          Frames, backgrounds and one-drag redaction, right in your browser. Nothing ever uploads.
        </p>
        <div className="rise mt-10 flex flex-wrap justify-center gap-3" style={{ animationDelay: '300ms' }}>
          <button type="button" className={cn(buttonPrimary, 'h-12! px-7! text-[15px]!')} onClick={onPick}>
            Choose image
          </button>
          <button type="button" className={cn(buttonSecondary, 'h-12! px-7! text-[15px]!')} onClick={onSample}>
            <Sparkles size={16} />
            Try a sample
          </button>
        </div>
        <p className="rise mt-7 flex items-center justify-center gap-1.5 text-sm text-white/45" style={{ animationDelay: '380ms' }}>
          or paste anywhere with <Kbd>{MOD}</Kbd>
          <Kbd>V</Kbd>
        </p>
      </div>
    </div>
  );
}
