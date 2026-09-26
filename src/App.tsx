import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Panel } from './components/Panel';
import { Stage } from './components/Stage';
import { TopBar } from './components/TopBar';
import { cn } from './components/ui';
import { fileToCanvas, makeSample } from './lib/image';
import { applyRedactions } from './lib/redact';
import { computeLayout, renderScene } from './lib/render';
import { DEFAULT_SETTINGS } from './lib/types';
import type { Doc, Mark, Rect, Redaction, Settings, Tool } from './lib/types';
import { useHistory } from './lib/useHistory';

const STORAGE_KEY = 'glaze:settings:v1';
/** Stay under Safari's canvas area limit on big retina screenshots. */
const MAX_EXPORT_AREA = 16_000_000;
const EMPTY_DOC: Doc = { marks: [], crop: null };

const TOOL_KEYS: Record<string, Exclude<Tool, null>> = {
  d: 'sketch',
  a: 'arrow',
  b: 'box',
  t: 'text',
  s: 'spotlight',
  r: 'redact',
  c: 'crop',
};

function loadSettings(): Settings {
  // Prerendering at build time has no browser storage.
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    // Storage unavailable: fall back to defaults.
  }
  return DEFAULT_SETTINGS;
}

export default function App() {
  const [source, setSource] = useState<HTMLCanvasElement | null>(null);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const history = useHistory<Doc>(EMPTY_DOC);
  const { value: doc, commit, undo, redo, reset } = history;
  const [tool, setTool] = useState<Tool>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scale, setScale] = useState<1 | 2>(1);
  const [toast, setToast] = useState<string | null>(null);
  const [fontsReady, setFontsReady] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.fonts.ready.then(() => setFontsReady(true));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Not persisting is fine.
    }
  }, [settings]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  // Picking a drawing tool drops the selection, like in any editor.
  useEffect(() => {
    if (tool) setSelectedId(null);
  }, [tool]);

  const addMark = useCallback((m: Mark) => commit((d) => ({ ...d, marks: [...d.marks, m] })), [commit]);
  const replaceMark = useCallback((m: Mark) => commit((d) => ({ ...d, marks: d.marks.map((x) => (x.id === m.id ? m : x)) })), [commit]);
  const deleteMark = useCallback(
    (id: string) => commit((d) => (d.marks.some((m) => m.id === id) ? { ...d, marks: d.marks.filter((m) => m.id !== id) } : d)),
    [commit],
  );
  const clearMarks = useCallback(
    (types: Mark['type'][]) =>
      commit((d) => (d.marks.some((m) => types.includes(m.type)) ? { ...d, marks: d.marks.filter((m) => !types.includes(m.type)) } : d)),
    [commit],
  );
  const setCrop = useCallback((crop: Rect | null) => commit((d) => (d.crop === crop ? d : { ...d, crop })), [commit]);

  const selected = doc.marks.find((m) => m.id === selectedId);

  const set = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
      setSettings((s) => ({ ...s, [key]: value }));
      // Picking a color while a mark is selected recolors it.
      if (key === 'penColor' && selected && 'color' in selected && selected.color !== value) {
        replaceMark({ ...selected, color: value as string });
      }
    },
    [selected, replaceMark],
  );

  const openImage = useCallback(
    (c: HTMLCanvasElement) => {
      setSource(c);
      reset(EMPTY_DOC);
      setTool(null);
      setSelectedId(null);
    },
    [reset],
  );

  const goHome = useCallback(() => {
    if (!source) return;
    if (history.canUndo && !window.confirm('Leave this screenshot? Your edits will be lost.')) return;
    setSource(null);
    reset(EMPTY_DOC);
    setTool(null);
    setSelectedId(null);
  }, [source, history.canUndo, reset]);

  const loadFile = useCallback(
    async (file: Blob) => {
      if (!file.type.startsWith('image/')) return setToast('That file isn’t an image');
      try {
        openImage(await fileToCanvas(file));
      } catch {
        setToast('Couldn’t read that image');
      }
    },
    [openImage],
  );

  const loadSample = useCallback(async () => openImage(await makeSample()), [openImage]);
  const pick = useCallback(() => fileInput.current?.click(), []);

  const redactions = useMemo(() => doc.marks.filter((m): m is Redaction => m.type === 'redact'), [doc.marks]);
  const processed = useMemo(() => (source ? applyRedactions(source, redactions) : null), [source, redactions]);

  const renderBlob = useCallback(async (): Promise<Blob> => {
    if (!source || !processed) throw new Error('No image');
    const view = doc.crop ?? { x: 0, y: 0, w: source.width, h: source.height };
    const L = computeLayout(view.w, view.h, settings);
    const k = Math.min(scale, Math.sqrt(MAX_EXPORT_AREA / (L.width * L.height)));
    const c = document.createElement('canvas');
    c.width = Math.round(L.width * k);
    c.height = Math.round(L.height * k);
    renderScene(c.getContext('2d')!, { source: processed, original: source, view, marks: doc.marks, layout: L, settings, scale: k });
    return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('Export failed'))), 'image/png'));
  }, [source, processed, doc, settings, scale]);

  const download = useCallback(async () => {
    if (!source) return;
    try {
      const url = URL.createObjectURL(await renderBlob());
      const a = document.createElement('a');
      a.href = url;
      a.download = `glaze-${Date.now()}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setToast('Saved PNG');
    } catch {
      setToast('Export failed');
    }
  }, [source, renderBlob]);

  const copy = useCallback(async () => {
    if (!source) return;
    try {
      // Passing the promise keeps Safari happy: the write starts inside the user gesture.
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': renderBlob() })]);
      setToast('Copied to clipboard');
    } catch {
      setToast('Clipboard blocked. Use Save instead');
    }
  }, [source, renderBlob]);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'));
      const file = item?.getAsFile();
      if (file) {
        e.preventDefault();
        loadFile(file);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [loadFile]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest?.('input, textarea, [contenteditable]')) return;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (mod && key === 's') {
        e.preventDefault();
        download();
      } else if (mod && key === 'c' && source && !window.getSelection()?.toString()) {
        e.preventDefault();
        copy();
      } else if (mod && (key === 'y' || (key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if (mod && key === 'z') {
        e.preventDefault();
        undo();
      } else if ((key === 'backspace' || key === 'delete') && selectedId) {
        e.preventDefault();
        deleteMark(selectedId);
        setSelectedId(null);
      } else if (!mod && !e.altKey && source && TOOL_KEYS[key]) {
        const next = TOOL_KEYS[key];
        setTool((t) => (t === next ? null : next));
      } else if (key === 'escape') {
        if (selectedId) setSelectedId(null);
        else setTool(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [download, copy, undo, redo, deleteMark, source, selectedId]);

  return (
    <div className="flex h-full flex-col">
      <div aria-hidden className="backdrop">
        <div className="aurora" />
        <div className="stars" />
        <div className="stars stars-2" />
        <div className="grain" />
      </div>

      <TopBar
        hasImage={!!source}
        scale={scale}
        setScale={setScale}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onUndo={undo}
        onRedo={redo}
        onHome={goHome}
        onPick={pick}
        onCopy={copy}
        onDownload={download}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 lg:flex-row lg:overflow-hidden">
        <Stage
          source={source}
          processed={processed}
          settings={settings}
          exportScale={scale}
          fontsReady={fontsReady}
          doc={doc}
          tool={tool}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onAdd={addMark}
          onReplace={replaceMark}
          onDelete={deleteMark}
          onPadding={(v) => set('padding', v)}
          onCrop={(r) => {
            setCrop(r);
            setTool(null);
          }}
          onFile={loadFile}
          onPick={pick}
          onSample={loadSample}
        />
        {source && (
          <Panel
            settings={settings}
            set={set}
            tool={tool}
            setTool={setTool}
            redactionCount={redactions.length}
            annotationCount={doc.marks.length - redactions.length}
            onClear={clearMarks}
            cropped={!!doc.crop}
            onResetCrop={() => setCrop(null)}
            selected={selected}
          />
        )}
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) loadFile(f);
          e.target.value = '';
        }}
      />

      <div
        role="status"
        aria-live="polite"
        className={cn(
          'pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_12px_32px_-8px_rgba(0,0,0,.45)] transition duration-500 ease-[cubic-bezier(.2,.8,.2,1)]',
          toast ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-95 opacity-0',
        )}
      >
        {toast}
      </div>
    </div>
  );
}
