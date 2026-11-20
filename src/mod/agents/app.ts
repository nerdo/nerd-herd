// The Agents mod's composition root: wires the Herdr adapter to the session list.
import { type AgentsRow, arrangeSessions } from "../../core/sessions/sessionList";
import { shared } from "herdr";
import { focusSession, readSessions, renameSession, type TerminalAddress } from "./herdrAgents";

export const agentsApp = {
  rows: (): AgentsRow[] =>
    arrangeSessions({ sort: shared("agents.sort"), sessions: readSessions() }),
  rename: (terminal: TerminalAddress, name: string): void => renameSession(terminal, name),
  focus: (terminal: TerminalAddress): void => focusSession(terminal),
};
