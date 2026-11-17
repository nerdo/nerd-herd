/** One window as `yabai -m query --windows` reports it; only the fields the sizing reads. */
export interface YabaiWindow {
  readonly id: number;
  readonly pid: number;
  readonly "is-floating": boolean;
  readonly "can-resize": boolean;
}

export interface WindowSize {
  readonly width: number;
  readonly height: number;
}

/**
 * The yabai commands that float each test window and give it `size` at the main display's top left
 * (yabai's absolute coordinates start there). Windows of other processes get none, and so does a
 * test window yabai cannot resize yet (just opened), so the caller waits for it.
 */
export const sizeCommands = (
  windows: readonly YabaiWindow[],
  testPids: readonly number[],
  size: WindowSize,
): string[][] =>
  windows
    .filter((w) => testPids.includes(w.pid) && w["can-resize"])
    .flatMap((w) => {
      const window = ["-m", "window", String(w.id)];
      return [
        ...(w["is-floating"] ? [] : [[...window, "--toggle", "float"]]),
        [...window, "--move", "abs:0:0"],
        [...window, "--resize", `abs:${size.width}:${size.height}`],
      ];
    });
