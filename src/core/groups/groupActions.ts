import type { BannerLink } from "../banners/bannerCache";
import type { SortChoice } from "../sorting/sortOrder";
import {
  type CountMode,
  type GroupIcon,
  type GroupId,
  type GroupName,
  GroupNameError,
  type MachineName,
  type NameLength,
  type NewGroup,
  type Place,
  type SavedGroup,
  type SavedGroups,
} from "./groupModel";

/** Renames a group; its id, contents, and settings stay. Names follow the same rules as new groups. */
export const renameGroup = (saved: SavedGroups, id: GroupId, name: GroupName): SavedGroups =>
  update(saved, id, { name: checkedName(name) });
/** Deletes a group: its subgroups take its place, and its machines become ungrouped. */
export const deleteGroup = (saved: SavedGroups, id: GroupId): SavedGroups => {
  const gone = saved.groups.find((g) => g.id === id);
  if (!gone) return saved;
  const lifted = saved.groups
    .filter((g) => g.parent === id)
    .map((g) => ({ ...g, parent: gone.parent }));
  return {
    ...saved,
    groups: saved.groups.flatMap((g) => (g.id === id ? lifted : g.parent === id ? [] : [g])),
    placements: saved.placements.map((p) => (p.group === id ? { ...p, group: null } : p)),
  };
};
/** True when `candidate` is `id` itself or sits anywhere inside it. */
const isWithin = (saved: SavedGroups, candidate: GroupId | null, id: GroupId): boolean => {
  for (
    let at = candidate;
    at !== null;
    at = saved.groups.find((g) => g.id === at)?.parent ?? null
  ) {
    if (at === id) return true;
  }
  return false;
};

/** Moves a group into a parent (null: the top level), before or after a sibling or at the end.
 *  A group cannot move into itself or anything inside it; that move changes nothing. */
export const nestGroup = (
  saved: SavedGroups,
  id: GroupId,
  parent: GroupId | null,
  place?: Place,
): SavedGroups => {
  const moving = saved.groups.find((g) => g.id === id);
  if (!moving || isWithin(saved, parent, id)) return saved;
  const others = saved.groups.filter((g) => g.id !== id);
  const target =
    place && "before" in place ? place.before : place && "after" in place ? place.after : undefined;
  const at = target === undefined ? -1 : others.findIndex((g) => g.id === target);
  const index = at < 0 ? others.length : place && "after" in place ? at + 1 : at;
  return {
    ...saved,
    groups: [...others.slice(0, index), { ...moving, parent }, ...others.slice(index)],
  };
};
/** Sets one of a group's two sorts, or the top level's (group null); the other sort is untouched. */
export const setSort = (
  saved: SavedGroups,
  group: GroupId | null,
  which: "subgroups" | "machines",
  choice: SortChoice,
): SavedGroups => {
  if (group === null)
    return which === "subgroups"
      ? { ...saved, topSubgroupSort: choice }
      : { ...saved, topMachineSort: choice };
  return update(
    saved,
    group,
    which === "subgroups" ? { subgroupSort: choice } : { machineSort: choice },
  );
};
/** Chooses what a group's folded header counts. */
export const setCountMode = (saved: SavedGroups, id: GroupId, countMode: CountMode): SavedGroups =>
  update(saved, id, { countMode });

const maxNameLength: NameLength = 60;

/** A typed group name, trimmed; refused when empty or longer than the limit. */
const checkedName = (typed: GroupName): GroupName => {
  const name = typed.trim();
  if (name.length === 0) throw new GroupNameError("empty", 0);
  if (name.length > maxNameLength) throw new GroupNameError("tooLong", name.length);
  return name;
};

const update = (saved: SavedGroups, id: GroupId, change: Partial<SavedGroup>): SavedGroups => ({
  ...saved,
  groups: saved.groups.map((g) => (g.id === id ? { ...g, ...change } : g)),
});

/** Adds a group at the end of its parent's groups, with every setting at its default. */
export const makeGroup = (saved: SavedGroups, group: NewGroup): SavedGroups => {
  const name = checkedName(group.name);
  return {
    ...saved,
    groups: [
      ...saved.groups,
      {
        id: group.id,
        name,
        parent: group.parent ?? null,
        icon: group.icon ?? null,
        openBanner: null,
        foldedBanner: null,
        clip: "left",
        folded: false,
        subgroupSort: "custom",
        machineSort: "custom",
        countMode: "allMachines",
        chevron: true,
        align: "middle",
      },
    ],
  };
};

/** Puts a machine in a group (or ungrouped, null), before another machine or at the end. */
export const placeMachine = (
  saved: SavedGroups,
  machine: MachineName,
  group: GroupId | null,
  before?: MachineName,
): SavedGroups => {
  const others = saved.placements.filter((p) => p.name !== machine);
  const at = before === undefined ? -1 : others.findIndex((p) => p.name === before);
  const placed = { name: machine, group };
  return {
    ...saved,
    placements:
      at < 0 ? [...others, placed] : [...others.slice(0, at), placed, ...others.slice(at)],
  };
};

export const setFolded = (saved: SavedGroups, id: GroupId, folded: boolean): SavedGroups =>
  update(saved, id, { folded });
/** The options a group's settings change, set together; a field left out keeps its value. */
export type GroupLook = Partial<
  Pick<SavedGroup, "icon" | "clip" | "countMode" | "chevron" | "align">
>;
export const setLook = (saved: SavedGroups, id: GroupId, look: GroupLook): SavedGroups =>
  update(saved, id, look);
export const setIcon = (saved: SavedGroups, id: GroupId, icon: GroupIcon | null): SavedGroups =>
  update(saved, id, { icon });
export const setBanner = (
  saved: SavedGroups,
  id: GroupId,
  state: "open" | "folded",
  link: BannerLink | null,
): SavedGroups =>
  update(saved, id, state === "open" ? { openBanner: link } : { foldedBanner: link });
