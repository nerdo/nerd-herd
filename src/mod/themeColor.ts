import { NerdHerdError } from "../core/errors/nerdHerdError";

export type HexColor = `#${string}`;
export type ThemeColorName = string;

/** Herdr's theme lacked a color the mod draws with, or held something that is not a #-color. */
export class ThemeColorError extends NerdHerdError {
  readonly userAction = "report";
  constructor(
    public readonly colorName: ThemeColorName,
    public readonly received: string | undefined,
  ) {
    super();
    this.setMessage(`Something went wrong on our end. Reference ${this.metadata.errorId}.`);
  }
}

const isHex = (value: string | undefined): value is HexColor =>
  value !== undefined && /^#[0-9a-fA-F]{3,8}$/.test(value);

/** Reads one color from Herdr's theme, checked to be a #-color. */
export function themeColor(theme: Record<string, string>, name: ThemeColorName): HexColor {
  const value = theme[name];
  if (!isHex(value)) throw new ThemeColorError(name, value);
  return value;
}
