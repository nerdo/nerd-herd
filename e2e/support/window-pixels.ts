// Readings of a test window's pixels, for colors a walk set: how many pixels hold a color, where a
// color first appears, and the longest vertical run of anything else.

import type { HerdrWindow } from "./herdr-window";
import {
  type ColorEdge,
  type ColorMatch,
  countColor,
  edgeOf,
  type HexColor,
  type ImageBand,
  longestRun,
} from "./pixels";

/**
 * How many pixels of one color the window draws in the sidebar, past it (where dialogs open), or in
 * a band, once the screen has settled. A walk sets a color the screen holds nowhere else and counts it.
 */
export const colorCount = (
  window: HerdrWindow,
  hex: HexColor,
  where: "sidebar" | "beyond" | ImageBand,
  match: ColorMatch = "exact",
): number => {
  const { shot, edge } = window.screenshot();
  const band =
    where === "sidebar"
      ? { from: 0, to: edge }
      : where === "beyond"
        ? { from: edge, to: 1 }
        : where;
  return countColor(shot, hex, band, match);
};

/** Where a color first appears in the sidebar, in screenshot pixels. */
export const colorEdge = (window: HerdrWindow, hex: HexColor): ColorEdge | null => {
  const { shot, edge } = window.screenshot();
  return edgeOf(shot, hex, { from: 0, to: edge });
};

/** The longest vertical run of pixels that are not `hex` in one column of the band. */
export const runLength = (window: HerdrWindow, hex: HexColor, band: ImageBand): number =>
  longestRun(window.screenshot().shot, hex, band);
