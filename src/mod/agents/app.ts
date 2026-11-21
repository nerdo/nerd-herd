// The Agents mod's composition root: wires the Herdr adapter to the session list.
import { type AgentsRow, arrangeSessions } from "../../core/sessions/sessionList";
import { type SortChoice, sortChoices } from "../../core/sessions/sortChoices";
import { doneSessions, startingLabels, withLedger } from "../../core/sessions/doneLedger";
import { dismissal } from "../../core/sessions/dismiss";
import { readVcsInfo } from "../../core/vcs/readVcsInfo";
import { type VcsTail, vcsTail } from "../../core/vcs/vcsTail";
import { duration, type SinceRecord, statusSince } from "../../core/sessions/statusTime";
import type { BannerFile } from "../../core/banners/bannerCache";
import { groupLook } from "../../core/groups/groupLook";
import type { SavedGroup } from "../../core/groups/groupModel";
import {
  focusSession,
  promptRename,
  readFolded,
  readFoldedStatuses,
  readGroups,
  readGroupWord,
  readSessions,
  readSort,
  readTerminals,
  readVcsTargets,
  togglePin,
  vcsIn,
  focusedTerminal,
  runHc,
  renameSession,
  saveFolded,
  saveFoldedStatuses,
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
      : link === g.secondOpenBanner
        ? (g.secondOpenBannerFile ?? null)
        : link === g.secondFoldedBanner
          ? (g.secondFoldedBannerFile ?? null)
          : null;

const sinceKey = "nerd-herd-agents.since";

/** When each session entered its status, kept in this mod's local storage as Herdr's list keeps it. */
let since: SinceRecord = (() => {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(sinceKey) ?? "{}");
    return typeof saved === "object" && saved !== null && !Array.isArray(saved)
      ? Object.fromEntries(
          Object.entries(saved).flatMap(([k, v]): [string, { s: string; at: number }][] =>
            typeof v === "object" &&
            v !== null &&
            typeof v.s === "string" &&
            typeof v.at === "number"
              ? [[k, { s: v.s, at: v.at }]]
              : [],
          ),
        )
      : {};
  } catch {
    return {};
  }
})();

/** Each session's version control label, read in the background (refreshVcs). */
const vcs = new Map<string, VcsTail | null>();

/** Starting points already sent, so a session is labeled once while the label is on its way. */
const sent = new Set<string>();

export const agentsApp = {
  /** Reads every session's version control label again; true when any label changed. */
  refreshVcs: async (): Promise<boolean> => {
    let changed = false;
    for (const target of readVcsTargets()) {
      const info = await readVcsInfo(vcsIn(target.cwd, target.machine));
      const label = info === null ? null : vcsTail(info, { place: target.place });
      if (
        JSON.stringify(vcs.get(target.terminal)) !== JSON.stringify(label) ||
        !vcs.has(target.terminal)
      ) {
        vcs.set(target.terminal, label);
        changed = true;
      }
    }
    return changed;
  },
  /** A session's version control label, once read; null before it was read or with none. */
  vcs: (terminal: string): VcsTail | null => vcs.get(terminal) ?? null,
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
  rows: (): AgentsRow[] => {
    const sessions = withLedger(readSessions(), doneSessions(readTerminals()));
    const next = statusSince(since, sessions, Date.now());
    if (next !== since && Object.keys(next).some((k) => next[k] !== since[k])) {
      since = next;
      try {
        localStorage.setItem(sinceKey, JSON.stringify(since));
      } catch {}
    }
    return arrangeSessions({
      sort: readSort(),
      sessions,
      groups: readGroups(),
      folded: readFolded(),
      foldedStatuses: readFoldedStatuses(),
    });
  },
  /** How long a session has been in its status, as Herdr writes it; null before it was seen. */
  since: (terminal: string): string | null => {
    const at = since[terminal]?.at;
    return at === undefined ? null : duration(Date.now() - at);
  },
  sortChoices: (): SortChoice[] => sortChoices(readGroupWord()),
  currentSort: (): unknown => readSort(),
  /** Folds or unfolds a status section ("done") or folder ("<group>/done") in Agents. */
  foldStatus: (key: string): void => {
    const folded = readFoldedStatuses();
    saveFoldedStatuses(folded.includes(key) ? folded.filter((k) => k !== key) : [...folded, key]);
  },
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
  pin: (terminal: TerminalAddress): void => togglePin(terminal),
  promptRename: (terminal: TerminalAddress): void => promptRename(terminal),
};
