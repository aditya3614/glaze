export async function fileToCanvas(file: Blob): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(file);
  const c = document.createElement('canvas');
  c.width = bmp.width;
  c.height = bmp.height;
  c.getContext('2d')!.drawImage(bmp, 0, 0);
  bmp.close();
  return c;
}

const CODE = [
  'import { createClient } from "@acme/payments";',
  '',
  'const client = createClient({',
  '  apiKey: "sk_live_51Hc9xQ2eZvKYlo2C8a7TqWd",',
  '  region: "ap-south-1",',
  '});',
  '',
  'export async function checkout(order: Order) {',
  '  const session = await client.sessions.create({',
  '    amount: order.total,',
  '    currency: "INR",',
  '    customer: "priya@example.com",',
  '  });',
  '',
  '  return session.url;',
  '}',
];

const KEYWORDS = new Set(['import', 'from', 'const', 'export', 'async', 'function', 'await', 'return']);
const FILES: [string, number, boolean?][] = [
  ['src', 0],
  ['api', 1],
  ['checkout.ts', 2, true],
  ['orders.ts', 2],
  ['webhooks.ts', 2],
  ['lib', 1],
  ['.env.local', 0],
  ['package.json', 0],
  ['tsconfig.json', 0],
];

function tokenColor(line: string, tok: string, end: number): string {
  if (tok.startsWith('"')) return '#a5d6ff';
  if (!/^[A-Za-z_$]/.test(tok)) return '#c9d1d9';
  if (KEYWORDS.has(tok)) return '#ff7b72';
  if (/^[A-Z]/.test(tok)) return '#ffa657';
  if (line[end] === '(') return '#d2a8ff';
  if (line[end] === ':') return '#79c0ff';
  return '#e6edf3';
}

/** A fake code-editor screenshot so people can try Glaze instantly. */
export async function makeSample(): Promise<HTMLCanvasElement> {
  await Promise.all([
    document.fonts.load('22px "Geist Mono"'),
    document.fonts.load('500 17px Geist'),
  ]).catch(() => undefined);

  const W = 1600;
  const H = 1000;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d')!;

  x.fillStyle = '#0d1117';
  x.fillRect(0, 0, W, H);

  // Sidebar
  x.fillStyle = '#010409';
  x.fillRect(0, 0, 280, H);
  x.fillStyle = '#21262d';
  x.fillRect(279, 0, 1, H);
  x.font = '600 13px Geist, sans-serif';
  x.fillStyle = '#7d8590';
  x.textBaseline = 'middle';
  x.fillText('EXPLORER', 28, 30);
  x.font = '500 17px Geist, sans-serif';
  FILES.forEach(([name, depth, active], i) => {
    const y = 76 + i * 38;
    if (active) {
      x.fillStyle = 'rgba(56,139,253,0.15)';
      x.fillRect(0, y - 17, 279, 34);
    }
    x.fillStyle = active ? '#e6edf3' : '#9198a1';
    x.fillText(name, 28 + depth * 20, y);
  });

  // Tabs
  x.fillStyle = '#010409';
  x.fillRect(280, 0, W - 280, 54);
  x.fillStyle = '#0d1117';
  x.fillRect(280, 0, 200, 54);
  x.fillStyle = '#f78166';
  x.fillRect(280, 0, 200, 2);
  x.font = '500 16px Geist, sans-serif';
  x.fillStyle = '#e6edf3';
  x.fillText('checkout.ts', 312, 28);
  x.fillStyle = '#7d8590';
  x.fillText('orders.ts', 512, 28);

  // Code
  x.font = '22px "Geist Mono", ui-monospace, monospace';
  x.textBaseline = 'alphabetic';
  CODE.forEach((line, i) => {
    const y = 122 + i * 42;
    x.textAlign = 'right';
    x.fillStyle = '#6e7681';
    x.fillText(String(i + 1), 344, y);
    x.textAlign = 'left';
    let cx = 380;
    const re = /("[^"]*")|([A-Za-z_$][\w$]*)|(\s+)|(.)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line))) {
      const tok = m[0];
      x.fillStyle = tokenColor(line, tok, re.lastIndex);
      x.fillText(tok, cx, y);
      cx += x.measureText(tok).width;
    }
  });

  // Status bar
  x.fillStyle = '#161b22';
  x.fillRect(0, H - 34, W, 34);
  x.font = '500 14px Geist, sans-serif';
  x.textBaseline = 'middle';
  x.fillStyle = '#9198a1';
  x.fillText('main   ✓ 0 problems', 24, H - 17);
  x.textAlign = 'right';
  x.fillText('TypeScript   UTF-8   Ln 4, Col 12', W - 24, H - 17);

  return c;
}
