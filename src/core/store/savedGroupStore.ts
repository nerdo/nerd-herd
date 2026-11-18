import { type HexColor, isHex } from "../colors/overlayColor";
import type { SavedDataError } from "../errors/savedDataError";
import { emptyGroups, type SavedGroups } from "../groups/groupModel";
import { z } from "../schema/zod";
import { createSavedValue } from "./savedValue";

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
  /** Reads backed-up groups again; restores them when they can be read now. */
  retry(): boolean;
  /** Stops showing the backed-up groups' problem; the backup is kept. */
  dismiss(): boolean;
}

const groupsKey = "nerd-herd.groups";

const sort = z.enum(["custom", "alphabetical", "reverseAlphabetical"]);
const link = z.string().nullable();
/** A banner's kept copy (added 2026-11-17); a group saved before then loads its links once. */
const bannerFile = z
  .object({ path: z.string().min(1), width: z.number(), height: z.number() })
  .nullable()
  .optional();
/** A level's custom order (added 2026-11-17); data saved before then has none, so it draws groups first. */
const items = z
  .array(
    z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("group"), id: z.string().min(1) }),
      z.object({ kind: z.literal("machine"), name: z.string().nullable() }),
    ]),
  )
  .nullable()
  .optional();
/** A banner overlay color (added 2026-11-18), as parseColor writes it; absent: none. */
const hexColor = z
  .custom<HexColor>((v) => typeof v === "string" && isHex(v))
  .nullable()
  .default(null);
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
      openBannerFile: bannerFile,
      foldedBannerFile: bannerFile,
      clip: z.enum(["left", "center"]),
      folded: z.boolean(),
      subgroupSort: sort,
      machineSort: sort,
      countMode: z.enum(["allMachines", "directMachines", "directItems"]),
      // Added 2026-11-17; groups saved before then take the defaults.
      chevron: z.boolean().default(true),
      align: z.enum(["top", "middle", "bottom"]).default("middle"),
      // Added 2026-11-18; groups saved before then have no overlay colors.
      backingColor: hexColor,
      controlsColor: hexColor,
      items,
    }),
  ),
  placements: z.array(z.object({ name: z.string().nullable(), group: z.string().nullable() })),
  topSubgroupSort: sort,
  topMachineSort: sort,
  topItems: items,
});

/** Keeps the group model's data in Herdr's shared state, so it survives restarts. */
export const createGroupStore = (shared: SharedState): GroupStore => {
  const value = createSavedValue(shared, groupsKey, "groups", emptyGroups, (raw) => {
    const parsed = SavedGroupsSchema.safeParse(raw);
    return parsed.success ? { ok: true, value: parsed.data } : { ok: false, cause: parsed.error };
  });
  return {
    load: () => {
      const read = value.load();
      return { groups: read.value, problem: read.problem };
    },
    save: (groups) => value.save(groups),
    retry: () => value.retry(),
    dismiss: () => value.dismiss(),
  };
};
