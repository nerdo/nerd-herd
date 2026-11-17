import { describe, expect, test } from "bun:test";
import { keyBindings, mergeKeys } from "./keyBindings";

describe("nerd-herd's key bindings", () => {
  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-the-cut-and-paste-keys-follow-the-platform@jj:261617da
  // "macOS binds cmd-x and cmd-v, and Windows and Linux bind ctrl-x and ctrl-v, to the Spaces mod's
  // cut and paste commands, all in the mod:nerd-herd-spaces section"
  test("the cut and paste keys follow the platform", () => {
    const pick = (platform: string) => {
      const section = keyBindings(platform)["mod:nerd-herd-spaces"] ?? {};
      return Object.entries(section).filter(([, action]) => /\.(cut|paste)$/.test(action));
    };
    expect([pick("darwin"), pick("win32"), pick("linux")]).toEqual([
      [
        ["cmd-x", "nerd-herd-spaces.cut"],
        ["cmd-v", "nerd-herd-spaces.paste"],
      ],
      [
        ["ctrl-x", "nerd-herd-spaces.cut"],
        ["ctrl-v", "nerd-herd-spaces.paste"],
      ],
      [
        ["ctrl-x", "nerd-herd-spaces.cut"],
        ["ctrl-v", "nerd-herd-spaces.paste"],
      ],
    ]);
  });
});

describe("merging nerd-herd's keys into a keys.json", () => {
  // Statement gained from the spec's Keyboard use decision ("the user can rebind them") and Herdr's
  // guide ("A mod's keys.json: merge it into the person's. Add its sections and keys"): a section the
  // person already has is theirs and stays as it is.
  test("a keys.json without the mod's section gains it, and one with it keeps its own", () => {
    const ours = keyBindings("darwin");
    const theirs = {
      global: { "cmd-q": "app.quit" },
      "mod:nerd-herd-spaces": { "alt-x": "nerd-herd-spaces.cut" },
    };
    expect([mergeKeys({ global: { "cmd-q": "app.quit" } }, ours), mergeKeys(theirs, ours)]).toEqual(
      [{ global: { "cmd-q": "app.quit" }, ...ours }, theirs],
    );
  });
});
