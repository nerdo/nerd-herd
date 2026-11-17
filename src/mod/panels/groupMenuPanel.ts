// The menu a right-click on a group header opens: Rename, Delete, Move to…, Settings. The ungrouped
// header's menu has Rename only.
import { v_flex } from "gpui-base";
import { div } from "gpui-kit";
import type { GroupId } from "../../core/groups/groupModel";
import { themeColor } from "../themeColor";
import { close, openPanel, type Panel, send, type Theme } from "./formParts";

export type MenuTarget =
  | { readonly kind: "group"; readonly group: GroupId; readonly name: string }
  | { readonly kind: "ungrouped"; readonly name: string };

export class GroupMenuPanel implements Panel {
  constructor(private readonly target: MenuTarget) {}

  render(t: Theme) {
    const item = (id: string, text: string, act: () => void) =>
      div()
        .id(`menu-${id}`)
        .h(28)
        .px(10)
        .flex()
        .items_center()
        .rounded(6)
        .text_size(12.5)
        .cursor_pointer()
        .hover((s) => s.bg(themeColor(t, "hover")))
        .on_click(() => {
          close();
          act();
        })
        .child(text);
    const target = this.target;
    const items =
      target.kind === "ungrouped"
        ? [item("rename", "Rename", () => openPanel({ panel: "name", target }))]
        : [
            item("rename", "Rename", () =>
              openPanel({ panel: "name", target: { ...target, kind: "group" } }),
            ),
            item("delete", "Delete", () => send("group-delete", { group: target.group })),
            item("move", "Move to…", () => openPanel({ panel: "move", group: target.group })),
            item("settings", "Settings", () =>
              openPanel({ panel: "group-settings", group: target.group }),
            ),
          ];
    return v_flex()
      .size_full()
      .p(4)
      .bg(themeColor(t, "popover"))
      .text_color(themeColor(t, "foreground"))
      .children(items);
  }
}
