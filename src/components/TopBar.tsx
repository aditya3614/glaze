import { Copy, Download, ImagePlus, Sparkles } from 'lucide-react';
import { AppIcon, Kbd, MOD, Segmented, buttonGhost, buttonPrimary, buttonSecondary } from './ui';

interface Props {
  hasImage: boolean;
  scale: 1 | 2;
  setScale: (s: 1 | 2) => void;
  onPick: () => void;
  onCopy: () => void;
  onDownload: () => void;
}

export function TopBar({ hasImage, scale, setScale, onPick, onCopy, onDownload }: Props) {
  return (
    <header className="rise relative z-20 flex shrink-0 justify-center px-4 pt-4">
      <nav className="glass flex w-full max-w-4xl items-center justify-between gap-2 rounded-full py-1.5 pl-2 pr-1.5">
        <div className="flex items-center gap-2.5 pl-1">
          <AppIcon size={30} />
          <span className="text-[16px] font-semibold tracking-tight">Glaze</span>
          <span className="hidden rounded-full bg-white/[0.07] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/50 ring-1 ring-white/10 sm:inline">
            beta
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button type="button" className={buttonGhost} onClick={onPick}>
            <ImagePlus size={15} />
            <span className="hidden sm:inline">{hasImage ? 'Replace' : 'Open'}</span>
          </button>
          {hasImage && (
            <>
              <div className="hidden w-[92px] sm:block">
                <Segmented
                  size="sm"
                  value={scale}
                  onChange={setScale}
                  options={[
                    { value: 1, label: '1x', title: 'Export at original size' },
                    { value: 2, label: '2x', title: 'Export at double size' },
                  ]}
                />
              </div>
              <button type="button" className={buttonSecondary} onClick={onCopy}>
                <Copy size={15} />
                <span className="hidden sm:inline">Copy</span>
                <span className="hidden gap-0.5 md:inline-flex">
                  <Kbd>{MOD}</Kbd>
                  <Kbd>C</Kbd>
                </span>
              </button>
            </>
          )}
          <button type="button" className={buttonPrimary} onClick={hasImage ? onDownload : onPick}>
            {hasImage ? <Download size={15} /> : <Sparkles size={15} />}
            {hasImage ? 'Save' : 'Get started'}
          </button>
        </div>
      </nav>
    </header>
  );
}
