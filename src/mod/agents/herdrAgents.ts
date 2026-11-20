// The Agents mod's adapter to Herdr: reads the agent sessions, renames a session's tab, focuses its
// pane.
import { agents, run, setShared, shared, spaces, terminals } from "herdr";
import type { CoreTerminal } from "../../core/sessions/doneLedger";
import type { SavedGroups } from "../../core/groups/groupModel";
import type { SortId } from "../../core/sessions/sortChoices";
import { createSettingsStore } from "../../core/settings/settingsStore";
import type { GroupWord } from "../../core/settings/sidebarSettings";
import { createGroupStore, type SharedState } from "../../core/store/savedGroupStore";
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

/** Herdr's shared state, read only: Spaces owns nerd-herd's saved groups and settings, and alone
 *  backs up or rewrites them; Agents only reads them. */
const readOnly: SharedState = { read: (key) => shared(key), write: () => {} };

/** nerd-herd's saved Spaces groups, as Spaces reads them (damaged data reads as no groups). */
export const readGroups = (): SavedGroups => createGroupStore(readOnly).load().groups;

/** The word Spaces uses for a group. */
export const readGroupWord = (): GroupWord =>
  createSettingsStore(readOnly).load().settings.groupWord;

/** The sort Herdr's Agents list and this one share. */
export const readSort = (): unknown => shared("agents.sort");
export const saveSort = (id: SortId): void => {
  setShared("agents.sort", id);
};

const foldedKey = "nerd-herd-agents.folded";

/** The groups folded in Agents (kept apart from Spaces' folds). */
export const readFolded = (): string[] => {
  const saved: unknown = shared(foldedKey);
  return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === "string") : [];
};
export const saveFolded = (ids: readonly string[]): void => {
  setShared(foldedKey, ids);
};

const statuses = ["working", "blocked", "done", "idle"] as const;
const own = (value: unknown, key: string): unknown =>
  typeof value === "object" && value !== null
    ? Object.getOwnPropertyDescriptor(value, key)?.value
    : undefined;

/** Herdr's core terminals, narrowed at this boundary: a status word, a turn count, text labels. */
export const readTerminals = (): CoreTerminal[] =>
  terminals().flatMap((t): CoreTerminal[] => {
    const address = own(t, "address");
    const turn = own(t, "turn");
    if (typeof address !== "string" || typeof turn !== "number") return [];
    const status = statuses.find((s) => s === own(t, "status")) ?? null;
    const raw = own(t, "labels");
    const labels = Object.fromEntries(
      typeof raw === "object" && raw !== null
        ? Object.entries(raw).filter((e): e is [string, string] => typeof e[1] === "string")
        : [],
    );
    return [{ address, status, turn, labels }];
  });
