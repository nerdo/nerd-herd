// "Move to…": the places a group can move, from moveTargets; picking one moves the group there.
import { v_flex } from "gpui-base";
import { div } from "gpui-kit";
import type { GroupId, SavedGroups } from "../../core/groups/groupModel";
import { moveTargets } from "../../core/groups/moveTargets";
import type { GroupWord } from "../../core/settings/sidebarSettings";
import { themeColor } from "../themeColor";
import { close, label, type Panel, send, type Theme, title } from "./formParts";

export class MovePanel implements Panel {
  constructor(
    private readonly group: GroupId,
    private readonly saved: SavedGroups,
    private readonly word: GroupWord,
  ) {}

  render(t: Theme) {
    const name = this.saved.groups.find((g) => g.id === this.group)?.name ?? "";
    const rows = moveTargets(this.saved, this.group).map((target) =>
      div()
        .id(`move-${target.id ?? "top"}`)
        .h(28)
        .px(10)
        .flex()
        .items_center()
        .rounded(6)
        .text_size(12.5)
        .cursor_pointer()
        .hover((s) => s.bg(themeColor(t, "hover")))
        .on_click(() => {
          send("group-move", { group: this.group, parent: target.id });
          close();
        })
        .child(target.name ?? `Top level (no ${this.word.singular.toLowerCase()})`),
    );
    return v_flex()
      .size_full()
      .p(18)
      .bg(themeColor(t, "popover"))
      .text_color(themeColor(t, "foreground"))
      .child(title(t, `Move ${name} to…`))
      .child(label(t, "Destination"))
      .children(rows);
  }
}
