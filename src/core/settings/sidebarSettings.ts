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

// CROSSING (walking skeleton): real in shape, returns the defaults whatever was saved.
export const readSettings = (_saved: unknown): SidebarSettings => defaultSettings;
