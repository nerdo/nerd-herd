import type { BannerFile, BannerLink } from "../banners/bannerCache";
import { NerdHerdError } from "../errors/nerdHerdError";
import type { SortChoice } from "../sorting/sortOrder";

/** A group's internal id: a ULID, never its name. */
export type GroupId = string;
export type GroupName = string;
/** A machine Herdr lists. A null name is this computer. */
export type MachineName = string | null;
export type Emoji = string;
export type Depth = number;
export type Count = number;

export interface Machine {
  readonly name: MachineName;
  readonly reachable: boolean;
}

export interface GroupIcon {
  readonly kind: "emoji";
  readonly value: Emoji;
}

export type ClipSide = "left" | "center";
export type CountMode = "allMachines" | "directMachines" | "directItems";
/** Where a group's controls sit on its banner. */
export type ControlAlign = "top" | "middle" | "bottom";

export interface SavedGroup {
  readonly id: GroupId;
  readonly name: GroupName;
  readonly parent: GroupId | null;
  readonly icon: GroupIcon | null;
  readonly openBanner: BannerLink | null;
  readonly foldedBanner: BannerLink | null;
  /** The loaded copy of each banner, kept so Herdr does not read the link again (absent: not yet). */
  readonly openBannerFile?: BannerFile | null;
  readonly foldedBannerFile?: BannerFile | null;
  readonly clip: ClipSide;
  readonly folded: boolean;
  readonly subgroupSort: SortChoice;
  readonly machineSort: SortChoice;
  readonly countMode: CountMode;
  /** Whether the fold chevron shows on the group's banner. */
  readonly chevron: boolean;
  readonly align: ControlAlign;
  /** The custom order of what is inside, groups and machines together; absent or null: groups first. */
  readonly items?: readonly LevelItem[] | null;
}

/** One member of a level (a group's contents, or the top): a group, or a machine. */
export type LevelItem =
  | { readonly kind: "group"; readonly id: GroupId }
  | { readonly kind: "machine"; readonly name: MachineName };

/** Where a machine sits: in a group, or ungrouped (null). The list order is the custom order. */
export interface MachinePlacement {
  readonly name: MachineName;
  readonly group: GroupId | null;
}

/** Everything the group model keeps. Sibling groups keep their custom order as list order. */
export interface SavedGroups {
  readonly groups: readonly SavedGroup[];
  readonly placements: readonly MachinePlacement[];
  readonly topSubgroupSort: SortChoice;
  readonly topMachineSort: SortChoice;
  /** The top level's custom order, groups and machines together; absent or null: groups first. */
  readonly topItems?: readonly LevelItem[] | null;
}

export const emptyGroups: SavedGroups = {
  groups: [],
  placements: [],
  topSubgroupSort: "custom",
  topMachineSort: "custom",
};

/** One row the Spaces section draws, top to bottom. */
export type SpacesRow =
  | {
      readonly kind: "group";
      readonly id: GroupId;
      readonly name: GroupName;
      readonly icon: GroupIcon | null;
      readonly depth: Depth;
      readonly folded: boolean;
      readonly count: Count;
      readonly banner: BannerLink | null;
      /** The kept copy of that banner, once loaded; null until then. */
      readonly bannerFile: BannerFile | null;
      readonly clip: ClipSide;
      readonly chevron: boolean;
      readonly align: ControlAlign;
    }
  | {
      readonly kind: "machine";
      readonly name: MachineName;
      readonly depth: Depth;
      readonly reachable: boolean;
    }
  | { readonly kind: "ungrouped"; readonly name: GroupName };

export interface NewGroup {
  readonly id: GroupId;
  readonly name: GroupName;
  readonly parent?: GroupId | null;
  readonly icon?: GroupIcon | null;
}

export type NameLength = number;

/** A group name the user typed was refused: empty after trimming spaces, or longer than the limit. */
export class GroupNameError extends NerdHerdError {
  readonly userAction = "fix";
  constructor(
    public readonly reason: "empty" | "tooLong",
    public readonly length: NameLength,
    public readonly limit: NameLength = 60,
  ) {
    super();
    // The view renders this in the user's group word; this message is the fallback with the default word.
    this.setMessage(
      reason === "empty"
        ? "Enter a name for the group."
        : `Group names can be at most ${limit} characters. This one has ${length}.`,
    );
  }
}

export type Place = { readonly before?: GroupId } | { readonly after?: GroupId };
