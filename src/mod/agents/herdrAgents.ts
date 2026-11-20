// The Agents mod's adapter to Herdr: reads the agent sessions, renames a session's tab, focuses its
// pane.
import { agents, run, spaces } from "herdr";
import type { SessionInput, TerminalAddress } from "../../core/sessions/sessionList";

export type { TerminalAddress };

/** Herdr's agent sessions, each with the machine its space lives on (null: this computer). */
export const readSessions = (): SessionInput[] => {
  const machineOf = new Map(spaces().map((space) => [space.id, space.machine]));
  const namedTab = new Map(
    spaces().flatMap((space) =>
      space.tabs.filter((t) => t.named).map((t) => [t.id, t.name] as const),
    ),
  );
  return agents().map((a) => ({
    terminal: a.address,
    title: a.title,
    space: a.space_name,
    machine: machineOf.get(a.space) ?? null,
    status: a.status,
    icon: a.program.icon ? { path: a.program.icon, tint: a.program.tint } : null,
    tabName: namedTab.get(a.tab) ?? null,
  }));
};

export const renameSession = (terminal: TerminalAddress, name: string): void => {
  // Without an id Herdr renames the tab it has selected, so a terminal it does not list renames none.
  const tab = agents().find((a) => a.address === terminal)?.tab;
  if (tab !== undefined) run("tab.rename", { id: tab, name });
};

export const focusSession = (terminal: TerminalAddress): void => {
  run("pane.focus", { terminal });
};

/** Opens Herdr's own rename prompt for the session's tab (tab.rename with no name asks the person). */
export const promptRename = (terminal: TerminalAddress): void => {
  const tab = agents().find((a) => a.address === terminal)?.tab;
  if (tab !== undefined) run("tab.rename", { id: tab });
};
