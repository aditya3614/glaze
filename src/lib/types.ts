export type BgType = 'preset' | 'solid' | 'blur' | 'none';
export type FrameKind = 'none' | 'mac' | 'browser';
export type FrameTheme = 'light' | 'dark';
export type Aspect = 'auto' | '16:9' | '4:3' | '1:1' | '4:5' | '9:16';
export type RedactStyle = 'pixelate' | 'blur' | 'solid';

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
}

/** A redacted area, in screenshot pixel coordinates. */
export interface Redaction {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  style: RedactStyle;
}

export const DEFAULT_SETTINGS: Settings = {
  bgType: 'preset',
  bgPreset: 'rose',
  bgColor: '#f4f4f5',
  grain: true,
  frame: 'mac',
  frameTheme: 'dark',
  url: 'glaze.app',
  aspect: 'auto',
  padding: 80,
  radius: 14,
  shadow: 60,
  watermark: true,
  redactStyle: 'pixelate',
};
