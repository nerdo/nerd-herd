// The order of a level: a group's contents, or the top. By default a level draws its groups above
// its machines, each kind in its own order. A custom order is one list of both kinds, made when one
// kind is placed among the other (the user, 2026-11-17), and cleared when the level goes back.
import { type SortChoice, sortOrder } from "../sorting/sortOrder";
import { nestGroup, placeMachine, setSort } from "./groupActions";
import type { GroupId, LevelItem, MachineName, SavedGroup, SavedGroups } from "./groupModel";

export type { LevelItem } from "./groupModel";
/** How a level orders its members: groups above machines, or one custom order for both. */
export type LevelOrder = "groupsFirst" | "custom";
export type Level = GroupId | null;

const thisComputer = "This computer";
/** How a machine is named on screen, and so how it sorts. */
export const machineLabel = (name: MachineName): string => name ?? thisComputer;

const sameItem = (a: LevelItem, b: LevelItem): boolean =>
  a.kind === "group"
    ? b.kind === "group" && a.id === b.id
    : b.kind === "machine" && a.name === b.name;

/** The level's custom order, or null when it draws groups first. */
export const itemsOf = (saved: SavedGroups, level: Level): readonly LevelItem[] | null =>
  (level === null ? saved.topItems : saved.groups.find((g) => g.id === level)?.items) ?? null;

const withItems = (saved: SavedGroups, level: Level, items: readonly LevelItem[] | null) =>
  level === null
    ? { ...saved, topItems: items }
    : { ...saved, groups: saved.groups.map((g) => (g.id === level ? { ...g, items } : g)) };

export const levelOrderOf = (saved: SavedGroups, level: Level): LevelOrder =>
  itemsOf(saved, level) ? "custom" : "groupsFirst";

/** Sorts by a sort choice and a name; "custom" keeps the given order. */
export const sortedBy = <T>(choice: SortChoice, items: readonly T[], name: (item: T) => string) =>
  sortOrder(
    choice,
    items.map((item) => ({ name: name(item), item })),
  ).map((n) => n.item);

/**
 * A level's members in drawn order. Without a custom order: its groups, then its machines. With
 * one: the members it lists, then any it does not (new since), groups first.
 */
export const drawnOrder = (
  items: readonly LevelItem[] | null,
  groups: readonly LevelItem[],
  machines: readonly LevelItem[],
): LevelItem[] => {
  const members = [...groups, ...machines];
  if (!items) return members;
  const listed = items.filter((i) => members.some((m) => sameItem(m, i)));
  return [...listed, ...members.filter((m) => !listed.some((i) => sameItem(i, m)))];
};

/** A level's members as saved, drawn order, in the order it draws them. */
const membersOf = (saved: SavedGroups, level: Level): LevelItem[] => {
  const group: SavedGroup | undefined = saved.groups.find((g) => g.id === level);
  const custom = itemsOf(saved, level);
  const subgroups = saved.groups.filter((g) => g.parent === level);
  const machines = saved.placements.filter((p) => p.group === level).map((p) => p.name);
  const groups = custom
    ? subgroups
    : sortedBy(group?.subgroupSort ?? saved.topSubgroupSort, subgroups, (g) => g.name);
  const own = custom
    ? machines
    : sortedBy(group?.machineSort ?? saved.topMachineSort, machines, machineLabel);
  return drawnOrder(
    custom,
    groups.map((g) => ({ kind: "group", id: g.id })),
    own.map((name) => ({ kind: "machine", name })),
  );
};

/**
 * Puts a group or machine into a level just before another member (null: at the end), in the
 * level's custom order; a level that drew groups first switches to custom, keeping its drawn order.
 * A group cannot move into itself or anything inside it; that move changes nothing.
 */
export const placeItem = (
  saved: SavedGroups,
  level: Level,
  item: LevelItem,
  before: LevelItem | null,
): SavedGroups => {
  const moved =
    item.kind === "machine"
      ? placeMachine(saved, item.name, level, before?.kind === "machine" ? before.name : undefined)
      : nestGroup(saved, item.id, level, before?.kind === "group" ? { before: before.id } : {});
  if (item.kind === "group" && moved === saved) return saved;
  const others = membersOf(moved, level).filter((m) => !sameItem(m, item));
  const at = before ? others.findIndex((m) => sameItem(m, before)) : -1;
  const items = at < 0 ? [...others, item] : [...others.slice(0, at), item, ...others.slice(at)];
  return withItems(moved, level, items);
};

/** Puts `members` (one level's, of one kind) in the order `order` gives, in the slots they held. */
const reorder = <T>(
  all: readonly T[],
  isMember: (x: T) => boolean,
  rank: (x: T) => number,
): T[] => {
  const ranked = all.filter(isMember).sort((a, b) => rank(a) - rank(b));
  let next = 0;
  return all.map((x) => (isMember(x) ? (ranked[next++] ?? x) : x));
};

/**
 * Switches a level's order. To custom: the order it is drawn in now becomes its custom order. Back
 * to groups first: its groups, and its machines, each keep the order the custom order gave them.
 */
export const setLevelOrder = (saved: SavedGroups, level: Level, order: LevelOrder): SavedGroups => {
  if (order === "custom")
    return withItems(saved, level, itemsOf(saved, level) ?? membersOf(saved, level));
  const items = itemsOf(saved, level);
  if (!items) return saved;
  const list = membersOf(saved, level);
  const rank = (i: LevelItem) => list.findIndex((m) => sameItem(m, i));
  return withItems(
    {
      ...saved,
      groups: reorder(
        saved.groups,
        (g) => g.parent === level,
        (g) => rank({ kind: "group", id: g.id }),
      ),
      placements: reorder(
        saved.placements,
        (p) => p.group === level,
        (p) => rank({ kind: "machine", name: p.name }),
      ),
    },
    level,
    null,
  );
};

/**
 * Before a move to a place in a level sorted A to Z or Z to A: the order the level shows now becomes
 * its custom order, and that sort becomes custom, so the move lands where it was dropped (the user,
 * 2026-11-17: "When the user manually moves something, it needs to change to custom").
 */
export const freezeSort = (
  saved: SavedGroups,
  level: Level,
  which: "subgroups" | "machines",
): SavedGroups => {
  const group = saved.groups.find((g) => g.id === level);
  const choice =
    which === "subgroups"
      ? (group?.subgroupSort ?? saved.topSubgroupSort)
      : (group?.machineSort ?? saved.topMachineSort);
  if (choice === "custom") return saved;
  const frozen =
    which === "subgroups"
      ? (() => {
          const shown = sortedBy(
            choice,
            saved.groups.filter((g) => g.parent === level),
            (g) => g.name,
          ).map((g) => g.id);
          return {
            ...saved,
            groups: reorder(
              saved.groups,
              (g) => g.parent === level,
              (g) => shown.indexOf(g.id),
            ),
          };
        })()
      : (() => {
          const shown = sortedBy(
            choice,
            saved.placements.filter((p) => p.group === level).map((p) => p.name),
            machineLabel,
          );
          return {
            ...saved,
            placements: reorder(
              saved.placements,
              (p) => p.group === level,
              (p) => shown.indexOf(p.name),
            ),
          };
        })();
  return setSort(frozen, level, which, "custom");
};
