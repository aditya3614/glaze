export type BgType = 'preset' | 'solid' | 'blur' | 'none';
export type FrameKind = 'none' | 'mac' | 'browser';
export type FrameTheme = 'light' | 'dark';
export type Aspect = 'auto' | '16:9' | '4:3' | '1:1' | '4:5' | '9:16';
export type RedactStyle = 'pixelate' | 'blur' | 'solid';
/** The active drawing tool. `null` means the pointer selects and moves marks. */
export type Tool = 'sketch' | 'arrow' | 'box' | 'text' | 'spotlight' | 'redact' | 'crop' | null;

export interface Settings {
  bgType: BgType;
  bgPreset: string;
  bgColor: string;
  grain: boolean;
  frame: FrameKind;
  frameTheme: FrameTheme;
  url: string;
  aspect: Aspect;
  /** All sizes below are in "units": 1/1000 of the screenshot's longest side. */
  padding: number;
  radius: number;
  shadow: number;
  watermark: boolean;
  redactStyle: RedactStyle;
  penColor: string;
  penSize: number;
  textSize: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Every mark is stored in screenshot pixel coordinates, so marks stay put when the
// layout changes and survive cropping.

/** A redacted area. Baked into the pixels, so it can never be undone in the export. */
export interface Redaction extends Rect {
  type: 'redact';
  id: string;
  style: RedactStyle;
}

/** An area kept bright while the rest of the screenshot is dimmed. */
export interface Spotlight extends Rect {
  type: 'spotlight';
  id: string;
}

export interface Box extends Rect {
  type: 'box';
  id: string;
  color: string;
  width: number;
}

export interface Arrow {
  type: 'arrow';
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  width: number;
}

/** A freehand line. */
export interface Stroke {
  type: 'stroke';
  id: string;
  /** Flat [x0, y0, x1, y1, ...] list. */
  points: number[];
  color: string;
  width: number;
}

/** A single-line label; (x, y) is its top-left corner. */
export interface TextMark {
  type: 'text';
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
}

/** Everything drawn on the screenshot, oldest first. */
export type Mark = Redaction | Spotlight | Box | Arrow | Stroke | TextMark;

/** The undoable part of an edit session. */
export interface Doc {
  marks: Mark[];
  /** Visible part of the screenshot, or null for all of it. */
  crop: Rect | null;
}

export const DEFAULT_SETTINGS: Settings = {
  bgType: 'preset',
  bgPreset: 'rose',
  bgColor: '#f4f4f5',
  grain: true,
  frame: 'mac',
  frameTheme: 'dark',
  url: 'glazed.website',
  aspect: 'auto',
  padding: 80,
  radius: 14,
  shadow: 60,
  watermark: true,
  redactStyle: 'pixelate',
  penColor: '#ff5c8a',
  penSize: 6,
  textSize: 28,
};
