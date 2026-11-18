import { NerdHerdError } from "../errors/nerdHerdError";
import {
  deleteGroup,
  makeGroup,
  nestGroup,
  placeMachine,
  renameGroup,
  setBanner,
  setFolded,
  setLook,
  setSort,
} from "../groups/groupActions";
import type { GroupId, GroupName, SavedGroups } from "../groups/groupModel";
import { freezeSort, levelOrderOf, placeItem, setLevelOrder } from "../groups/levelOrder";
import { z } from "../schema/zod";
import type { SidebarSettings } from "../settings/sidebarSettings";

/** What the Spaces mod keeps: the saved groups and the sidebar settings. */
export interface SpacesState {
  readonly groups: SavedGroups;
  readonly settings: SidebarSettings;
}

/** A command the mod received could not be applied. */
export class CommandError extends NerdHerdError {
  readonly userAction = "report";
  constructor(
    public readonly command: string,
    options?: { cause?: unknown },
  ) {
    super(options);
    this.setMessage(`Something went wrong on our end. Reference ${this.metadata.errorId}.`);
  }
}

const name = z.string().min(1);
const sort = z.enum(["custom", "alphabetical", "reverseAlphabetical"]);
/** Each action's payload; a group is named by its name or its id. */
const payloads = {
  "settings-word": z.object({ singular: name, plural: name }),
  "group-make": z.object({
    name: z.string(),
    icon: z.string().min(1).optional(),
    parent: name.nullable().optional(),
  }),
  "group-banner": z.object({
    group: name,
    open: z.string().nullable().optional(),
    folded: z.string().nullable().optional(),
  }),
  "machine-move": z.object({
    machine: z.string().nullable(),
    group: name.nullable(),
    before: z.string().nullable().optional(),
    /** Just before this group, at its level: the level switches to a custom order. */
    beforeGroup: name.optional(),
  }),
  "sort-set": z.object({
    group: name.nullable(),
    subgroups: sort.optional(),
    machines: sort.optional(),
  }),
  "group-fold": z.object({ group: name, folded: z.boolean() }),
  "group-rename": z.object({ group: name, name: z.string() }),
  "group-delete": z.object({ group: name }),
  "group-move": z.object({
    group: name,
    parent: name.nullable(),
    before: name.optional(),
    /** Just before this machine (null: this computer): the level switches to a custom order. */
    beforeMachine: z.string().nullable().optional(),
  }),
  "level-order": z.object({ group: name.nullable(), order: z.enum(["groupsFirst", "custom"]) }),
  "group-set": z.object({
    group: name,
    icon: z.string().min(1).nullable().optional(),
    clip: z.enum(["left", "center"]).optional(),
    countMode: z.enum(["allMachines", "directMachines", "directItems"]).optional(),
    chevron: z.boolean().optional(),
    align: z.enum(["top", "middle", "bottom"]).optional(),
  }),
  "settings-ungrouped": z.object({ header: z.boolean().optional(), name: name.optional() }),
  "settings-indent": z.object({ indent: z.boolean() }),
} as const;
type Action = keyof typeof payloads;
const isAction = (a: string): a is Action => a in payloads;

/** The id of the group with this id, else of the first group with this name. */
export const resolve = (
  groups: SavedGroups,
  ref: GroupName | GroupId,
  command: string,
): GroupId => {
  const found =
    groups.groups.find((g) => g.id === ref) ?? groups.groups.find((g) => g.name === ref);
  if (!found) throw new CommandError(command, { cause: `no group ${ref}` });
  return found.id;
};
const resolveOrTop = (groups: SavedGroups, ref: string | null, command: string) =>
  ref === null ? null : resolve(groups, ref, command);

/** Applies one `<action>:<JSON payload>` command to the mod's state. */
export const applyCommand = (
  state: SpacesState,
  command: string,
  newId: () => GroupId,
): SpacesState => {
  const at = command.indexOf(":");
  const action = at < 0 ? command : command.slice(0, at);
  if (!isAction(action)) throw new CommandError(command, { cause: `unknown action ${action}` });
  let json: unknown;
  try {
    json = JSON.parse(at < 0 ? "{}" : command.slice(at + 1));
  } catch (cause) {
    throw new CommandError(command, { cause });
  }
  const g = state.groups;
  const check = <S extends z.ZodType>(schema: S): z.infer<S> => {
    const parsed = schema.safeParse(json);
    if (!parsed.success) throw new CommandError(command, { cause: parsed.error });
    return parsed.data;
  };
  switch (action) {
    case "settings-word": {
      const p = check(payloads["settings-word"]);
      return {
        ...state,
        settings: { ...state.settings, groupWord: { singular: p.singular, plural: p.plural } },
      };
    }
    case "group-make": {
      const p = check(payloads["group-make"]);
      const parent = resolveOrTop(g, p.parent ?? null, command);
      const icon = p.icon ? { kind: "emoji" as const, value: p.icon } : null;
      return { ...state, groups: makeGroup(g, { id: newId(), name: p.name, parent, icon }) };
    }
    case "group-banner": {
      const p = check(payloads["group-banner"]);
      const id = resolve(g, p.group, command);
      let next = p.open === undefined ? g : setBanner(g, id, "open", p.open);
      next = p.folded === undefined ? next : setBanner(next, id, "folded", p.folded);
      return { ...state, groups: next };
    }
    case "machine-move": {
      const p = check(payloads["machine-move"]);
      const group = resolveOrTop(g, p.group, command);
      const item = { kind: "machine" as const, name: p.machine };
      if (p.beforeGroup !== undefined) {
        const before = { kind: "group" as const, id: resolve(g, p.beforeGroup, command) };
        return { ...state, groups: placeItem(g, group, item, before) };
      }
      if (levelOrderOf(g, group) === "custom") {
        const before = p.before === undefined ? null : { kind: "machine" as const, name: p.before };
        return { ...state, groups: placeItem(g, group, item, before) };
      }
      return {
        ...state,
        groups:
          p.before === undefined
            ? placeMachine(g, p.machine, group)
            : placeMachine(freezeSort(g, group, "machines"), p.machine, group, p.before),
      };
    }
    case "sort-set": {
      const p = check(payloads["sort-set"]);
      const id = resolveOrTop(g, p.group, command);
      let next = p.subgroups ? setSort(g, id, "subgroups", p.subgroups) : g;
      next = p.machines ? setSort(next, id, "machines", p.machines) : next;
      return { ...state, groups: next };
    }
    case "group-fold": {
      const p = check(payloads["group-fold"]);
      return { ...state, groups: setFolded(g, resolve(g, p.group, command), p.folded) };
    }
    case "group-rename": {
      const p = check(payloads["group-rename"]);
      return { ...state, groups: renameGroup(g, resolve(g, p.group, command), p.name) };
    }
    case "group-delete": {
      const p = check(payloads["group-delete"]);
      return { ...state, groups: deleteGroup(g, resolve(g, p.group, command)) };
    }
    case "group-move": {
      const p = check(payloads["group-move"]);
      const id = resolve(g, p.group, command);
      const parent = resolveOrTop(g, p.parent, command);
      const item = { kind: "group" as const, id };
      if (p.beforeMachine !== undefined) {
        const before = { kind: "machine" as const, name: p.beforeMachine };
        return { ...state, groups: placeItem(g, parent, item, before) };
      }
      const sibling = p.before === undefined ? undefined : resolve(g, p.before, command);
      if (levelOrderOf(g, parent) === "custom") {
        const before = sibling === undefined ? null : { kind: "group" as const, id: sibling };
        return { ...state, groups: placeItem(g, parent, item, before) };
      }
      return {
        ...state,
        groups:
          sibling === undefined
            ? nestGroup(g, id, parent)
            : nestGroup(freezeSort(g, parent, "subgroups"), id, parent, { before: sibling }),
      };
    }
    case "level-order": {
      const p = check(payloads["level-order"]);
      return { ...state, groups: setLevelOrder(g, resolveOrTop(g, p.group, command), p.order) };
    }
    case "group-set": {
      const p = check(payloads["group-set"]);
      const { group, icon, ...look } = p;
      const options = {
        ...Object.fromEntries(Object.entries(look).filter(([, v]) => v !== undefined)),
        ...(icon === undefined
          ? {}
          : { icon: icon === null ? null : { kind: "emoji" as const, value: icon } }),
      };
      return { ...state, groups: setLook(g, resolve(g, group, command), options) };
    }
    case "settings-ungrouped": {
      const p = check(payloads["settings-ungrouped"]);
      return {
        ...state,
        settings: {
          ...state.settings,
          ungroupedHeader: p.header ?? state.settings.ungroupedHeader,
          ungroupedName: p.name ?? state.settings.ungroupedName,
        },
      };
    }
    case "settings-indent": {
      const p = check(payloads["settings-indent"]);
      return { ...state, settings: { ...state.settings, indentSpaces: p.indent } };
    }
  }
};
