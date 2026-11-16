import { emptyGroups, type SavedGroups } from "../groups/groupModel";

/** Herdr's shared mod state, as the store sees it. */
export type SharedKey = string;
export interface SharedState {
  read(key: SharedKey): unknown;
  write(key: SharedKey, value: unknown): void;
}

export interface GroupStore {
  load(): SavedGroups;
}

// CROSSING (walking skeleton): real in shape, holds no groups yet.
export const createGroupStore = (_shared: SharedState): GroupStore => ({
  load: () => emptyGroups,
});
