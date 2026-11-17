import type { GroupId, GroupName, SavedGroups } from "./groupModel";

/** A place a group can move to: the top level (null) or a group. */
export interface MoveTarget {
  readonly id: GroupId | null;
  readonly name: GroupName | null;
}

/** Where a group can move: the top level, then every group that is not the group or inside it, in saved order. */
export const moveTargets = (saved: SavedGroups, id: GroupId): MoveTarget[] => {
  const inside = (candidate: GroupId | null): boolean => {
    let at = candidate;
    while (at !== null) {
      if (at === id) return true;
      at = saved.groups.find((g) => g.id === at)?.parent ?? null;
    }
    return false;
  };
  return [
    { id: null, name: null },
    ...saved.groups.filter((g) => !inside(g.id)).map((g) => ({ id: g.id, name: g.name })),
  ];
};
