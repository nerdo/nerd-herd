import type { BannerLink } from "../banners/bannerCache";
import type { SidebarSettings } from "../settings/sidebarSettings";
import { type SortChoice, sortOrder } from "../sorting/sortOrder";
import type {
  Count,
  Depth,
  GroupId,
  Machine,
  MachineName,
  SavedGroup,
  SavedGroups,
  SpacesRow,
} from "./groupModel";

const thisComputer = "This computer";
const machineLabel = (name: MachineName): string => name ?? thisComputer;

/** The banner a group shows: the one for its state, or the only one it has. */
const bannerFor = (g: SavedGroup): BannerLink | null =>
  g.folded ? (g.foldedBanner ?? g.openBanner) : (g.openBanner ?? g.foldedBanner);

/** The rows the Spaces section draws: groups first, then machines, at each level; folded groups hide their contents. */
export const computeRows = (
  saved: SavedGroups,
  machines: readonly Machine[],
  settings: SidebarSettings,
): SpacesRow[] => {
  const listed = new Map(machines.map((m) => [m.name, m]));
  const placed = saved.placements.filter((p) => listed.has(p.name));
  const unplaced = machines
    .filter((m) => !saved.placements.some((p) => p.name === m.name))
    .sort((a, b) =>
      a.name === null
        ? -1
        : b.name === null
          ? 1
          : machineLabel(a.name).localeCompare(machineLabel(b.name)),
    );
  const machinesIn = (group: GroupId | null): Machine[] => [
    ...placed.filter((p) => p.group === group).flatMap((p) => listed.get(p.name) ?? []),
    ...(group === null ? unplaced : []),
  ];
  const subgroupsOf = (group: GroupId | null) => saved.groups.filter((g) => g.parent === group);
  const sorted = <T>(choice: SortChoice, items: readonly T[], name: (item: T) => string): T[] =>
    sortOrder(
      choice,
      items.map((item) => ({ name: name(item), item })),
    ).map((n) => n.item);
  const countOf = (g: SavedGroup): Count => {
    const direct = machinesIn(g.id).length;
    if (g.countMode === "directMachines") return direct;
    if (g.countMode === "directItems") return direct + subgroupsOf(g.id).length;
    return (
      direct +
      subgroupsOf(g.id).reduce((n, s) => n + countOf({ ...s, countMode: "allMachines" }), 0)
    );
  };
  const machineRow = (m: Machine, depth: Depth): SpacesRow => ({
    kind: "machine",
    name: m.name,
    depth,
    reachable: m.reachable,
  });
  const level = (group: SavedGroup | null, depth: Depth): SpacesRow[] => {
    const subgroups = sorted(
      group?.subgroupSort ?? saved.topSubgroupSort,
      subgroupsOf(group?.id ?? null),
      (g) => g.name,
    );
    const own = sorted(
      group?.machineSort ?? saved.topMachineSort,
      machinesIn(group?.id ?? null),
      (m) => machineLabel(m.name),
    );
    const groupRows = subgroups.flatMap((g): SpacesRow[] => [
      {
        kind: "group",
        id: g.id,
        name: g.name,
        icon: g.icon,
        depth,
        folded: g.folded,
        count: countOf(g),
        banner: bannerFor(g),
        clip: g.clip,
        chevron: g.chevron,
        align: g.align,
      },
      ...(g.folded ? [] : level(g, depth + 1)),
    ]);
    const header: SpacesRow[] =
      group === null && settings.ungroupedHeader && own.length > 0
        ? [{ kind: "ungrouped", name: settings.ungroupedName }]
        : [];
    return [...groupRows, ...header, ...own.map((m) => machineRow(m, depth))];
  };
  return level(null, 0);
};
