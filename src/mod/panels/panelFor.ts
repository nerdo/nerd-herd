// Builds the panel an overlay of the Spaces mod draws, from the props it was opened with. The props
// cross from one view to another, so they are checked rather than trusted.
import type { AsyncContext } from "gpui-kit";
import { levelOrderOf } from "../../core/groups/levelOrder";
import { z } from "../../core/schema/zod";
import type { SpacesViewModel } from "../app";
import { openMenu, openPanel, type Panel } from "./formParts";
import { GroupMenuPanel } from "./groupMenuPanel";
import { GroupSettingsPanel } from "./groupSettingsPanel";
import { MovePanel } from "./movePanel";
import { NamePanel } from "./namePanel";
import { SpacesSettingsPanel } from "./spacesSettingsPanel";

const id = z.string().min(1);
export const PanelProps = z.discriminatedUnion("panel", [
  z.object({
    panel: z.literal("menu"),
    target: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("group"), group: id, name: z.string() }),
      z.object({ kind: z.literal("ungrouped"), name: z.string() }),
    ]),
  }),
  z.object({
    panel: z.literal("name"),
    target: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("new"), parent: id.nullable() }),
      z.object({ kind: z.literal("group"), group: id, name: z.string() }),
      z.object({ kind: z.literal("ungrouped"), name: z.string() }),
    ]),
  }),
  z.object({ panel: z.literal("move"), group: id }),
  z.object({
    panel: z.literal("group-settings"),
    group: id,
    /** A color picker to show open; otherwise each opens from its swatch. */
    picker: z.enum(["backing", "controls"]).optional(),
  }),
  z.object({ panel: z.literal("spaces-settings") }),
]);

/** The panel for these props, or null when they name no panel this mod draws. */
export const panelFor = (props: unknown, view: SpacesViewModel, cx: AsyncContext): Panel | null => {
  const parsed = PanelProps.safeParse(props);
  if (!parsed.success) return null;
  const p = parsed.data;
  const word = view.settings.groupWord;
  switch (p.panel) {
    case "menu":
      return new GroupMenuPanel(p.target);
    case "name":
      return new NamePanel(p.target, word, cx);
    case "move":
      return new MovePanel(p.group, view.groups, word);
    case "group-settings": {
      const group = view.groups.groups.find((g) => g.id === p.group);
      return group
        ? new GroupSettingsPanel(
            group,
            word.singular,
            levelOrderOf(view.groups, group.id),
            cx,
            p.picker ?? null,
          )
        : null;
    }
    case "spaces-settings":
      return new SpacesSettingsPanel(view.settings, levelOrderOf(view.groups, null), cx);
  }
};

/**
 * Opens the dialog or menu an `open:<props>` command names (what the cog wheels, the group menu,
 * and a keys.json binding open). A group may be named by its id or its name. False when the props
 * name nothing this mod opens.
 */
export const openFromCommand = (json: unknown, view: SpacesViewModel): boolean => {
  const byName = (ref: unknown) =>
    typeof ref === "string"
      ? ((
          view.groups.groups.find((g) => g.id === ref) ??
          view.groups.groups.find((g) => g.name === ref)
        )?.id ?? ref)
      : ref;
  const resolved =
    typeof json === "object" && json !== null
      ? {
          ...json,
          ...("group" in json ? { group: byName(json.group) } : {}),
          ...("target" in json && typeof json.target === "object" && json.target !== null
            ? {
                target: {
                  ...json.target,
                  ...("group" in json.target ? { group: byName(json.target.group) } : {}),
                },
              }
            : {}),
        }
      : json;
  const parsed = PanelProps.safeParse(resolved);
  if (!parsed.success) return false;
  const p = parsed.data;
  if (p.panel === "menu") openMenu(p.target, p.target.kind === "group" ? 4 : 1);
  else openPanel(p);
  return true;
};
