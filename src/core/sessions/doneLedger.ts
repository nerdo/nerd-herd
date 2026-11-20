// Which agent sessions sit under nerd-herd's Done: those that finished a turn Dannel has not dealt
// with, by dismissing it (the nerd-herd.handled label) or replying.

export type TerminalAddress = string;

/** One terminal as herdr-core describes it: its status word, its turn count and its labels. */
export interface CoreTerminal {
  readonly address: TerminalAddress;
  readonly status: "working" | "blocked" | "done" | "idle" | null;
  /** Goes up each time the status leaves working. */
  readonly turn: number;
  readonly labels: Readonly<Record<string, string>>;
}

const handledKey = "nerd-herd.handled";
const seenKey = "herdr.seen";

/** A label holding a whole turn number; anything else counts as no label. */
const turnIn = (label: string | undefined): number | null =>
  label !== undefined && /^\d+$/.test(label) ? Number(label) : null;

/** The last turn dealt with: the handled label, else (before any dismissal) Herdr's seen turn. */
const dealtWith = (t: CoreTerminal): number =>
  turnIn(t.labels[handledKey]) ?? turnIn(t.labels[seenKey]) ?? 0;

export const doneSessions = (terminals: readonly CoreTerminal[]): Set<TerminalAddress> =>
  new Set(
    terminals.filter((t) => t.status !== "working" && t.turn > dealtWith(t)).map((t) => t.address),
  );

type Status = "working" | "blocked" | "done" | "idle";

/** Sessions with nerd-herd's Done: Done when the ledger names them, Herdr's other done as Idle. */
export const withLedger = <
  S extends { readonly terminal: TerminalAddress; readonly status: Status },
>(
  sessions: readonly S[],
  done: ReadonlySet<TerminalAddress>,
): S[] =>
  sessions.map((s) =>
    done.has(s.terminal)
      ? { ...s, status: "done" }
      : s.status === "done"
        ? { ...s, status: "idle" }
        : s,
  );

/** The hc label commands recording each unlabeled session's starting point: its seen turn. */
export const startingLabels = (terminals: readonly CoreTerminal[]): string[][] =>
  terminals
    .filter((t) => turnIn(t.labels[handledKey]) === null)
    .map((t) => ["label", t.address, `${handledKey}=${turnIn(t.labels[seenKey]) ?? 0}`]);
