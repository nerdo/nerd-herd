/** Herdr's shared mod state, as the store sees it. */
export type SharedKey = string;
export interface SharedState {
  read(key: SharedKey): unknown;
  write(key: SharedKey, value: unknown): void;
}

/** A group's internal id: a ULID, never its name. */
export type GroupId = string;

export interface SavedGroup {
  readonly id: GroupId;
}

export interface SavedGroups {
  readonly groups: readonly SavedGroup[];
}

export interface GroupStore {
  load(): SavedGroups;
}

// CROSSING (walking skeleton): real in shape, holds no groups yet.
export const createGroupStore = (_shared: SharedState): GroupStore => ({
  load: () => ({ groups: [] }),
});
