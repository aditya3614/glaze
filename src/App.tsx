import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Panel } from './components/Panel';
import { Stage } from './components/Stage';
import { TopBar } from './components/TopBar';
import { cn } from './components/ui';
import { fileToCanvas, makeSample } from './lib/image';
import { applyRedactions } from './lib/redact';
import { computeLayout, renderScene } from './lib/render';
import type { Rect } from './lib/render';
import { DEFAULT_SETTINGS } from './lib/types';
import type { Redaction, Settings } from './lib/types';

const STORAGE_KEY = 'glaze:settings:v1';
/** Stay under Safari's canvas area limit on big retina screenshots. */
const MAX_EXPORT_AREA = 16_000_000;

function loadSettings(): Settings {
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
  const [redactions, setRedactions] = useState<Redaction[]>([]);
  const [redactMode, setRedactMode] = useState(false);
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

  const set = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }));
  }, []);

  const openImage = useCallback((c: HTMLCanvasElement) => {
    setSource(c);
    setRedactions([]);
    setRedactMode(false);
  }, []);

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

  const processed = useMemo(() => (source ? applyRedactions(source, redactions) : null), [source, redactions]);

  const addRedaction = useCallback(
    (r: Rect) => setRedactions((list) => [...list, { ...r, id: crypto.randomUUID(), style: settings.redactStyle }]),
    [settings.redactStyle],
  );

  const renderBlob = useCallback(async (): Promise<Blob> => {
    if (!source || !processed) throw new Error('No image');
    const L = computeLayout(source.width, source.height, settings);
    const k = Math.min(scale, Math.sqrt(MAX_EXPORT_AREA / (L.width * L.height)));
    const c = document.createElement('canvas');
    c.width = Math.round(L.width * k);
    c.height = Math.round(L.height * k);
    renderScene(c.getContext('2d')!, { source: processed, original: source, layout: L, settings, scale: k });
    return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('Export failed'))), 'image/png'));
  }, [source, processed, settings, scale]);

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
      } else if (mod && key === 'z' && redactions.length) {
        e.preventDefault();
        setRedactions((r) => r.slice(0, -1));
      } else if (!mod && key === 'r' && source) {
        setRedactMode((m) => !m);
      } else if (key === 'escape') {
        setRedactMode(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [download, copy, source, redactions.length]);

  return (
    <div className="flex h-full flex-col">
      <div aria-hidden className="backdrop">
        <div className="aurora" />
        <div className="stars" />
        <div className="stars stars-2" />
        <div className="grain" />
      </div>

      <TopBar hasImage={!!source} scale={scale} setScale={setScale} onPick={pick} onCopy={copy} onDownload={download} />

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 lg:flex-row lg:overflow-hidden">
        <Stage
          source={source}
          processed={processed}
          settings={settings}
          exportScale={scale}
          fontsReady={fontsReady}
          redactMode={redactMode}
          onRedact={addRedaction}
          onFile={loadFile}
          onPick={pick}
          onSample={loadSample}
        />
        {source && (
          <Panel
            settings={settings}
            set={set}
            redactMode={redactMode}
            setRedactMode={setRedactMode}
            redactionCount={redactions.length}
            onUndoRedaction={() => setRedactions((r) => r.slice(0, -1))}
            onClearRedactions={() => setRedactions([])}
            hasImage
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
          'pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-white px-5 py-2.5 text-[13px] font-semibold text-zinc-900 shadow-[0_12px_40px_-8px_rgba(255,92,138,.6)] transition duration-500 ease-[cubic-bezier(.2,.8,.2,1)]',
          toast ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-95 opacity-0',
        )}
      >
        {toast}
      </div>
    </div>
  );
}
