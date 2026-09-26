import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, DragEvent, MouseEvent, PointerEvent, ReactNode, RefObject } from 'react';
import { TEXT_LINE_HEIGHT, drawMarks, hitTest, markBounds, textFont, translateMark } from '../lib/marks';
import { computeLayout, enterScreenshotSpace, renderScene } from '../lib/render';
import type { Arrow, Box, Doc, Mark, Rect, Settings, Stroke, TextMark, Tool } from '../lib/types';
import { Home } from './Home';
import { cn } from './ui';

interface Props {
  source: HTMLCanvasElement | null;
  processed: HTMLCanvasElement | null;
  settings: Settings;
  exportScale: number;
  fontsReady: boolean;
  doc: Doc;
  tool: Tool;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (m: Mark) => void;
  onReplace: (m: Mark) => void;
  onDelete: (id: string) => void;
  onCrop: (r: Rect) => void;
  /** Dragging a window corner resizes the screenshot within the frame by changing the padding. */
  onPadding: (padding: number) => void;
  onFile: (f: File) => void;
  onPick: () => void;
  onSample: () => void;
}

/** Keeps the live preview light; exports always render at full resolution. */
const PREVIEW_MAX = 2400;

/** Marks that can be redrawn on the overlay while dragged. Redactions are baked into pixels and spotlights dim as a group. */
const LIVE_MOVE = new Set<Mark['type']>(['stroke', 'arrow', 'box', 'text']);

const HINTS: Record<Exclude<Tool, null>, string> = {
  sketch: 'Draw anywhere',
  arrow: 'Drag to draw an arrow · Shift snaps the angle',
  box: 'Drag to draw a box',
  text: 'Click to add text · Enter to place',
  spotlight: 'Drag over what matters',
  redact: 'Drag over anything sensitive',
  crop: 'Drag to choose the area to keep',
};

/** In-progress pointer gesture, in screenshot pixels. */
type Gesture =
  | { kind: 'draw'; mark: Stroke | Arrow | Box; x0: number; y0: number }
  | { kind: 'rect'; x0: number; y0: number; x1: number; y1: number }
  | { kind: 'move'; mark: Mark; x0: number; y0: number; dx: number; dy: number };

const CORNERS = [
  { dx: 0, dy: 0, cursor: 'cursor-nwse-resize' },
  { dx: 1, dy: 0, cursor: 'cursor-nesw-resize' },
  { dx: 0, dy: 1, cursor: 'cursor-nesw-resize' },
  { dx: 1, dy: 1, cursor: 'cursor-nwse-resize' },
];

type Editing = Omit<TextMark, 'type' | 'id'> & { id: string | null };

const normRect = (x0: number, y0: number, x1: number, y1: number): Rect => ({
  x: Math.min(x0, x1),
  y: Math.min(y0, y1),
  w: Math.abs(x1 - x0),
  h: Math.abs(y1 - y0),
});

export function Stage(props: Props) {
  const { source, processed, settings, exportScale, fontsReady, doc, tool, selectedId, onSelect, onAdd, onReplace, onDelete, onCrop, onPadding } = props;
  const areaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const cancelEdit = useRef(false);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [dragOver, setDragOver] = useState(false);
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [overMark, setOverMark] = useState(false);
  /** Corner drag in progress: window center and half-size on screen, and the window's share of the frame, at drag start. */
  const [resize, setResize] = useState<{ cx: number; cy: number; hw: number; hh: number; qx: number; qy: number } | null>(null);

  const cropping = tool === 'crop';
  const full = useMemo(() => (source ? { x: 0, y: 0, w: source.width, h: source.height } : null), [source]);
  // While cropping, show the whole screenshot so the crop can grow again.
  const view = full && ((!cropping && doc.crop) || full);
  const layout = useMemo(() => (view ? computeLayout(view.w, view.h, settings) : null), [view, settings]);

  useEffect(() => {
    setGesture(null);
    setEditing(null);
  }, [source]);

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setBox({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The mark being moved or edited is drawn on the overlay (or by the text input) instead.
  const liveMove = gesture?.kind === 'move' && LIVE_MOVE.has(gesture.mark.type) ? gesture.mark.id : null;
  const hiddenId = editing?.id ?? liveMove;
  const sceneMarks = useMemo(() => (hiddenId ? doc.marks.filter((m) => m.id !== hiddenId) : doc.marks), [doc.marks, hiddenId]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !layout || !processed || !source || !view) return;
    const ps = Math.min(1, PREVIEW_MAX / Math.max(layout.width, layout.height));
    c.width = Math.round(layout.width * ps);
    c.height = Math.round(layout.height * ps);
    renderScene(c.getContext('2d')!, { source: processed, original: source, view, marks: sceneMarks, layout, settings, scale: ps });
  }, [layout, processed, source, view, sceneMarks, settings, fontsReady]);

  const fit = layout && box.w ? Math.min(box.w / layout.width, box.h / layout.height, 1) : 0;
  const dispW = layout ? layout.width * fit : 0;
  const dispH = layout ? layout.height * fit : 0;

  const overlayMark =
    gesture?.kind === 'draw' ? gesture.mark : liveMove && gesture?.kind === 'move' ? translateMark(gesture.mark, gesture.dx, gesture.dy) : null;

  useEffect(() => {
    const c = overlayRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(dispW * dpr);
    const h = Math.round(dispH * dpr);
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, w, h);
    if (!overlayMark || !layout || !view) return;
    ctx.save();
    ctx.setTransform(dpr * fit, 0, 0, dpr * fit, 0, 0);
    enterScreenshotSpace(ctx, layout, settings, view);
    drawMarks(ctx, [overlayMark], view);
    ctx.restore();
  }, [overlayMark, layout, view, settings, fit, dispW, dispH]);

  if (!source || !layout || !view) {
    return <Frame {...props} areaRef={areaRef} dragOver={dragOver} setDragOver={setDragOver} />;
  }

  /** Client point → screenshot pixels. */
  const toShot = (e: { clientX: number; clientY: number }) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / fit - layout.image.x + view.x, y: (e.clientY - r.top) / fit - layout.image.y + view.y };
  };
  /** Screenshot rect → CSS box inside the stage. */
  const toDisplay = (r: Rect): CSSProperties => ({
    left: (r.x - view.x + layout.image.x) * fit,
    top: (r.y - view.y + layout.image.y) * fit,
    width: r.w * fit,
    height: r.h * fit,
  });
  // Grab distance: a few display pixels, whatever the zoom.
  const tol = 6 / (fit || 1);

  const startEditing = (t: TextMark) => setEditing({ id: t.id, x: t.x, y: t.y, text: t.text, color: t.color, size: t.size });

  const finishEditing = () => {
    const e = editing;
    setEditing(null);
    if (!e || cancelEdit.current) {
      cancelEdit.current = false;
      return;
    }
    const text = e.text.trim();
    const existing = e.id ? doc.marks.find((m): m is TextMark => m.id === e.id && m.type === 'text') : undefined;
    if (existing) {
      if (!text) onDelete(existing.id);
      else if (text !== existing.text) onReplace({ ...existing, text });
    } else if (text) {
      onAdd({ type: 'text', id: crypto.randomUUID(), x: e.x, y: e.y, text, color: e.color, size: e.size });
    }
  };

  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    // A click while typing just finishes the label (via blur).
    if (!fit || e.button !== 0 || editing) return;
    const p = toShot(e);

    if (tool === 'text') {
      const hit = hitTest(doc.marks, p.x, p.y, tol);
      const size = settings.textSize * layout.unit;
      // Deferred past this click's mousedown, which would otherwise blur the new input right away.
      requestAnimationFrame(() =>
        hit?.type === 'text'
          ? startEditing(hit)
          : setEditing({ id: null, x: p.x, y: p.y - (size * TEXT_LINE_HEIGHT) / 2, text: '', color: settings.penColor, size }),
      );
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    const width = settings.penSize * layout.unit;
    const color = settings.penColor;
    const draft = { id: 'draft', color, width };
    switch (tool) {
      case 'sketch':
        return setGesture({ kind: 'draw', x0: p.x, y0: p.y, mark: { ...draft, type: 'stroke', points: [p.x, p.y] } });
      case 'arrow':
        return setGesture({ kind: 'draw', x0: p.x, y0: p.y, mark: { ...draft, type: 'arrow', x1: p.x, y1: p.y, x2: p.x, y2: p.y } });
      case 'box':
        return setGesture({ kind: 'draw', x0: p.x, y0: p.y, mark: { ...draft, type: 'box', x: p.x, y: p.y, w: 0, h: 0 } });
      case 'redact':
      case 'spotlight':
      case 'crop':
        return setGesture({ kind: 'rect', x0: p.x, y0: p.y, x1: p.x, y1: p.y });
      default: {
        const hit = hitTest(doc.marks, p.x, p.y, tol);
        onSelect(hit?.id ?? null);
        if (hit) setGesture({ kind: 'move', mark: hit, x0: p.x, y0: p.y, dx: 0, dy: 0 });
      }
    }
  };

  const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!fit) return;
    if (!gesture) {
      if (!tool) {
        const p = toShot(e);
        setOverMark(!!hitTest(doc.marks, p.x, p.y, tol));
      }
      return;
    }
    const p = toShot(e);
    if (gesture.kind === 'rect') return setGesture({ ...gesture, x1: p.x, y1: p.y });
    if (gesture.kind === 'move') return setGesture({ ...gesture, dx: p.x - gesture.x0, dy: p.y - gesture.y0 });

    const m = gesture.mark;
    if (m.type === 'box') return setGesture({ ...gesture, mark: { ...m, ...normRect(gesture.x0, gesture.y0, p.x, p.y) } });
    if (m.type === 'arrow') {
      let { x, y } = p;
      if (e.shiftKey) {
        const step = Math.PI / 4;
        const a = Math.round(Math.atan2(y - m.y1, x - m.x1) / step) * step;
        const len = Math.hypot(x - m.x1, y - m.y1);
        x = m.x1 + Math.cos(a) * len;
        y = m.y1 + Math.sin(a) * len;
      }
      return setGesture({ ...gesture, mark: { ...m, x2: x, y2: y } });
    }
    // Coalesced events keep fast strokes smooth instead of polygonal.
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [];
    const points = [...m.points];
    for (const ev of events.length ? events : [e.nativeEvent]) {
      const q = toShot(ev);
      if (Math.hypot(q.x - points[points.length - 2], q.y - points[points.length - 1]) * fit >= 1.5) points.push(q.x, q.y);
    }
    setGesture({ ...gesture, mark: { ...m, points } });
  };

  const onPointerUp = () => {
    const g = gesture;
    setGesture(null);
    if (!g || !fit) return;
    const min = 4 / fit;

    if (g.kind === 'move') {
      if (g.dx || g.dy) onReplace(translateMark(g.mark, g.dx, g.dy));
      return;
    }

    if (g.kind === 'draw') {
      const m = g.mark;
      const big = m.type === 'stroke' || (m.type === 'arrow' ? Math.hypot(m.x2 - m.x1, m.y2 - m.y1) > min : m.w > min && m.h > min);
      if (big) onAdd({ ...m, id: crypto.randomUUID() });
      return;
    }

    // Redactions, spotlights and crops are clamped to the visible screenshot.
    const clampX = (v: number) => Math.min(view.x + view.w, Math.max(view.x, v));
    const clampY = (v: number) => Math.min(view.y + view.h, Math.max(view.y, v));
    const r = normRect(clampX(g.x0), clampY(g.y0), clampX(g.x1), clampY(g.y1));
    if (r.w <= min || r.h <= min) return;
    if (tool === 'crop') {
      const x = Math.round(r.x);
      const y = Math.round(r.y);
      onCrop({ x, y, w: Math.round(r.x + r.w) - x, h: Math.round(r.y + r.h) - y });
    } else if (tool === 'redact') {
      onAdd({ ...r, type: 'redact', id: crypto.randomUUID(), style: settings.redactStyle });
    } else if (tool === 'spotlight') {
      onAdd({ ...r, type: 'spotlight', id: crypto.randomUUID() });
    }
  };

  const onDoubleClick = (e: MouseEvent) => {
    if (tool) return;
    const p = toShot(e);
    const hit = hitTest(doc.marks, p.x, p.y, tol);
    if (hit?.type === 'text') startEditing(hit);
  };

  const gestureRect = gesture?.kind === 'rect' ? normRect(gesture.x0, gesture.y0, gesture.x1, gesture.y1) : null;
  const selected = !cropping && selectedId !== editing?.id ? doc.marks.find((m) => m.id === selectedId) : undefined;
  let selectedBox = selected && markBounds(selected);
  if (selectedBox && gesture?.kind === 'move' && gesture.mark.id === selected?.id) {
    selectedBox = { ...selectedBox, x: selectedBox.x + gesture.dx, y: selectedBox.y + gesture.dy };
  }
  const cropBox = cropping ? (gestureRect ?? doc.crop) : null;
  const imageBox = toDisplay(view);

  const startResize = (e: PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const r = canvasRef.current!.getBoundingClientRect();
    const { win } = layout;
    setResize({
      cx: r.left + (win.x + win.w / 2) * fit,
      cy: r.top + (win.y + win.h / 2) * fit,
      hw: (win.w / 2) * fit,
      hh: (win.h / 2) * fit,
      qx: win.w / layout.width,
      qy: win.h / layout.height,
    });
  };

  const moveResize = (e: PointerEvent<HTMLDivElement>) => {
    if (!resize) return;
    // How much bigger the window should look, measured against the frame as it was at drag start.
    const sx = Math.abs(e.clientX - resize.cx) / resize.hw;
    const sy = Math.abs(e.clientY - resize.cy) / resize.hh;
    const horizontal = sx >= sy;
    const target = Math.min(1, horizontal ? sx * resize.qx : sy * resize.qy);
    const share = (padding: number) => {
      const L = computeLayout(view.w, view.h, { ...settings, padding });
      return horizontal ? L.win.w / L.width : L.win.h / L.height;
    };
    // The window's share of the frame shrinks as padding grows, so binary-search the padding.
    let lo = 0;
    let hi = 250;
    for (let i = 0; i < 18; i++) {
      const mid = (lo + hi) / 2;
      if (share(mid) > target) lo = mid;
      else hi = mid;
    }
    const next = Math.round((lo + hi) / 2);
    if (next !== settings.padding) onPadding(next);
  };

  const cursor = tool === 'text' ? 'cursor-text' : tool ? 'cursor-crosshair' : gesture?.kind === 'move' || overMark ? 'cursor-move' : '';

  return (
    <Frame {...props} areaRef={areaRef} dragOver={dragOver} setDragOver={setDragOver}>
      <div className="group relative" style={{ width: dispW, height: dispH }}>
        <div
          className={cn(
            'absolute inset-0 overflow-hidden rounded-xl shadow-[0_30px_80px_-28px_rgba(20,30,60,.35)] ring-1 ring-ink/10 transition-shadow duration-500',
            settings.bgType === 'none' && 'checker',
          )}
        >
          <canvas
            ref={canvasRef}
            className={cn('block h-full w-full touch-none select-none', cursor)}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => setGesture(null)}
            onPointerLeave={() => setOverMark(false)}
            onDoubleClick={onDoubleClick}
          />
          <canvas ref={overlayRef} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />
        </div>

        {gestureRect && !cropping && (
          <div
            className={cn(
              'pointer-events-none absolute rounded-sm border border-dashed',
              tool === 'spotlight' ? 'border-white/80 bg-white/10' : 'border-accent-soft bg-accent/25',
            )}
            style={toDisplay(gestureRect)}
          />
        )}

        {cropping && (
          <svg className="pointer-events-none absolute inset-0 overflow-visible" width={dispW} height={dispH} aria-hidden>
            {cropBox && (
              <>
                <path
                  fillRule="evenodd"
                  fill="rgba(0,0,0,0.6)"
                  d={`M${imageBox.left} ${imageBox.top}h${imageBox.width}v${imageBox.height}h${-Number(imageBox.width)}Z` + rectPath(toDisplay(cropBox))}
                />
                <rect {...svgRect(toDisplay(cropBox))} fill="none" stroke="white" strokeWidth={1.5} strokeDasharray="6 4" />
              </>
            )}
          </svg>
        )}

        {!tool && !editing && !gesture &&
          CORNERS.map(({ dx, dy, cursor }) => (
            <div
              key={cursor + dx + dy}
              title="Drag to resize"
              onPointerDown={startResize}
              onPointerMove={moveResize}
              onPointerUp={() => setResize(null)}
              onPointerCancel={() => setResize(null)}
              className={cn(
                'absolute z-10 grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 touch-none place-items-center transition-opacity duration-200',
                cursor,
                resize ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
              )}
              style={{ left: (layout.win.x + dx * layout.win.w) * fit, top: (layout.win.y + dy * layout.win.h) * fit }}
            >
              <span className="h-3.5 w-3.5 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,.5)] ring-2 ring-accent" />
            </div>
          ))}

        {selectedBox && (
          <div
            className="pointer-events-none absolute rounded-md outline-[1.5px] outline-offset-4 outline-accent outline-dashed"
            style={toDisplay(selectedBox)}
          />
        )}

        {editing && (
          <input
            autoFocus
            value={editing.text}
            placeholder="Type…"
            spellCheck={false}
            onChange={(e) => setEditing({ ...editing, text: e.target.value })}
            onBlur={finishEditing}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
              else if (e.key === 'Escape') {
                cancelEdit.current = true;
                e.currentTarget.blur();
              }
            }}
            className="absolute z-10 rounded-sm bg-white/60 p-0 outline-[1.5px] outline-offset-2 outline-accent outline-dashed placeholder:text-ink/40"
            style={
              {
                ...toDisplay({ x: editing.x, y: editing.y, w: 0, h: editing.size * TEXT_LINE_HEIGHT }),
                width: undefined,
                minWidth: 48,
                fieldSizing: 'content',
                font: textFont(editing.size * fit),
                lineHeight: TEXT_LINE_HEIGHT,
                color: editing.color,
              } as CSSProperties
            }
          />
        )}

        <div className="absolute -bottom-7 left-0 right-0 text-center font-mono text-[11px] text-ink/40">
          {Math.round(layout.width * exportScale)} × {Math.round(layout.height * exportScale)} px
        </div>
      </div>
    </Frame>
  );
}

function rectPath(r: CSSProperties) {
  const [x, y, w, h] = [r.left, r.top, r.width, r.height].map(Number);
  return `M${x} ${y}h${w}v${h}h${-w}Z`;
}

function svgRect(r: CSSProperties) {
  return { x: Number(r.left), y: Number(r.top), width: Number(r.width), height: Number(r.height) };
}

/** The drop zone, tool hint and either the editor or the empty state. */
function Frame({
  source,
  tool,
  onFile,
  onPick,
  onSample,
  areaRef,
  dragOver,
  setDragOver,
  children,
}: Props & {
  areaRef: RefObject<HTMLDivElement | null>;
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  children?: ReactNode;
}) {
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
      {tool && source && (
        <div className="glass rise pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium text-ink">
          {HINTS[tool]} · <span className="opacity-70">Esc to finish</span>
        </div>
      )}

      <div ref={areaRef} className="relative m-6 flex-1 sm:m-10">
        {children ? (
          <div className="absolute inset-0 grid place-items-center">{children}</div>
        ) : (
          <Home dragOver={dragOver} onPick={onPick} onSample={onSample} />
        )}

        {source && dragOver && (
          <div className="glass absolute inset-0 z-30 grid place-items-center rounded-3xl border-dashed border-ink/40 text-sm font-medium text-ink">
            Drop to replace
          </div>
        )}
      </div>
    </main>
  );
}
