import { describe, expect, test } from "bun:test";
import type { SharedState } from "../store/savedGroupStore";
import { createSettingsStore } from "./settingsStore";
import { defaultSettings } from "./sidebarSettings";

const memoryShared = (start: Record<string, unknown> = {}) => {
  const values = new Map(Object.entries(start));
  const shared: SharedState = { read: (k) => values.get(k), write: (k, v) => values.set(k, v) };
  return shared;
};

// Statement from the user, 2026-11-17: the error card's reference id should not change on every
// redraw. Damaged settings are backed up like damaged groups, and keep one reference.
describe("the settings store", () => {
  test("damaged settings read as the defaults, with the same reference on every read", () => {
    const store = createSettingsStore(memoryShared({ "nerd-herd.settings": { groupWord: 7 } }));
    const first = store.load();
    expect([first.settings, store.load().problem?.metadata.errorId]).toEqual([
      defaultSettings,
      first.problem?.metadata.errorId ?? "missing",
    ]);
  });
});
