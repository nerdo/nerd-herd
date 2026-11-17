/** A keys.json file's sections: each maps a key to an action. */
export type KeySections = Record<string, Record<string, string>>;
/** The platform name Node and Bun report, such as "darwin", "win32", or "linux". */
export type Platform = string;

/**
 * The Spaces mod's keys, in the mod:nerd-herd-spaces section so they apply only while the mod has
 * the keyboard (spec: Keyboard use). Cut and paste use Cmd on macOS and Ctrl elsewhere.
 */
export const keyBindings = (platform: Platform): KeySections => {
  const mod = platform === "darwin" ? "cmd" : "ctrl";
  return {
    "mod:nerd-herd-spaces": {
      up: "nerd-herd-spaces.up",
      down: "nerd-herd-spaces.down",
      enter: "nerd-herd-spaces.fold",
      f2: "nerd-herd-spaces.rename",
      [`${mod}-x`]: "nerd-herd-spaces.cut",
      [`${mod}-v`]: "nerd-herd-spaces.paste",
      // In a dialog taller than the window: bring its end, or its start, into view.
      pagedown: "nerd-herd-spaces.dialog-end",
      pageup: "nerd-herd-spaces.dialog-start",
    },
  };
};

/** Adds each of our sections the keys.json lacks; a section already there is the person's and is kept. */
export const mergeKeys = (existing: KeySections, ours: KeySections): KeySections => ({
  ...existing,
  ...Object.fromEntries(Object.entries(ours).filter(([section]) => !(section in existing))),
});
