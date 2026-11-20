// Shared inputs for the session list's tests.
import { emptyGroups, type SavedGroups } from "../groups/groupModel";
import type { SessionInput } from "./sessionList";

export const session = (
  o: Partial<SessionInput> & Pick<SessionInput, "terminal">,
): SessionInput => ({
  terminal: o.terminal,
  title: o.title ?? "Phone number collection",
  space: o.space ?? "sandbox",
  machine: o.machine ?? null,
  status: o.status ?? "idle",
  icon: o.icon ?? null,
  tabName: o.tabName ?? null,
  focused: o.focused ?? false,
});

/** Saved groups holding `group` with machines placed in it; other machines are ungrouped. */
export const groups = (
  list: readonly { id: string; name: string; parent?: string; machines?: readonly string[] }[],
): SavedGroups => ({
  ...emptyGroups,
  groups: list.map((g) => ({
    id: g.id,
    name: g.name,
    parent: g.parent ?? null,
    icon: null,
    openBanner: null,
    foldedBanner: null,
    clip: "left",
    folded: false,
    subgroupSort: "custom",
    machineSort: "custom",
    countMode: "allMachines",
    chevron: true,
    align: "middle",
    backingColor: null,
    controlsColor: null,
  })),
  placements: list.flatMap((g) => (g.machines ?? []).map((name) => ({ name, group: g.id }))),
});
