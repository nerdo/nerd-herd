// Counts the pixels of one color in a screenshot, so a walk can check a color it set. macOS's sips
// converts the PNG into an uncompressed BMP, whose pixels are read directly: no image library.

import { spawnSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";

export type HexColor = `#${string}`;
/** A band of the image across its width, as fractions from 0 (left edge) to 1 (right edge). */
export interface ImageBand {
  readonly from: number;
  readonly to: number;
  /** The rows to read, as fractions of the height from the top; all of them when absent. */
  readonly top?: number;
  readonly bottom?: number;
}

/** Whether a pixel row, counted from the top, lies inside the band. */
const inRows = (band: ImageBand, y: number, height: number) =>
  y >= Math.floor(height * (band.top ?? 0)) && y < Math.floor(height * (band.bottom ?? 1));

/** How far each channel may stray from the color asked for: color management shifts a value by a few. */
const tolerance = 8;

const channels = (hex: HexColor): readonly [number, number, number] => {
  const n = Number.parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/**
 * How a pixel matches the color: `exact`, within a few steps of it, for a filled area; `other`, not
 * the color at all, for what is drawn on a plain background; `shaded`, mixed with white or gray;
 * `tinted`, its
 * strong channels each clearly above its weak ones, for thin lines whose edges blend into what is
 * behind them (an 11-point icon is mostly edge).
 */
export type ColorMatch = "exact" | "tinted" | "other" | "shaded";
const tintGap = 40;

/** The number of pixels in the band that match `hex` (#rrggbb, its channels 00 or ff for `tinted`). */
export const countColor = (
  png: string,
  hex: HexColor,
  band: ImageBand,
  match: ColorMatch = "exact",
): number => {
  const bmp = `${png}.bmp`;
  const s = spawnSync("sips", ["-s", "format", "bmp", png, "--out", bmp], { encoding: "utf8" });
  if (s.status !== 0) throw new Error(`sips could not convert ${png}: ${s.stderr}`);
  const b = readFileSync(bmp);
  rmSync(bmp);
  const start = b.readUInt32LE(10);
  const width = b.readInt32LE(18);
  const height = Math.abs(b.readInt32LE(22));
  const bytes = b.readUInt16LE(28) / 8;
  const stride = Math.ceil((width * bytes) / 4) * 4;
  const [r, g, bl] = channels(hex);
  const near = (a: number, want: number) => Math.abs(a - want) <= tolerance;
  const strong = [r, g, bl].map((c) => c >= 128);
  const tinted = (px: readonly number[]) => {
    const hi = px.filter((_, i) => strong[i]);
    const lo = px.filter((_, i) => !strong[i]);
    return Math.min(...hi) - Math.max(...lo) >= tintGap;
  };
  const topDown = b.readInt32LE(22) < 0;
  // `shaded`: the color's strong channels above its weak ones, the weak ones equal and above 30, as
  // where a color is mixed with white or gray rather than drawn pure.
  const shaded = (px: readonly number[]) => {
    const lo = px.filter((_, i) => !strong[i]);
    return tinted(px) && Math.max(...lo) - Math.min(...lo) <= 10 && Math.min(...lo) >= 30;
  };
  let count = 0;
  for (let y = 0; y < height; y++)
    for (let x = Math.floor(width * band.from); x < Math.floor(width * band.to); x++) {
      if (!inRows(band, topDown ? y : height - 1 - y, height)) continue;
      const at = start + y * stride + x * bytes;
      // BMP keeps each pixel as blue, green, red (then alpha when it has one).
      const px = [b[at + 2] ?? -1, b[at + 1] ?? -1, b[at] ?? -1];
      const same = near(px[0] ?? -1, r) && near(px[1] ?? -1, g) && near(px[2] ?? -1, bl);
      // `other`: any pixel that is not the color, such as anything drawn on a plain background.
      const hit =
        match === "tinted"
          ? tinted(px)
          : match === "shaded"
            ? shaded(px)
            : match === "other"
              ? !same
              : same;
      if (hit) count++;
    }
  return count;
};

/** Where a color first appears in the band: the top row and the left column holding it; null if nowhere. */
export interface ColorEdge {
  readonly top: number;
  readonly left: number;
}
export const edgeOf = (png: string, hex: HexColor, band: ImageBand): ColorEdge | null => {
  const bmp = `${png}.edge.bmp`;
  const s = spawnSync("sips", ["-s", "format", "bmp", png, "--out", bmp], { encoding: "utf8" });
  if (s.status !== 0) throw new Error(`sips could not convert ${png}: ${s.stderr}`);
  const b = readFileSync(bmp);
  rmSync(bmp);
  const start = b.readUInt32LE(10);
  const width = b.readInt32LE(18);
  const rawHeight = b.readInt32LE(22);
  const height = Math.abs(rawHeight);
  const bytes = b.readUInt16LE(28) / 8;
  const stride = Math.ceil((width * bytes) / 4) * 4;
  const [r, g, bl] = channels(hex);
  let top = Number.POSITIVE_INFINITY;
  let left = Number.POSITIVE_INFINITY;
  for (let row = 0; row < height; row++)
    for (let x = Math.floor(width * band.from); x < Math.floor(width * band.to); x++) {
      const at = start + row * stride + x * bytes;
      // Rows are kept bottom to top unless the height is negative.
      const y = rawHeight > 0 ? height - 1 - row : row;
      if (b[at + 2] === r && b[at + 1] === g && b[at] === bl) {
        top = Math.min(top, y);
        left = Math.min(left, x);
      }
    }
  return Number.isFinite(top) ? { top, left } : null;
};

/** The longest unbroken vertical run of pixels that are not `hex`, in any one column of the band. */
export const longestRun = (png: string, hex: HexColor, band: ImageBand): number => {
  const bmp = `${png}.run.bmp`;
  const s = spawnSync("sips", ["-s", "format", "bmp", png, "--out", bmp], { encoding: "utf8" });
  if (s.status !== 0) throw new Error(`sips could not convert ${png}: ${s.stderr}`);
  const b = readFileSync(bmp);
  rmSync(bmp);
  const start = b.readUInt32LE(10);
  const width = b.readInt32LE(18);
  const rawHeight = b.readInt32LE(22);
  const height = Math.abs(rawHeight);
  const bytes = b.readUInt16LE(28) / 8;
  const stride = Math.ceil((width * bytes) / 4) * 4;
  const [r, g, bl] = channels(hex);
  const near = (a: number | undefined, want: number) => Math.abs((a ?? -1) - want) <= tolerance;
  let longest = 0;
  for (let x = Math.floor(width * band.from); x < Math.floor(width * band.to); x++) {
    let run = 0;
    for (let y = 0; y < height; y++) {
      if (!inRows(band, y, height)) continue;
      const at = start + (rawHeight > 0 ? height - 1 - y : y) * stride + x * bytes;
      const same = near(b[at + 2], r) && near(b[at + 1], g) && near(b[at], bl);
      run = same ? 0 : run + 1;
      longest = Math.max(longest, run);
    }
  }
  return longest;
};
