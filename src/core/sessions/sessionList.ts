// Arranges agent sessions into the rows the Agents list draws.

import { emptyGroups, type GroupId, type GroupName, type SavedGroups } from "../groups/groupModel";

export type TerminalAddress = string;
export type MachineName = string;
export type SessionStatus = "working" | "blocked" | "done" | "idle";

/** An agent's icon from Herdr's program table: a one-color glyph to tint, or a picture. */
export interface AgentIcon {
  readonly path: string;
  readonly tint: boolean;
}

/** One agent session as the Agents list reads it from Herdr. */
export interface SessionInput {
  readonly terminal: TerminalAddress;
  readonly title: string;
  readonly space: string;
  /** null: this computer. */
  readonly machine: MachineName | null;
  readonly status: SessionStatus;
  /** The agent's icon (Herdr's program table), or null when Herdr has none. */
  readonly icon: AgentIcon | null;
  /** The name someone gave the session's tab; null while nobody has named it. */
  readonly tabName: string | null;
}

/** A section header in the Agents list, such as Idle. */
export interface AgentsSection {
  readonly kind: "section";
  readonly label: string;
}

/** One card in the Agents list: the session's title, then where it runs. */
export interface AgentsCard {
  readonly kind: "card";
  readonly terminal: TerminalAddress;
  readonly icon: AgentIcon | null;
  readonly title: string;
  readonly location: string;
}

/** A Spaces group's section in Grouped by group; `inside`: the group it sits in, if any. */
export interface AgentsGroup {
  readonly kind: "group";
  readonly id: GroupId;
  readonly name: GroupName;
  readonly inside: GroupName | null;
  /** Folded in Agents (only ever true): the section shows its header alone. */
  readonly folded?: true;
}

/** The section of sessions on machines in no group, after every group's section. */
export interface AgentsUngrouped {
  readonly kind: "ungrouped";
  readonly label: string;
}

/** A status folder inside a group's section (group null: inside Ungrouped), such as Done. */
export interface AgentsFolder {
  readonly kind: "folder";
  readonly group: GroupId | null;
  readonly label: string;
}

export type AgentsRow = AgentsSection | AgentsGroup | AgentsUngrouped | AgentsFolder | AgentsCard;

export interface ArrangeInput {
  /** The shared `agents.sort` value. */
  readonly sort: unknown;
  readonly sessions: readonly SessionInput[];
  /** nerd-herd's saved Spaces groups, for Grouped by group; none: no groups. */
  readonly groups?: SavedGroups;
  /** The groups folded in Agents, which keeps its own folds apart from Spaces'. */
  readonly folded?: readonly GroupId[];
}

/** Priority's sections, most urgent first. */
const prioritySections: readonly { status: SessionStatus; label: string }[] = [
  { status: "blocked", label: "Blocked" },
  { status: "done", label: "Done" },
  { status: "working", label: "Working" },
  { status: "idle", label: "Idle" },
];

const thisComputer = "This computer";

const machineName = (s: SessionInput): string => s.machine ?? thisComputer;

const cardOf = (s: SessionInput, location: string): AgentsCard => ({
  kind: "card",
  terminal: s.terminal,
  icon: s.icon,
  title: s.tabName ?? s.title,
  location,
});

const section = (label: string): AgentsSection => ({ kind: "section", label });

/** Priority: Blocked, Done, Working, Idle; each card names its space and machine. */
const byPriority = (sessions: readonly SessionInput[]): AgentsRow[] =>
  prioritySections.flatMap((s) => {
    const members = sessions.filter((m) => m.status === s.status);
    return members.length === 0
      ? []
      : [section(s.label), ...members.map((m) => cardOf(m, `${m.space} · ${machineName(m)}`))];
  });

/** Grouped by space: a section per space (a space is its name on its machine); cards name the machine. */
const bySpace = (sessions: readonly SessionInput[]): AgentsRow[] => {
  const spaces = new Map<string, SessionInput[]>();
  for (const m of sessions) {
    const key = JSON.stringify([m.space, m.machine]);
    spaces.set(key, [...(spaces.get(key) ?? []), m]);
  }
  return [...spaces.values()].flatMap((members) => [
    section(members[0]?.space ?? ""),
    ...members.map((m) => cardOf(m, machineName(m))),
  ]);
};

/** Each status that has sessions, in Priority's order, with those sessions. */
const byStatus = (sessions: readonly SessionInput[]) =>
  prioritySections
    .map((p) => ({ label: p.label, members: sessions.filter((m) => m.status === p.status) }))
    .filter((p) => p.members.length > 0);

/** Groups depth first, each group's subgroups in their saved order right after it. */
const groupsInOrder = (saved: SavedGroups, parent: GroupId | null = null): SavedGroups["groups"] =>
  saved.groups
    .filter((g) => g.parent === parent)
    .flatMap((g) => [g, ...groupsInOrder(saved, g.id)]);

/** Folders for each status that has sessions, each holding its sessions' cards. */
const folders = (group: GroupId | null, members: readonly SessionInput[]): AgentsRow[] =>
  byStatus(members).flatMap((f) => [
    { kind: "folder", group, label: f.label } as const,
    ...f.members.map((m) => cardOf(m, `${m.space} · ${machineName(m)}`)),
  ]);

const ungroupedLabel = "Ungrouped";

/** Grouped by group: a section per Spaces group, with a folder per status inside it; sessions on
 *  machines in no group come last, under Ungrouped. */
const byGroup = (
  sessions: readonly SessionInput[],
  saved: SavedGroups,
  folded: readonly GroupId[],
): AgentsRow[] => {
  const grouped = groupsInOrder(saved).flatMap((g) => {
    const placed = new Set(saved.placements.filter((p) => p.group === g.id).map((p) => p.name));
    const members = sessions.filter((m) => placed.has(m.machine));
    if (members.length === 0) return [];
    const parent = saved.groups.find((p) => p.id === g.parent)?.name ?? null;
    const header = { kind: "group", id: g.id, name: g.name, inside: parent } as const;
    return folded.includes(g.id)
      ? [{ ...header, folded: true } as const]
      : [header, ...folders(g.id, members)];
  });
  const inGroup = new Set(saved.placements.filter((p) => p.group !== null).map((p) => p.name));
  const ungrouped = sessions.filter((m) => !inGroup.has(m.machine));
  return ungrouped.length === 0
    ? grouped
    : [...grouped, { kind: "ungrouped", label: ungroupedLabel }, ...folders(null, ungrouped)];
};

/** The arrangement for each sort value Agents knows; any other value is Priority, as in Herdr. */
const arrangements: Record<string, (input: ArrangeInput) => AgentsRow[]> = {
  priority: (i) => byPriority(i.sessions),
  grouped: (i) => bySpace(i.sessions),
  groups: (i) => byGroup(i.sessions, i.groups ?? emptyGroups, i.folded ?? []),
};

export const arrangeSessions = (input: ArrangeInput): AgentsRow[] =>
  (typeof input.sort === "string" ? arrangements[input.sort] : undefined)?.(input) ??
  byPriority(input.sessions);
