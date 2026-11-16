import { type } from "arktype";
import { SavedDataError } from "../errors/savedDataError";

export type WordForm = string;

export interface GroupWord {
  readonly singular: WordForm;
  readonly plural: WordForm;
}

/** The user-changeable Spaces settings, each with its one default below. */
export interface SidebarSettings {
  readonly groupWord: GroupWord;
  readonly ungroupedHeader: boolean;
  readonly ungroupedName: WordForm;
}

export const defaultSettings: SidebarSettings = {
  groupWord: { singular: "Group", plural: "Groups" },
  ungroupedHeader: false,
  ungroupedName: "Ungrouped",
};

/** What may be saved: every setting optional, each checked when present. */
const SavedSettings = type({
  "groupWord?": { singular: "string > 0", plural: "string > 0" },
  "ungroupedHeader?": "boolean",
  "ungroupedName?": "string > 0",
});

export interface SettingsRead {
  readonly settings: SidebarSettings;
  /** Set when the saved settings could not be read; the defaults are in use. */
  readonly problem: SavedDataError | null;
}

/** Reads the saved settings, filling each missing value from its default. */
export const readSettings = (saved: unknown): SettingsRead => {
  const parsed = SavedSettings(saved ?? {});
  if (parsed instanceof type.errors) {
    return {
      settings: defaultSettings,
      problem: new SavedDataError("settings", { cause: parsed }),
    };
  }
  return { settings: { ...defaultSettings, ...parsed }, problem: null };
};
