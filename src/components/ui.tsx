import type { CSSProperties, ReactNode } from 'react';

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export const MOD = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘' : 'Ctrl';

export function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-b border-white/[0.07] px-5 py-5 last:border-b-0">
      <div className="mb-3.5 flex h-5 items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">{title}</h2>
        {aside}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}

export function Slider({ label, value, min, max, step = 1, onChange }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="block">
      <div className="mb-1.5 flex justify-between text-[13px]">
        <span className="text-white/80">{label}</span>
        <span className="font-mono tabular-nums text-white/40">{value}</span>
      </div>
      <input
        type="range"
        className="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ '--fill': `${pct}%` } as CSSProperties}
      />
    </label>
  );
}

interface SegmentedProps<T extends string | number> {
  options: { value: T; label: ReactNode; title?: string }[];
  value: T;
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
}

export function Segmented<T extends string | number>({ options, value, onChange, size = 'md' }: SegmentedProps<T>) {
  const i = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div
      className="relative grid rounded-full bg-black/30 p-1 ring-1 ring-white/10"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <div
        aria-hidden
        className="absolute bottom-1 left-1 top-1 rounded-full bg-white/[0.14] shadow-[inset_0_1px_0_rgba(255,255,255,.18),0_2px_8px_rgba(0,0,0,.25)] transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)]"
        style={{ width: `calc((100% - 8px) / ${options.length})`, transform: `translateX(${i * 100}%)` }}
      />
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          title={o.title}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'relative z-10 flex items-center justify-center gap-1.5 rounded-full font-medium transition-colors duration-200',
            size === 'sm' ? 'h-7 text-xs' : 'h-8 text-[13px]',
            o.value === value ? 'text-white' : 'text-white/50 hover:text-white/85',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between text-[13px] text-white/80"
    >
      <span>{label}</span>
      <span
        className={cn(
          'relative h-5 w-9 rounded-full transition-colors duration-300',
          checked ? 'bg-rose-glaze shadow-[0_0_14px_rgba(255,92,138,.5)]' : 'bg-white/15',
        )}
      >
        <span
          className={cn(
            'absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-300 ease-[cubic-bezier(.3,1.5,.5,1)]',
            checked && 'translate-x-4',
          )}
        />
      </span>
    </button>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-white/15 bg-white/[0.07] px-1 font-sans text-[11px] font-medium text-white/60">
      {children}
    </kbd>
  );
}

/** Glossy app-icon tile with an embossed droplet. */
export function AppIcon({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <div className={cn('app-icon grid shrink-0 place-items-center', className)} style={{ width: size, height: size, borderRadius: size * 0.28 }}>
      <svg viewBox="0 0 24 24" width={size * 0.56} height={size * 0.56} aria-hidden>
        <path fill="#9a1747" d="M12 2.5s-6.5 7-6.5 11.3a6.5 6.5 0 0 0 13 0C18.5 9.5 12 2.5 12 2.5z" />
        <ellipse cx="9.6" cy="13.8" rx="1.3" ry="2.3" fill="#ffc2d6" opacity=".55" transform="rotate(20 9.6 13.8)" />
      </svg>
    </div>
  );
}

const pill =
  'inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition duration-300 ease-[cubic-bezier(.2,.8,.2,1)] active:scale-[.97] disabled:pointer-events-none disabled:opacity-40';

/** White pill, like "Get now". */
export const buttonPrimary = cn(
  pill,
  'btn-shine h-9 bg-white px-4 text-[13px] font-semibold text-zinc-950 shadow-[0_1px_0_rgba(255,255,255,.6)_inset,0_6px_20px_-8px_rgba(255,255,255,.4)] hover:-translate-y-px hover:shadow-[0_1px_0_rgba(255,255,255,.6)_inset,0_10px_28px_-8px_rgba(255,92,138,.65)]',
);

/** Dark translucent pill, like "Sign in" / "Explore". */
export const buttonSecondary = cn(
  pill,
  'h-9 bg-white/[0.08] px-4 text-[13px] text-white ring-1 ring-white/10 hover:-translate-y-px hover:bg-white/[0.14] hover:ring-white/20',
);

/** Quiet text pill for toolbars. */
export const buttonGhost = cn(pill, 'h-9 px-3 text-[13px] text-white/70 hover:bg-white/[0.08] hover:text-white');
