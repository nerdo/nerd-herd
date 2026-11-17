import type { SharedState } from "../store/savedGroupStore";
import { createSavedValue } from "../store/savedValue";
import {
  defaultSettings,
  readSettings,
  type SettingsRead,
  type SidebarSettings,
} from "./sidebarSettings";

const settingsKey = "nerd-herd.settings";

export interface SettingsStore {
  load(): SettingsRead;
  save(settings: SidebarSettings): void;
  /** Reads backed-up settings again; restores them when they can be read now. */
  retry(): boolean;
}

/** Keeps the Spaces settings in Herdr's shared state; damaged settings are backed up like groups. */
export const createSettingsStore = (shared: SharedState): SettingsStore => {
  const value = createSavedValue(shared, settingsKey, "settings", defaultSettings, (raw) => {
    const read = readSettings(raw);
    return read.problem
      ? { ok: false, cause: read.problem.cause }
      : { ok: true, value: read.settings };
  });
  return {
    load: () => {
      const read = value.load();
      return { settings: read.value, problem: read.problem };
    },
    save: (settings) => value.save(settings),
    retry: () => value.retry(),
  };
};
