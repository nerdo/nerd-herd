import type { GroupId, MachineName, SavedGroups } from "./groupModel";

/** A row that can be dragged, cut, or dropped on: a group or a machine. */
export type RowKey =
  | { readonly kind: "group"; readonly id: GroupId }
  | { readonly kind: "machine"; readonly name: MachineName };
/** Where on the target the row was dropped: its top part, or the rest of it. */
export type DropZone = "before" | "onto";
export type DropEffect = { readonly kind: "command"; readonly command: string } | null;

const same = (a: RowKey, b: RowKey): boolean =>
  a.kind === "group"
    ? b.kind === "group" && a.id === b.id
    : b.kind === "machine" && a.name === b.name;
const command = (action: string, payload: unknown): DropEffect => ({
  kind: "command",
  command: `${action}:${JSON.stringify(payload)}`,
});

/**
 * The command a drop sends. A machine dropped onto a group moves into it; dropped on a machine it
 * goes before that machine, in that machine's group. A group dropped onto a group nests inside it;
 * dropped before a group it moves beside that group, ahead of it; dropped on a machine it moves into
 * that machine's group. Cut and paste is a drop "onto" the focused row.
 */
export const dropCommand = (
  source: RowKey,
  target: RowKey,
  zone: DropZone,
  saved: SavedGroups,
): DropEffect => {
  if (same(source, target)) return null;
  const groupOf = (name: MachineName) =>
    saved.placements.find((p) => p.name === name)?.group ?? null;
  const parentOf = (id: GroupId) => saved.groups.find((g) => g.id === id)?.parent ?? null;
  if (source.kind === "machine")
    return target.kind === "group"
      ? command("machine-move", { machine: source.name, group: target.id })
      : command("machine-move", {
          machine: source.name,
          group: groupOf(target.name),
          before: target.name,
        });
  if (target.kind === "machine")
    return command("group-move", { group: source.id, parent: groupOf(target.name) });
  return zone === "onto"
    ? command("group-move", { group: source.id, parent: target.id })
    : command("group-move", { group: source.id, parent: parentOf(target.id), before: target.id });
};
