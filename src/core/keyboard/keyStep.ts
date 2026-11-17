import type { GroupId, MachineName, SavedGroups, SpacesRow } from "../groups/groupModel";

/** A row the keyboard can focus or cut: a group or a machine. */
export type RowKey =
  | { readonly kind: "group"; readonly id: GroupId }
  | { readonly kind: "machine"; readonly name: MachineName };

/** What the keyboard holds: the focused row and the row waiting to be pasted. */
export interface KeyState {
  readonly focused: RowKey | null;
  readonly cut: RowKey | null;
}

/** A key command from the mod:nerd-herd-spaces section of keys.json. */
export type KeyCommand = "up" | "down" | "fold" | "rename" | "cut" | "paste";

/** What a key asks the mod to do besides moving focus: run a command, or open the rename dialog. */
export type KeyEffect =
  | { readonly kind: "command"; readonly command: string }
  | { readonly kind: "rename"; readonly group: GroupId }
  | null;

const keyOf = (row: SpacesRow): RowKey | null =>
  row.kind === "group"
    ? { kind: "group", id: row.id }
    : row.kind === "machine"
      ? { kind: "machine", name: row.name }
      : null;
const same = (a: RowKey | null, b: RowKey | null): boolean =>
  a !== null &&
  b !== null &&
  (a.kind === "group"
    ? b.kind === "group" && a.id === b.id
    : b.kind === "machine" && a.name === b.name);
const command = (action: string, payload: unknown): KeyEffect => ({
  kind: "command",
  command: `${action}:${JSON.stringify(payload)}`,
});

/** The command that moves the cut row onto the target row: into a group, or beside a machine. */
const pasteOnto = (cut: RowKey, target: RowKey, saved: SavedGroups): KeyEffect => {
  const groupOf = (name: MachineName) =>
    saved.placements.find((p) => p.name === name)?.group ?? null;
  if (cut.kind === "machine")
    return target.kind === "group"
      ? command("machine-move", { machine: cut.name, group: target.id })
      : command("machine-move", {
          machine: cut.name,
          group: groupOf(target.name),
          before: target.name,
        });
  return command("group-move", {
    group: cut.id,
    parent: target.kind === "group" ? target.id : groupOf(target.name),
  });
};

/**
 * What one key does in the Spaces mod. Up and Down move focus between group and machine rows,
 * Enter (fold) folds or unfolds the focused group, F2 (rename) renames it, cut holds the focused row,
 * and paste moves the held row onto the focused one.
 */
export const keyStep = (
  state: KeyState,
  rows: readonly SpacesRow[],
  saved: SavedGroups,
  key: KeyCommand,
): { state: KeyState; effect: KeyEffect } => {
  const keys = rows.flatMap((r) => keyOf(r) ?? []);
  const at = keys.findIndex((k) => same(k, state.focused));
  const focused = state.focused;
  const group =
    focused?.kind === "group" ? saved.groups.find((g) => g.id === focused.id) : undefined;
  switch (key) {
    case "down":
    case "up": {
      const next =
        at < 0
          ? key === "down"
            ? 0
            : keys.length - 1
          : Math.max(0, Math.min(keys.length - 1, at + (key === "down" ? 1 : -1)));
      return { state: { ...state, focused: keys[next] ?? null }, effect: null };
    }
    case "fold":
      return {
        state,
        effect: group ? command("group-fold", { group: group.id, folded: !group.folded }) : null,
      };
    case "rename":
      return { state, effect: group ? { kind: "rename", group: group.id } : null };
    case "cut":
      return { state: { ...state, cut: focused }, effect: null };
    case "paste":
      if (!state.cut || !focused || same(state.cut, focused)) return { state, effect: null };
      return { state: { ...state, cut: null }, effect: pasteOnto(state.cut, focused, saved) };
  }
};

const keyCommands: readonly string[] = ["up", "down", "fold", "rename", "cut", "paste"];
/** True for a key command from keys.json; false for a data command such as `group-fold:{…}`. */
export const isKeyCommand = (command: string): command is KeyCommand =>
  keyCommands.includes(command);
