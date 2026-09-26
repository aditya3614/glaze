export async function fileToCanvas(file: Blob): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(file);
  const c = document.createElement('canvas');
  c.width = bmp.width;
  c.height = bmp.height;
  c.getContext('2d')!.drawImage(bmp, 0, 0);
  bmp.close();
  return c;
}

const ui = (weight: number, size: number) => `${weight} ${size}px Figtree, ui-sans-serif, system-ui, sans-serif`;
const mono = (size: number) => `500 ${size}px "Geist Mono", ui-monospace, monospace`;

const INK = '#0f172a';
const MUTED = '#64748b';
const BORDER = '#e2e8f0';

const NAV = ['Overview', 'Payments', 'Customers', 'Payouts', 'Disputes', 'Settings'];

/** All data is made up. Each row is [label, value, monospace?]. */
const CUSTOMER: [string, string, boolean?][] = [
  ['Name', 'Rahul Mehta'],
  ['Email', 'rahul.mehta@example.com'],
  ['Phone', '+91 98765 43210'],
  ['Customer ID', 'cus_Nq7xT29LbZ', true],
  ['PAN', 'BQZPM4821K', true],
];

const ACTIVITY: [string, string, string][] = [
  ['Payment created', '14:32:05', '#94a3b8'],
  ['3-D Secure challenge passed', '14:32:19', '#22c55e'],
  ['Authorization requested from issuer', '14:32:20', '#94a3b8'],
  ['Declined: insufficient funds', '14:32:21', '#ef4444'],
];

/**
 * A fake payments dashboard so people can try Glaze instantly: it has personal
 * details worth redacting and a failed payment worth pointing at.
 */
export async function makeSample(): Promise<HTMLCanvasElement> {
  await Promise.all([document.fonts.load(ui(400, 16)), document.fonts.load(ui(700, 16)), document.fonts.load(mono(16))]).catch(
    () => undefined,
  );

  const W = 1600;
  const H = 1000;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d')!;
  x.textBaseline = 'middle';

  const box = (bx: number, by: number, w: number, h: number, r: number, fill: string | CanvasGradient, stroke?: string) => {
    x.beginPath();
    x.roundRect(bx, by, w, h, r);
    x.fillStyle = fill;
    x.fill();
    if (stroke) {
      x.strokeStyle = stroke;
      x.lineWidth = 1.5;
      x.stroke();
    }
  };
  const text = (s: string, tx: number, ty: number, font: string, color: string, align: CanvasTextAlign = 'left') => {
    x.font = font;
    x.fillStyle = color;
    x.textAlign = align;
    x.fillText(s, tx, ty);
    return x.measureText(s).width;
  };
  const card = (cx: number, cy: number, w: number, h: number, title: string) => {
    box(cx, cy, w, h, 16, '#ffffff', BORDER);
    text(title, cx + 28, cy + 36, ui(700, 18), INK);
    x.fillStyle = BORDER;
    x.fillRect(cx, cy + 68, w, 1);
  };
  const badge = (label: string, right: number, cy: number, fill: string, color: string) => {
    x.font = ui(600, 14);
    const w = x.measureText(label).width + 28;
    box(right - w, cy - 15, w, 30, 15, fill);
    text(label, right - w / 2, cy, ui(600, 14), color, 'center');
  };

  x.fillStyle = '#f6f7f9';
  x.fillRect(0, 0, W, H);

  // Sidebar
  x.fillStyle = '#ffffff';
  x.fillRect(0, 0, 260, H);
  x.fillStyle = BORDER;
  x.fillRect(259, 0, 1, H);
  const logo = x.createLinearGradient(28, 22, 64, 58);
  logo.addColorStop(0, '#818cf8');
  logo.addColorStop(1, '#4f46e5');
  box(28, 20, 38, 38, 11, logo);
  text('P', 47, 40, ui(700, 20), '#ffffff', 'center');
  text('Paydeck', 80, 40, ui(700, 21), INK);
  NAV.forEach((label, i) => {
    const ny = 118 + i * 50;
    const active = label === 'Payments';
    if (active) box(16, ny - 21, 228, 42, 10, '#eef2ff');
    box(36, ny - 8, 16, 16, 5, active ? '#4f46e5' : '#cbd5e1');
    text(label, 66, ny, ui(active ? 600 : 500, 16), active ? '#4338ca' : MUTED);
  });
  box(24, H - 76, 42, 42, 21, '#fde68a');
  text('AK', 45, H - 55, ui(700, 14), '#92400e', 'center');
  text('Ananya K.', 78, H - 64, ui(600, 15), INK);
  text('Admin', 78, H - 44, ui(400, 13), MUTED);

  // Top bar
  x.fillStyle = '#ffffff';
  x.fillRect(260, 0, W - 260, 72);
  x.fillStyle = BORDER;
  x.fillRect(260, 71, W - 260, 1);
  let bx = 300;
  bx += text('Payments', bx, 36, ui(500, 15), MUTED) + 12;
  bx += text('/', bx, 36, ui(500, 15), '#cbd5e1') + 12;
  text('pay_8KzQ3mX1vT', bx, 36, mono(15), INK);
  box(W - 440, 17, 300, 38, 10, '#f1f5f9');
  text('Search payments…', W - 416, 36, ui(400, 15), '#94a3b8');
  text('⌘K', W - 160, 36, mono(13), '#94a3b8', 'right');
  box(W - 116, 17, 38, 38, 19, '#f1f5f9');
  box(W - 103, 30, 12, 12, 6, '#94a3b8');
  box(W - 66, 17, 38, 38, 19, '#c7d2fe');
  text('AK', W - 47, 36, ui(700, 13), '#3730a3', 'center');

  const L = 300;
  const R = W - 60;

  // Title
  text('Payment details', L, 120, ui(700, 30), INK);
  text('Created Sep 24, 2026 at 14:32 IST', L, 156, ui(400, 16), MUTED);
  box(R - 124, 100, 124, 42, 10, '#ffffff', BORDER);
  text('Export', R - 62, 121, ui(600, 15), INK, 'center');

  // Failure banner: the thing worth highlighting.
  box(L, 188, R - L, 86, 14, '#fef2f2', '#fecaca');
  box(L + 24, 211, 40, 40, 20, '#ef4444');
  text('!', L + 44, 232, ui(700, 22), '#ffffff', 'center');
  text('Payment failed', L + 82, 217, ui(700, 18), '#991b1b');
  text('Card declined by the issuing bank: insufficient funds (code 51).', L + 82, 246, ui(400, 16), '#b91c1c');
  box(R - 190, 209, 166, 44, 10, '#dc2626');
  text('Retry payment', R - 107, 231, ui(600, 16), '#ffffff', 'center');

  // Summary
  const sw = 600;
  card(L, 300, sw, 344, 'Summary');
  text('Amount', L + 28, 396, ui(500, 14), MUTED);
  text('₹12,499.00', L + 28, 434, ui(700, 36), INK);
  const summary: [string, string][] = [
    ['Status', ''],
    ['Payment method', 'Visa •••• 4242'],
    ['Order ID', 'ORD-2026-00871'],
  ];
  summary.forEach(([label, value], i) => {
    const ry = 494 + i * 50;
    x.fillStyle = '#f1f5f9';
    x.fillRect(L + 28, ry - 25, sw - 56, 1);
    text(label, L + 28, ry, ui(500, 15), MUTED);
    if (label === 'Status') badge('Failed', L + sw - 28, ry, '#fee2e2', '#b91c1c');
    else text(value, L + sw - 28, ry, i === 2 ? mono(15) : ui(600, 15), INK, 'right');
  });

  // Customer: personal details worth redacting.
  const cx = L + sw + 24;
  const cw = R - cx;
  card(cx, 300, cw, 344, 'Customer');
  badge('KYC verified', cx + cw - 28, 336, '#dcfce7', '#15803d');
  CUSTOMER.forEach(([label, value, isMono], i) => {
    const ry = 400 + i * 52;
    if (i) {
      x.fillStyle = '#f1f5f9';
      x.fillRect(cx + 28, ry - 26, cw - 56, 1);
    }
    text(label, cx + 28, ry, ui(500, 15), MUTED);
    text(value, cx + cw - 28, ry, isMono ? mono(16) : ui(600, 16), INK, 'right');
  });

  // Activity timeline
  card(L, 668, R - L, 296, 'Activity');
  x.fillStyle = BORDER;
  x.fillRect(L + 35, 766, 2, (ACTIVITY.length - 1) * 48);
  ACTIVITY.forEach(([label, time, dot], i) => {
    const ay = 766 + i * 48;
    const last = i === ACTIVITY.length - 1;
    box(L + 29, ay - 7, 14, 14, 7, dot, '#ffffff');
    text(label, L + 60, ay, ui(last ? 600 : 500, 16), last ? '#b91c1c' : INK);
    text(time, R - 28, ay, mono(14), MUTED, 'right');
  });

  return c;
}
