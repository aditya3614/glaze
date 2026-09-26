// Home page copy. Also read by vite.config.ts to build the structured data, so the
// FAQ search engines see always matches the one on the page.

export const SITE_NAME = 'Glaze';

export const FEATURES: { id: string; title: string; body: string }[] = [
  {
    id: 'backgrounds',
    title: 'Gorgeous backgrounds',
    body: 'Hand-tuned mesh gradients, solid colors, a soft blurred copy of your shot, or a transparent PNG for slides and docs.',
  },
  {
    id: 'frames',
    title: 'Window frames',
    body: 'Wrap any capture in a macOS or browser window, light or dark, with your own URL in the address bar.',
  },
  {
    id: 'redact',
    title: 'One-drag redaction',
    body: 'Pixelate, blur or black out API keys, emails, phone numbers and IDs. Redactions are baked into the exported pixels.',
  },
  {
    id: 'annotate',
    title: 'Arrows, boxes and text',
    body: 'Point things out with arrows, boxes, a freehand pen and text labels that stay readable on any background.',
  },
  {
    id: 'spotlight',
    title: 'Spotlight and crop',
    body: 'Dim everything except what matters, crop away the rest, and pick an aspect ratio for X, LinkedIn or Instagram.',
  },
  {
    id: 'private',
    title: 'Private by design',
    body: 'Everything happens in your browser. Your screenshots are never uploaded, and there is no account to create.',
  },
];

export const STEPS: { title: string; body: string }[] = [
  { title: 'Add a screenshot', body: 'Drop an image, paste it straight from your clipboard, or pick a file.' },
  { title: 'Style and mark it up', body: 'Choose a background and frame, hide sensitive details, and add arrows or text.' },
  { title: 'Copy or save', body: 'Copy the result to your clipboard or save a crisp PNG at up to twice the original size.' },
];

export const FAQ: { q: string; a: string }[] = [
  {
    q: 'Is Glaze free?',
    a: 'Yes. Glaze is free to use, with no sign-up and no limits. The small “glazed” watermark can be switched off.',
  },
  {
    q: 'Are my screenshots uploaded anywhere?',
    a: 'No. Glaze runs entirely in your browser, so your images never leave your device. That makes it safe for screenshots of internal tools, dashboards and customer data.',
  },
  {
    q: 'How do I hide sensitive information in a screenshot?',
    a: 'Choose “Hide sensitive info” (or press R) and drag over the area. You can pixelate, blur or cover it with a solid block. For passwords, API keys and ID numbers, use Solid: it is the only style that leaves nothing to recover.',
  },
  {
    q: 'How do I add a background to a screenshot?',
    a: 'Drop your screenshot into Glaze and pick a gradient, a solid color or a blurred background. Adjust padding, rounded corners and shadow, then copy or save the image.',
  },
  {
    q: 'Can I add arrows and text to a screenshot?',
    a: 'Yes. Use the pen (D), arrow (A), box (B), text (T) and spotlight (S) tools. Click any mark to select it, drag to move it, and press Delete to remove it.',
  },
  {
    q: 'Which image formats does Glaze support?',
    a: 'Any image your browser can open, including PNG, JPEG, WebP and GIF. Glaze exports PNG, with a transparent background if you choose none.',
  },
];
