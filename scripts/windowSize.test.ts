import { describe, expect, test } from "bun:test";
import { sizeCommands, type YabaiWindow } from "./windowSize";

// The user, 2026-11-17: the walks may use yabai to float and size only their own test window, found
// by its process ID, so a walk's window size stops depending on the person's tiling.
const tiled = (id: number, pid: number): YabaiWindow => ({
  id,
  pid,
  "is-floating": false,
  "can-resize": true,
});
const size = { width: 1200, height: 900 };

describe("sizing the test window with yabai", () => {
  test("a tiled test window is floated, then given the size at the top left of the main display", () => {
    expect(sizeCommands([tiled(7, 42)], [42], size)).toEqual([
      ["-m", "window", "7", "--toggle", "float"],
      ["-m", "window", "7", "--move", "abs:0:0"],
      ["-m", "window", "7", "--resize", "abs:1200:900"],
    ]);
  });

  test("a test window already floating is not toggled back into the tiling", () => {
    const floating = { ...tiled(7, 42), "is-floating": true };
    expect(sizeCommands([floating], [42], size).map((c) => c[3])).toEqual(["--move", "--resize"]);
  });

  // Seen 2026-11-17: right after Herdr starts, yabai lists its window with no role and
  // "can-resize": false, and acting on it fails with "could not locate the window to act on".
  test("a test window yabai cannot resize yet gets no commands, so sizing waits for it", () => {
    const opening = { ...tiled(7, 42), "can-resize": false };
    expect(sizeCommands([opening], [42], size)).toEqual([]);
  });

  test("a window of any other process is left alone", () => {
    expect(sizeCommands([tiled(8, 99)], [42], size)).toEqual([]);
  });
});
