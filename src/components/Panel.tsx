import { EyeOff, Trash2, Undo2 } from 'lucide-react';
import { PRESETS, SOLIDS, presetCss } from '../lib/backgrounds';
import type { Aspect, Settings } from '../lib/types';
import { Kbd, Section, Segmented, Slider, Toggle, cn } from './ui';

interface Props {
  settings: Settings;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  redactMode: boolean;
  setRedactMode: (v: boolean) => void;
  redactionCount: number;
  onUndoRedaction: () => void;
  onClearRedactions: () => void;
  hasImage: boolean;
}

const ASPECTS: Aspect[] = ['auto', '16:9', '4:3', '1:1', '4:5', '9:16'];

export function Panel({ settings: s, set, redactMode, setRedactMode, redactionCount, onUndoRedaction, onClearRedactions, hasImage }: Props) {
  return (
    <aside className="glass rise w-full shrink-0 rounded-3xl lg:w-[340px] lg:overflow-y-auto" style={{ animationDelay: '120ms' }}>
      <Section title="Background">
        <Segmented
          value={s.bgType}
          onChange={(v) => set('bgType', v)}
          options={[
            { value: 'preset', label: 'Gradient' },
            { value: 'solid', label: 'Solid' },
            { value: 'blur', label: 'Blur' },
            { value: 'none', label: 'None' },
          ]}
        />

        {s.bgType === 'preset' && (
          <div className="grid grid-cols-6 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                title={p.name}
                aria-label={p.name}
                onClick={() => set('bgPreset', p.id)}
                style={{ background: presetCss(p) }}
                className={cn(
                  'aspect-square rounded-xl ring-offset-2 ring-offset-transparent transition duration-200',
                  s.bgPreset === p.id ? 'scale-100 ring-2 ring-white' : 'ring-1 ring-white/10 hover:scale-105',
                )}
              />
            ))}
          </div>
        )}

        {s.bgType === 'solid' && (
          <div className="grid grid-cols-6 gap-2">
            {SOLIDS.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                aria-label={c}
                onClick={() => set('bgColor', c)}
                style={{ background: c }}
                className={cn(
                  'aspect-square rounded-xl ring-offset-2 ring-offset-transparent transition duration-200',
                  s.bgColor === c ? 'ring-2 ring-white' : 'ring-1 ring-white/10 hover:scale-105',
                )}
              />
            ))}
            <label
              title="Custom color"
              className="relative grid aspect-square cursor-pointer place-items-center overflow-hidden rounded-xl ring-1 ring-white/10 transition hover:scale-105"
              style={{ background: 'conic-gradient(from 90deg, #f87171, #facc15, #4ade80, #22d3ee, #818cf8, #f472b6, #f87171)' }}
            >
              <input type="color" value={s.bgColor} onChange={(e) => set('bgColor', e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
            </label>
          </div>
        )}

        {s.bgType === 'blur' && <p className="text-xs leading-relaxed text-white/45">A soft, blurred copy of your screenshot fills the background.</p>}
        {s.bgType === 'none' && <p className="text-xs leading-relaxed text-white/45">Transparent PNG. Great for slides and docs.</p>}

        {s.bgType !== 'none' && <Toggle label="Film grain" checked={s.grain} onChange={(v) => set('grain', v)} />}
      </Section>

      <Section title="Frame">
        <Segmented
          value={s.frame}
          onChange={(v) => set('frame', v)}
          options={[
            { value: 'none', label: 'None' },
            { value: 'mac', label: 'macOS' },
            { value: 'browser', label: 'Browser' },
          ]}
        />
        {s.frame !== 'none' && (
          <Segmented
            size="sm"
            value={s.frameTheme}
            onChange={(v) => set('frameTheme', v)}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
        )}
        {s.frame === 'browser' && (
          <input
            value={s.url}
            onChange={(e) => set('url', e.target.value)}
            placeholder="yoursite.com"
            spellCheck={false}
            className="h-9 w-full rounded-lg bg-black/30 px-4 font-mono text-[13px] text-white ring-1 ring-white/10 outline-none transition placeholder:text-white/30 focus:ring-rose-glaze/60"
          />
        )}
      </Section>

      <Section title="Layout">
        <Segmented size="sm" value={s.aspect} onChange={(v) => set('aspect', v)} options={ASPECTS.map((a) => ({ value: a, label: a === 'auto' ? 'Auto' : a }))} />
        <Slider label="Padding" value={s.padding} min={0} max={250} onChange={(v) => set('padding', v)} />
        <Slider label="Roundness" value={s.radius} min={0} max={48} onChange={(v) => set('radius', v)} />
        <Slider label="Shadow" value={s.shadow} min={0} max={100} onChange={(v) => set('shadow', v)} />
      </Section>

      <Section
        title="Redact"
        aside={
          redactionCount > 0 && (
            <div className="flex items-center gap-1">
              <button type="button" title="Undo last" onClick={onUndoRedaction} className="rounded-md p-1 text-white/45 transition hover:bg-white/[0.08] hover:text-white">
                <Undo2 size={14} />
              </button>
              <button type="button" title="Clear all" onClick={onClearRedactions} className="rounded-md p-1 text-white/45 transition hover:bg-white/[0.08] hover:text-white">
                <Trash2 size={14} />
              </button>
            </div>
          )
        }
      >
        <button
          type="button"
          disabled={!hasImage}
          onClick={() => setRedactMode(!redactMode)}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-full px-4 text-[13px] font-medium ring-1 transition duration-300 hover:-translate-y-px active:scale-[.98] disabled:opacity-40',
            redactMode ? 'bg-rose-glaze/20 text-white ring-rose-glaze/60 shadow-[0_0_24px_-4px_rgba(255,92,138,.6)]' : 'bg-white/[0.07] text-white ring-white/10 hover:bg-white/[0.12]',
          )}
        >
          <span className="flex items-center gap-2">
            <EyeOff size={15} />
            {redactMode ? 'Drawing… drag over secrets' : 'Hide sensitive info'}
          </span>
          <Kbd>R</Kbd>
        </button>
        <Segmented
          size="sm"
          value={s.redactStyle}
          onChange={(v) => set('redactStyle', v)}
          options={[
            { value: 'pixelate', label: 'Pixelate' },
            { value: 'blur', label: 'Blur' },
            { value: 'solid', label: 'Solid' },
          ]}
        />
        {redactionCount > 0 && (
          <p className="text-xs text-white/45">
            {redactionCount} {redactionCount === 1 ? 'area' : 'areas'} hidden. The original pixels are destroyed in the export.
          </p>
        )}
      </Section>

      <Section title="Extras">
        <Toggle label="“glazed” watermark" checked={s.watermark} onChange={(v) => set('watermark', v)} />
      </Section>
    </aside>
  );
}
