import { AppWindow, ChevronDown, ClipboardPaste, Plus, Download, EyeOff, Focus, MoveUpRight, Palette, ShieldCheck, Sparkles, Wand2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { FAQ, FEATURES, STEPS } from '../content';
import { AppIcon, Kbd, MOD, buttonPrimary, buttonSecondary, cn } from './ui';

const FEATURE_ICONS: Record<string, ReactNode> = {
  backgrounds: <Palette size={18} />,
  frames: <AppWindow size={18} />,
  redact: <EyeOff size={18} />,
  annotate: <MoveUpRight size={18} />,
  spotlight: <Focus size={18} />,
  private: <ShieldCheck size={18} />,
};

const STEP_ICONS = [<ClipboardPaste size={18} />, <Wand2 size={18} />, <Download size={18} />];

interface Props {
  dragOver: boolean;
  onPick: () => void;
  onSample: () => void;
}

/** Landing page shown until an image is opened. Prerendered at build time for search engines. */
export function Home({ dragOver, onPick, onSample }: Props) {
  // The shortcut differs per platform, so it's filled in after hydration to match the prerendered HTML.
  const [mod, setMod] = useState('Ctrl');
  useEffect(() => setMod(MOD), []);

  const actions = (
    <div className="flex flex-wrap justify-center gap-3">
      <button type="button" className={cn(buttonPrimary, 'h-12! px-7! text-[15px]!')} onClick={onPick}>
        Choose image
      </button>
      <button type="button" className={cn(buttonSecondary, 'h-12! px-7! text-[15px]!')} onClick={onSample}>
        <Sparkles size={16} />
        Try a sample
      </button>
    </div>
  );

  return (
    <div className="absolute inset-0 overflow-y-auto">
      <section className="mx-auto grid min-h-full grid-rows-[1fr_auto] justify-items-center">
        <div className="max-w-3xl self-center px-2 py-10 text-center">
          <div className="rise mb-10 flex justify-center" style={{ animationDelay: '60ms' }}>
            <div className={cn('float transition-transform duration-500', dragOver && 'scale-110')}>
              <AppIcon size={112} className={cn('transition-shadow duration-500', dragOver && 'shadow-[0_0_80px_color-mix(in_oklab,var(--color-accent)_80%,transparent)]')} />
            </div>
          </div>
          <h1
            className="rise text-balance font-display text-5xl font-medium leading-[1.02] tracking-[-0.045em] sm:text-7xl"
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
          <p className="rise mx-auto mt-6 max-w-xl text-lg text-ink/60 sm:text-xl" style={{ animationDelay: '220ms' }}>
            A free screenshot beautifier with backgrounds, window frames, arrows and one-drag redaction, right in your browser. Nothing
            ever uploads.
          </p>
          <div className="rise mt-10" style={{ animationDelay: '300ms' }}>
            {actions}
          </div>
          <p className="rise mt-7 flex items-center justify-center gap-1.5 text-sm text-ink/45" style={{ animationDelay: '380ms' }}>
            or paste anywhere with <Kbd>{mod}</Kbd>
            <Kbd>V</Kbd>
          </p>
        </div>
        <a
          href="#features"
          className="rise flex flex-col items-center gap-1 pb-2 text-xs text-ink/40 transition hover:text-ink/70"
          style={{ animationDelay: '600ms' }}
        >
          See what it does
          <ChevronDown size={16} />
        </a>
      </section>

      <div className="mx-auto max-w-5xl space-y-28 px-2 pb-20 pt-16">
        <section id="features" aria-labelledby="features-title" className="scroll-mt-6">
          <SectionHeading id="features-title" lead="Everything a screenshot" accent="needs">
            Make your screenshot ready to share: add a background, a frame and annotations, and hide anything private.
          </SectionHeading>
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <li key={f.id} className="glass rounded-3xl p-6">
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/20">
                  {FEATURE_ICONS[f.id]}
                </div>
                <h3 className="text-[17px] font-semibold tracking-tight">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/60">{f.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="how-title">
          <SectionHeading id="how-title" lead="Three steps." accent="No sign-up.">
            From raw capture to a polished image in under a minute.
          </SectionHeading>
          <ol className="mt-12 grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="glass relative rounded-3xl p-6">
                <span className="absolute right-6 top-5 font-serif text-4xl italic text-ink/15">{i + 1}</span>
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-ink/[0.08] text-ink/80 ring-1 ring-ink/10">
                  {STEP_ICONS[i]}
                </div>
                <h3 className="text-[17px] font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/60">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="faq-title">
          <SectionHeading id="faq-title" lead="Questions," accent="answered" />
          <div className="mx-auto mt-12 max-w-3xl border-t border-ink/10">
            {FAQ.map((item) => (
              <details key={item.q} className="group border-b border-ink/10 py-5">
                <summary className="flex cursor-pointer list-none items-center gap-4 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
                  <Plus size={16} className="shrink-0 text-ink/60 transition-transform duration-300 group-open:rotate-45" />
                  <h3>{item.q}</h3>
                </summary>
                <p className="mt-3 pl-8 text-sm leading-relaxed text-ink/60">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section aria-labelledby="cta-title" className="text-center">
          <h2 id="cta-title" className="text-balance font-display text-3xl font-medium tracking-[-0.04em] sm:text-5xl">
            Ready to <span className="font-serif italic">glaze</span> your first screenshot?
          </h2>
          <div className="mt-8">{actions}</div>
        </section>
      </div>

      <footer className="border-t border-ink/[0.07] px-4 py-8 text-center text-xs text-ink/40">
        Glaze is a free, private screenshot editor. Everything runs in your browser.
      </footer>
    </div>
  );
}

function SectionHeading({ id, lead, accent, children }: { id: string; lead: string; accent: string; children?: ReactNode }) {
  return (
    <div className="text-center">
      <h2 id={id} className="text-balance font-display text-3xl font-medium tracking-[-0.04em] sm:text-5xl">
        {lead} <span className="font-serif italic">{accent}</span>
      </h2>
      {children && <p className="mx-auto mt-4 max-w-xl text-ink/60">{children}</p>}
    </div>
  );
}
