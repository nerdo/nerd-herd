// Builds the panel an overlay of the Spaces mod draws, from the props it was opened with. The props
// cross from one view to another, so they are checked rather than trusted.
import type { AsyncContext } from "gpui-kit";
import { z } from "../../core/schema/zod";
import type { SpacesViewModel } from "../app";
import type { Panel } from "./formParts";
import { GroupMenuPanel } from "./groupMenuPanel";
import { GroupSettingsPanel } from "./groupSettingsPanel";
import { MovePanel } from "./movePanel";
import { NamePanel } from "./namePanel";
import { SpacesSettingsPanel } from "./spacesSettingsPanel";

const id = z.string().min(1);
const PanelProps = z.discriminatedUnion("panel", [
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
  z.object({ panel: z.literal("group-settings"), group: id }),
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
      return group ? new GroupSettingsPanel(group, word.singular, cx) : null;
    }
    case "spaces-settings":
      return new SpacesSettingsPanel(view.settings, cx);
  }
};
