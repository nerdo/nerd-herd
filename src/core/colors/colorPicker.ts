import { type HexColor, parseColor } from "./overlayColor";

/** A point in the picker's square, in points from its top-left corner. */
export interface SquarePoint {
  readonly x: number;
  readonly y: number;
}
export interface SquareSize {
  readonly width: number;
  readonly height: number;
}

/** The saturation and brightness (0 to 100) a point in the square picks. */
export const squarePick = (at: SquarePoint, size: SquareSize): { s: number; v: number } => {
  const share = (n: number, of: number) => Math.min(1, Math.max(0, of > 0 ? n / of : 0));
  return {
    s: Math.round(share(at.x, size.width) * 100),
    v: Math.round((1 - share(at.y, size.height)) * 100),
  };
};

/** The value (from `min` to `max`, whole numbers) a point `x` points along a bar `width` long picks. */
export const barPick = (x: number, width: number, min: number, max: number): number => {
  const share = Math.min(1, Math.max(0, width > 0 ? x / width : 0));
  return Math.round(min + share * (max - min));
};

/** What a color field's text holds: the default (empty), a color, or text that names no color. */
export type FieldColor =
  | { readonly kind: "default" }
  | { readonly kind: "color"; readonly color: HexColor }
  | { readonly kind: "invalid"; readonly text: string };

export const fieldColor = (text: string): FieldColor => {
  if (text.trim() === "") return { kind: "default" };
  const color = parseColor(text);
  return color === null ? { kind: "invalid", text } : { kind: "color", color };
};
