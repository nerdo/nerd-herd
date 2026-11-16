import { SavedDataError } from "../errors/savedDataError";
import { z } from "../schema/zod";

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
const SavedSettings = z.object({
  groupWord: z.object({ singular: z.string().min(1), plural: z.string().min(1) }).optional(),
  ungroupedHeader: z.boolean().optional(),
  ungroupedName: z.string().min(1).optional(),
});

export interface SettingsRead {
  readonly settings: SidebarSettings;
  /** Set when the saved settings could not be read; the defaults are in use. */
  readonly problem: SavedDataError | null;
}

/** Reads the saved settings, filling each missing value from its default. */
export const readSettings = (saved: unknown): SettingsRead => {
  const parsed = SavedSettings.safeParse(saved ?? {});
  if (!parsed.success) {
    return {
      settings: defaultSettings,
      problem: new SavedDataError("settings", { cause: parsed.error }),
    };
  }
  const { groupWord, ungroupedHeader, ungroupedName } = parsed.data;
  return {
    settings: {
      groupWord: groupWord ?? defaultSettings.groupWord,
      ungroupedHeader: ungroupedHeader ?? defaultSettings.ungroupedHeader,
      ungroupedName: ungroupedName ?? defaultSettings.ungroupedName,
    },
    problem: null,
  };
};
