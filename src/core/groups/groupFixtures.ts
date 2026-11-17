import { defaultSettings } from "../settings/sidebarSettings";
import { makeGroup, placeMachine, setBanner, setFolded } from "./groupActions";
import {
  emptyGroups,
  type GroupId,
  GroupNameError,
  type Machine,
  type SavedGroups,
  type SpacesRow,
} from "./groupModel";
import { computeRows } from "./groupRows";

// Shared fixtures for the group model's spec-driven tests (one file per behavior beside this one).

export { computeRows, defaultSettings, emptyGroups };

export const local: Machine = { name: null, reachable: true };
export const m = (name: string): Machine => ({ name, reachable: true });
export const make = (
  saved: SavedGroups,
  id: GroupId,
  name: string,
  parent: GroupId | null = null,
) => makeGroup(saved, { id, name, parent });
export const labelOf = (r: SpacesRow): string =>
  r.kind === "machine" ? (r.name ?? "This computer") : r.name;
export const labels = (rows: readonly SpacesRow[]) => rows.map(labelOf);
export const header = (rows: readonly SpacesRow[], name: string) =>
  rows.find(
    (r): r is Extract<SpacesRow, { kind: "group" }> => r.kind === "group" && r.name === name,
  );
/** The rows directly inside the named group (one level deeper), in drawn order. */
export const inside = (rows: readonly SpacesRow[], name: string): SpacesRow[] => {
  const at = rows.findIndex((r) => r.kind === "group" && r.name === name);
  const own = rows[at];
  if (at < 0 || !own || own.kind !== "group") return [];
  const out: SpacesRow[] = [];
  for (const r of rows.slice(at + 1)) {
    if (!("depth" in r) || r.depth <= own.depth) break;
    if (r.depth === own.depth + 1) out.push(r);
  }
  return out;
};
export const thrown = (act: () => unknown): GroupNameError | undefined => {
  try {
    act();
  } catch (error) {
    if (error instanceof GroupNameError) return error;
    throw error;
  }
  return undefined;
};
/** Work holds desk-work and Clients; Clients holds ai-sandbox and desk-client; Work is folded. */
export const nestedWork = () => {
  let saved = make(make(emptyGroups, "work", "Work"), "clients", "Clients", "work");
  saved = placeMachine(saved, "desk-work", "work");
  saved = placeMachine(
    placeMachine(saved, "ai-sandbox", "clients"),
    "desk-client",
    "clients",
  );
  return setFolded(saved, "work", true);
};
export const machinesOfNestedWork = ["desk-work", "ai-sandbox", "desk-client"].map(
  m,
);
/** Work holds, in custom order, desk-work, Clients, desk-client, Archive. */
export const mixedWork = () => {
  let saved = make(emptyGroups, "work", "Work");
  saved = placeMachine(saved, "desk-work", "work");
  saved = make(saved, "clients", "Clients", "work");
  saved = placeMachine(saved, "desk-client", "work");
  return make(saved, "archive", "Archive", "work");
};
export const machinesOfMixedWork = ["desk-work", "desk-client"].map(m);
export const twoBanners = () =>
  setBanner(
    setBanner(
      make(emptyGroups, "work", "Work"),
      "work",
      "open",
      "https://banners.example/open.png",
    ),
    "work",
    "folded",
    "https://banners.example/folded.png",
  );
