// How long a session has been in its status, written the way Herdr's Agents list writes it.
import type { SessionStatus, TerminalAddress } from "./sessionList";

export type Milliseconds = number;
export type SinceRecord = Readonly<
  Record<TerminalAddress, { readonly s: string; readonly at: Milliseconds }>
>;

/** A time in Herdr's short form: under a minute, minutes, hours, then days. */
export const duration = (ms: Milliseconds): string => {
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "<1m";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`;
};

/** Done and idle count as one status: looking at a finished session is not the agent doing anything. */
const kindOf = (status: SessionStatus): string => (status === "done" ? "idle" : status);

/** The record of when each session entered its status, with each change since stamped `now`. */
export const statusSince = (
  previous: SinceRecord,
  sessions: readonly { readonly terminal: TerminalAddress; readonly status: SessionStatus }[],
  now: Milliseconds,
): SinceRecord => ({
  ...previous,
  ...Object.fromEntries(
    sessions
      .filter((x) => previous[x.terminal]?.s !== kindOf(x.status))
      .map((x) => [x.terminal, { s: kindOf(x.status), at: now }]),
  ),
});
