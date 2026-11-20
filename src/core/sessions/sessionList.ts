// Arranges agent sessions into the rows the Agents list draws.

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

export type AgentsRow = AgentsSection | AgentsCard;

export interface ArrangeInput {
  /** The shared `agents.sort` value. */
  readonly sort: unknown;
  readonly sessions: readonly SessionInput[];
}

/** Priority's sections, most urgent first. */
const prioritySections: readonly { status: SessionStatus; label: string }[] = [
  { status: "blocked", label: "Blocked" },
  { status: "done", label: "Done" },
  { status: "working", label: "Working" },
  { status: "idle", label: "Idle" },
];

const thisComputer = "This computer";

const cardOf = (s: SessionInput): AgentsCard => ({
  kind: "card",
  terminal: s.terminal,
  icon: s.icon,
  title: s.title,
  location: `${s.space} · ${s.machine ?? thisComputer}`,
});

export const arrangeSessions = (input: ArrangeInput): AgentsRow[] =>
  prioritySections.flatMap((section) => {
    const members = input.sessions.filter((s) => s.status === section.status);
    return members.length === 0
      ? []
      : [{ kind: "section", label: section.label } as const, ...members.map(cardOf)];
  });
