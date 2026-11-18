// The colors a group's banner overlay takes, read from what a person types and converted for the
// picker. colord parses and converts the color forms; its names plugin reads names like "navy".
import { colord, extend } from "colord";
import namesPlugin from "colord/plugins/names";

extend([namesPlugin]);

/** A color as `#rrggbb`, or `#rrggbbaa` when it is partly see-through. */
export type HexColor = `#${string}`;
/** Hue (0 to 360), saturation and brightness (0 to 100), and opacity (0 to 1). */
export interface Hsva {
  readonly h: number;
  readonly s: number;
  readonly v: number;
  readonly a: number;
}

export const isHex = (text: string): text is HexColor => /^#[0-9a-f]{6}([0-9a-f]{2})?$/.test(text);

/** colord's hex output, checked: colord writes lowercase #rrggbb or #rrggbbaa. */
const hex = (text: string): HexColor => {
  if (!isHex(text)) throw new Error(`colord gave ${text}, not a hex color`);
  return text;
};

/** The color typed, in hex form; null when the text names no color. */
export const parseColor = (text: string): HexColor | null => {
  const c = colord(text.trim());
  return c.isValid() ? hex(c.toHex()) : null;
};

/** The picker's form of a hex color. */
export const toHsva = (color: HexColor): Hsva => colord(color).toHsv();

/** The hex form of the picker's color. */
export const fromHsva = (hsva: Hsva): HexColor => hex(colord(hsva).toHex());
