import type { BannerFile, BannerLink } from "../banners/bannerCache";
import type { SidebarSettings } from "../settings/sidebarSettings";
import type {
  Count,
  Depth,
  GroupId,
  Machine,
  SavedGroup,
  SavedGroups,
  SpacesRow,
} from "./groupModel";
import { groupLook } from "./groupLook";
import { drawnOrder, itemsOf, machineLabel, sortedBy } from "./levelOrder";

/** The banner a group shows in Spaces: its Spaces look's image for its state; null: the folder. */
const bannerFor = (g: SavedGroup): BannerLink | null => {
  const look = groupLook(g, "spaces", g.folded);
  return look.kind === "banner" ? look.link : null;
};
/** The kept copy of the banner bannerFor picks, or null before it has loaded. */
const bannerFileFor = (g: SavedGroup): BannerFile | null => {
  const link = bannerFor(g);
  if (link === null) return null;
  const kept: [BannerLink | null | undefined, BannerFile | null | undefined][] = [
    [g.openBanner, g.openBannerFile],
    [g.foldedBanner, g.foldedBannerFile],
    [g.secondOpenBanner, g.secondOpenBannerFile],
    [g.secondFoldedBanner, g.secondFoldedBannerFile],
  ];
  return kept.find(([l]) => l === link)?.[1] ?? null;
};

/** The rows the Spaces section draws, level by level (groups first, or a custom order); folded groups hide their contents. */
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
  const groupRows = (g: SavedGroup, depth: Depth): SpacesRow[] => [
    {
      kind: "group",
      id: g.id,
      name: g.name,
      icon: g.icon,
      depth,
      folded: g.folded,
      count: countOf(g),
      banner: bannerFor(g),
      bannerFile: bannerFileFor(g),
      clip: g.clip,
      chevron: g.chevron,
      align: g.align,
      backingColor: g.backingColor,
      controlsColor: g.controlsColor,
    },
    ...(g.folded ? [] : level(g, depth + 1)),
  ];
  // A level draws its groups, then its machines, each in its sort; or, in a custom order, both kinds
  // in that order, where the sorts do not apply.
  const level = (group: SavedGroup | null, depth: Depth): SpacesRow[] => {
    const id = group?.id ?? null;
    const custom = itemsOf(saved, id);
    const subgroups = custom
      ? subgroupsOf(id)
      : sortedBy(group?.subgroupSort ?? saved.topSubgroupSort, subgroupsOf(id), (g) => g.name);
    const own = custom
      ? machinesIn(id)
      : sortedBy(group?.machineSort ?? saved.topMachineSort, machinesIn(id), (m) =>
          machineLabel(m.name),
        );
    if (custom) {
      const order = drawnOrder(
        custom,
        subgroups.map((g) => ({ kind: "group", id: g.id })),
        own.map((m) => ({ kind: "machine", name: m.name })),
      );
      return order.flatMap((item): SpacesRow[] => {
        if (item.kind === "machine") {
          const found = own.find((m) => m.name === item.name);
          return found ? [machineRow(found, depth)] : [];
        }
        const found = subgroups.find((g) => g.id === item.id);
        return found ? groupRows(found, depth) : [];
      });
    }
    // The ungrouped header sits between the top's groups and its machines, so only groups first has it.
    const header: SpacesRow[] =
      group === null && settings.ungroupedHeader && own.length > 0
        ? [{ kind: "ungrouped", name: settings.ungroupedName }]
        : [];
    return [
      ...subgroups.flatMap((g) => groupRows(g, depth)),
      ...header,
      ...own.map((m) => machineRow(m, depth)),
    ];
  };
  return level(null, 0);
};
