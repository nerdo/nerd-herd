// The test window's size as Herdr saved it in its home's window.json ({ bounds: [x, y, width, height] }).

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface WindowPoints {
  readonly width: number;
  readonly height: number;
}

/** The window's size in points from `home`'s window.json; null before Herdr writes it. */
export const savedWindowSize = (home: string): WindowPoints | null => {
  const file = join(home, "window.json");
  if (!existsSync(file)) return null;
  const saved: unknown = JSON.parse(readFileSync(file, "utf8"));
  const bounds =
    typeof saved === "object" && saved !== null && "bounds" in saved && Array.isArray(saved.bounds)
      ? saved.bounds
      : [];
  const [, , width, height] = bounds;
  return typeof width === "number" && typeof height === "number" ? { width, height } : null;
};
