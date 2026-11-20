// The Agents mod's composition root: wires the Herdr adapter to the session list.
import { type AgentsRow, arrangeSessions } from "../../core/sessions/sessionList";
import { type SortChoice, sortChoices } from "../../core/sessions/sortChoices";
import { doneSessions, startingLabels, withLedger } from "../../core/sessions/doneLedger";
import { dismissal } from "../../core/sessions/dismiss";
import type { BannerFile } from "../../core/banners/bannerCache";
import { groupLook } from "../../core/groups/groupLook";
import type { SavedGroup } from "../../core/groups/groupModel";
import {
  focusSession,
  promptRename,
  readFolded,
  readGroups,
  readGroupWord,
  readSessions,
  readSort,
  readTerminals,
  focusedTerminal,
  runHc,
  renameSession,
  saveFolded,
  saveSort,
  type TerminalAddress,
} from "./herdrAgents";

/** What Agents draws for a group's header: its kept banner image, or its folder with its icon. */
export type AgentsGroupHeader =
  | { readonly kind: "banner"; readonly file: BannerFile; readonly group: SavedGroup }
  | { readonly kind: "folder"; readonly group: SavedGroup };

/** The kept copy of a banner link; null until Spaces has loaded that link. */
const keptFile = (g: SavedGroup, link: string): BannerFile | null =>
  link === g.openBanner
    ? (g.openBannerFile ?? null)
    : link === g.foldedBanner
      ? (g.foldedBannerFile ?? null)
      : null;

/** Starting points already sent, so a session is labeled once while the label is on its way. */
const sent = new Set<string>();

export const agentsApp = {
  /** Records the starting point of each session nerd-herd reads for the first time. */
  recordStartingPoints: (): void => {
    for (const args of startingLabels(readTerminals())) {
      const terminal = args[1] ?? "";
      if (sent.has(terminal)) continue;
      sent.add(terminal);
      void runHc(args);
    }
  },
  /** Dismisses the focused session when it is under Done: its turn becomes its handled turn. */
  dismiss: async (): Promise<void> => {
    const terminals = readTerminals();
    const args = dismissal(focusedTerminal(), terminals, doneSessions(terminals));
    if (args) await runHc(args);
  },
  /** The group's Agents look, as its header draws it; null for a group nerd-herd no longer has. */
  groupHeader: (id: string, folded: boolean): AgentsGroupHeader | null => {
    const group = readGroups().groups.find((g) => g.id === id);
    if (!group) return null;
    const look = groupLook(group, "agents", folded);
    const file = look.kind === "banner" ? keptFile(group, look.link) : null;
    return file ? { kind: "banner", file, group } : { kind: "folder", group };
  },
  rows: (): AgentsRow[] =>
    arrangeSessions({
      sort: readSort(),
      sessions: withLedger(readSessions(), doneSessions(readTerminals())),
      groups: readGroups(),
      folded: readFolded(),
    }),
  sortChoices: (): SortChoice[] => sortChoices(readGroupWord()),
  currentSort: (): unknown => readSort(),
  /** Folds or unfolds a group in Agents, named by its id or its name; Spaces' fold is untouched. */
  fold: (ref: string): void => {
    const groups = readGroups().groups;
    const id = (groups.find((g) => g.id === ref) ?? groups.find((g) => g.name === ref))?.id;
    if (id === undefined) return;
    const folded = readFolded();
    saveFolded(folded.includes(id) ? folded.filter((f) => f !== id) : [...folded, id]);
  },
  /** Saves a sort the menu offers; any other id is ignored. */
  sort: (id: string): void => {
    const choice = sortChoices(readGroupWord()).find((c) => c.id === id);
    if (choice) saveSort(choice.id);
  },
  rename: (terminal: TerminalAddress, name: string): void => renameSession(terminal, name),
  focus: (terminal: TerminalAddress): void => focusSession(terminal),
  promptRename: (terminal: TerminalAddress): void => promptRename(terminal),
};
