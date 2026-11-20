// The Agents mod's adapter to Herdr: reads the agent sessions, renames a session's tab, focuses its
// pane. Walking-skeleton stubs: each names itself and passes what it received inward.
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
  const tab = agents().find((a) => a.address === terminal)?.tab;
  run("tab.rename", { id: tab, name });
};

export const focusSession = (terminal: TerminalAddress): void => {
  run("pane.focus", { terminal });
};
