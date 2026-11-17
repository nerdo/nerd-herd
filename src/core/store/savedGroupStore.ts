import { SavedDataError } from "../errors/savedDataError";
import { emptyGroups, type SavedGroups } from "../groups/groupModel";
import { z } from "../schema/zod";

/** Herdr's shared mod state, as the store sees it. */
export type SharedKey = string;
export interface SharedState {
  read(key: SharedKey): unknown;
  write(key: SharedKey, value: unknown): void;
}

export interface GroupsRead {
  readonly groups: SavedGroups;
  /** Set when the saved groups could not be read; they were backed up and no groups are in use. */
  readonly problem: SavedDataError | null;
}

export interface GroupStore {
  load(): GroupsRead;
  save(groups: SavedGroups): void;
}

const groupsKey = "nerd-herd.groups";
const backupKey = "nerd-herd.groups.backup";

const sort = z.enum(["custom", "alphabetical", "reverseAlphabetical"]);
const link = z.string().nullable();
/** The saved shape of the group model's data: what Herdr's shared state holds under the groups key. */
const SavedGroupsSchema = z.object({
  groups: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1).max(60),
      parent: z.string().nullable(),
      icon: z.object({ kind: z.literal("emoji"), value: z.string().min(1) }).nullable(),
      openBanner: link,
      foldedBanner: link,
      clip: z.enum(["left", "center"]),
      folded: z.boolean(),
      subgroupSort: sort,
      machineSort: sort,
      countMode: z.enum(["allMachines", "directMachines", "directItems"]),
      // Added 2026-11-17; groups saved before then take the defaults.
      chevron: z.boolean().default(true),
      align: z.enum(["top", "middle", "bottom"]).default("middle"),
    }),
  ),
  placements: z.array(z.object({ name: z.string().nullable(), group: z.string().nullable() })),
  topSubgroupSort: sort,
  topMachineSort: sort,
});

/** Keeps the group model's data in Herdr's shared state, so it survives restarts. */
export const createGroupStore = (shared: SharedState): GroupStore => ({
  load: () => {
    const saved = shared.read(groupsKey);
    // While a backup of damaged groups is kept, every read reports it, so its error card stays.
    const backedUp = (): SavedDataError | null =>
      shared.read(backupKey) === undefined ? null : new SavedDataError("groups");
    if (saved === undefined || saved === null) return { groups: emptyGroups, problem: backedUp() };
    const parsed = SavedGroupsSchema.safeParse(saved);
    if (parsed.success) return { groups: parsed.data, problem: backedUp() };
    shared.write(backupKey, saved);
    shared.write(groupsKey, emptyGroups);
    return { groups: emptyGroups, problem: new SavedDataError("groups", { cause: parsed.error }) };
  },
  save: (groups) => shared.write(groupsKey, groups),
});
