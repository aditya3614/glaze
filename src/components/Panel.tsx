import { Crop, EyeOff, Focus, MoveUpRight, PenLine, RotateCcw, Square, Trash2, Type } from 'lucide-react';
import type { ReactNode } from 'react';
import { PRESETS, SOLIDS, presetCss } from '../lib/backgrounds';
import type { Aspect, Mark, Settings, Tool } from '../lib/types';
import { Kbd, Section, Segmented, Slider, Toggle, cn } from './ui';

interface Props {
  settings: Settings;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  tool: Tool;
  setTool: (t: Tool) => void;
  redactionCount: number;
  annotationCount: number;
  onClear: (types: Mark['type'][]) => void;
  cropped: boolean;
  onResetCrop: () => void;
  selected: Mark | undefined;
}

const ASPECTS: Aspect[] = ['auto', '16:9', '4:3', '1:1', '4:5', '9:16'];
const PEN_COLORS = ['#ff5c8a', '#facc15', '#4ade80', '#38bdf8', '#ffffff', '#18181b'];
const ANNOTATIONS: Mark['type'][] = ['stroke', 'arrow', 'box', 'text', 'spotlight'];

const ANNOTATE_TOOLS: { tool: Exclude<Tool, null>; label: string; key: string; icon: ReactNode }[] = [
  { tool: 'sketch', label: 'Pen', key: 'D', icon: <PenLine size={16} /> },
  { tool: 'arrow', label: 'Arrow', key: 'A', icon: <MoveUpRight size={16} /> },
  { tool: 'box', label: 'Box', key: 'B', icon: <Square size={16} /> },
  { tool: 'text', label: 'Text', key: 'T', icon: <Type size={16} /> },
  { tool: 'spotlight', label: 'Spotlight', key: 'S', icon: <Focus size={16} /> },
];

export function Panel({ settings: s, set, tool, setTool, redactionCount, annotationCount, onClear, cropped, onResetCrop, selected }: Props) {
  const redactMode = tool === 'redact';
  const cropMode = tool === 'crop';
  const textSizing = tool === 'text' || (!tool && selected?.type === 'text');
  return (
    <aside className="glass-panel rise w-full shrink-0 rounded-3xl lg:w-[340px] lg:overflow-y-auto" style={{ animationDelay: '120ms' }}>
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
                  s.bgPreset === p.id ? 'scale-100 ring-2 ring-ink' : 'ring-1 ring-ink/10 hover:scale-105',
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
                  s.bgColor === c ? 'ring-2 ring-ink' : 'ring-1 ring-ink/10 hover:scale-105',
                )}
              />
            ))}
            <label
              title="Custom color"
              className="relative grid aspect-square cursor-pointer place-items-center overflow-hidden rounded-xl ring-1 ring-ink/10 transition hover:scale-105"
              style={{ background: 'conic-gradient(from 90deg, #f87171, #facc15, #4ade80, #22d3ee, #818cf8, #f472b6, #f87171)' }}
            >
              <input type="color" value={s.bgColor} onChange={(e) => set('bgColor', e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
            </label>
          </div>
        )}

        {s.bgType === 'blur' && <p className="text-xs leading-relaxed text-ink/45">A soft, blurred copy of your screenshot fills the background.</p>}
        {s.bgType === 'none' && <p className="text-xs leading-relaxed text-ink/45">Transparent PNG. Great for slides and docs.</p>}

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
            className="h-9 w-full rounded-lg bg-white px-4 font-mono text-[13px] text-ink ring-1 ring-ink/10 outline-none transition placeholder:text-ink/30 focus:ring-accent/60"
          />
        )}
      </Section>

      <Section title="Layout">
        <div className="flex gap-2">
          <ToolButton active={cropMode} onClick={() => setTool(cropMode ? null : 'crop')} icon={<Crop size={15} />} shortcut="C">
            {cropMode ? 'Cropping… drag an area' : cropped ? 'Change crop' : 'Crop screenshot'}
          </ToolButton>
          {cropped && (
            <button
              type="button"
              title="Reset crop"
              aria-label="Reset crop"
              onClick={onResetCrop}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink/[0.07] text-ink/70 ring-1 ring-ink/10 transition hover:bg-ink/[0.12] hover:text-ink"
            >
              <RotateCcw size={15} />
            </button>
          )}
        </div>
        <Segmented size="sm" value={s.aspect} onChange={(v) => set('aspect', v)} options={ASPECTS.map((a) => ({ value: a, label: a === 'auto' ? 'Auto' : a }))} />
        <Slider label="Padding" value={s.padding} min={0} max={250} onChange={(v) => set('padding', v)} />
        <Slider label="Roundness" value={s.radius} min={0} max={48} onChange={(v) => set('radius', v)} />
        <Slider label="Shadow" value={s.shadow} min={0} max={100} onChange={(v) => set('shadow', v)} />
      </Section>

      <Section title="Annotate" aside={annotationCount > 0 && <ClearButton title="Clear all annotations" onClick={() => onClear(ANNOTATIONS)} />}>
        <div className="grid grid-cols-5 gap-1.5">
          {ANNOTATE_TOOLS.map((t) => (
            <button
              key={t.tool}
              type="button"
              title={`${t.label} (${t.key})`}
              aria-pressed={tool === t.tool}
              onClick={() => setTool(tool === t.tool ? null : t.tool)}
              className={cn(
                'flex h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium ring-1 transition duration-200 active:scale-95',
                tool === t.tool
                  ? 'bg-accent/10 text-ink ring-accent/50 shadow-[0_4px_14px_-6px_color-mix(in_oklab,var(--color-accent)_45%,transparent)]'
                  : 'bg-ink/[0.06] text-ink/70 ring-ink/10 hover:bg-ink/[0.11] hover:text-ink',
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {PEN_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              title={c}
              aria-label={c}
              onClick={() => set('penColor', c)}
              style={{ background: c }}
              className={cn(
                'aspect-square rounded-full transition duration-200',
                s.penColor === c ? 'ring-2 ring-ink ring-offset-2 ring-offset-white' : 'ring-1 ring-ink/15 hover:scale-110',
              )}
            />
          ))}
          <label
            title="Custom color"
            className={cn(
              'relative aspect-square cursor-pointer overflow-hidden rounded-full transition hover:scale-110',
              PEN_COLORS.includes(s.penColor) ? 'ring-1 ring-ink/15' : 'ring-2 ring-ink ring-offset-2 ring-offset-white',
            )}
            style={{ background: 'conic-gradient(from 90deg, #f87171, #facc15, #4ade80, #22d3ee, #818cf8, #f472b6, #f87171)' }}
          >
            <input type="color" value={s.penColor} onChange={(e) => set('penColor', e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
          </label>
        </div>
        {textSizing ? (
          <Slider label="Text size" value={s.textSize} min={10} max={90} onChange={(v) => set('textSize', v)} />
        ) : (
          <Slider label="Pen size" value={s.penSize} min={1} max={30} onChange={(v) => set('penSize', v)} />
        )}
        {annotationCount > 0 && !tool && (
          <p className="text-xs leading-relaxed text-ink/45">
            Click a mark to select it and drag to move. <Kbd>⌫</Kbd> deletes, double-click edits text.
          </p>
        )}
      </Section>

      <Section title="Redact" aside={redactionCount > 0 && <ClearButton title="Clear all redactions" onClick={() => onClear(['redact'])} />}>
        <ToolButton active={redactMode} onClick={() => setTool(redactMode ? null : 'redact')} icon={<EyeOff size={15} />} shortcut="R">
          {redactMode ? 'Drawing… drag over secrets' : 'Hide sensitive info'}
        </ToolButton>
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
          <p className="text-xs text-ink/45">
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

function ClearButton({ title, onClick }: { title: string; onClick: () => void }) {
  return (
    <button type="button" title={title} aria-label={title} onClick={onClick} className="rounded-md p-1 text-ink/45 transition hover:bg-ink/[0.08] hover:text-ink">
      <Trash2 size={14} />
    </button>
  );
}

interface ToolButtonProps {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  shortcut: string;
  children: ReactNode;
}

function ToolButton({ active, onClick, icon, shortcut, children }: ToolButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-full px-4 text-[13px] font-medium ring-1 transition duration-300 hover:-translate-y-px active:scale-[.98] disabled:opacity-40',
        active ? 'bg-accent/10 text-ink ring-accent/50 shadow-[0_4px_14px_-6px_color-mix(in_oklab,var(--color-accent)_45%,transparent)]' : 'bg-ink/[0.07] text-ink ring-ink/10 hover:bg-ink/[0.12]',
      )}
    >
      <span className="flex items-center gap-2">
        {icon}
        {children}
      </span>
      <Kbd>{shortcut}</Kbd>
    </button>
  );
}
