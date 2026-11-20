// A group's header in the Agents list, drawn the way Spaces draws a group: its banner image (offset
// by its clip side), or its icon and name. A click folds the group in Agents only.
import { h_flex } from "gpui-base";
import { div, type Element, image, svg } from "gpui-kit";
import { bannerOffset } from "../../core/presentation/spacesText";
import type { AgentsGroup } from "../../core/sessions/sessionList";
import { bannerSpace } from "../groupHeaderView";
import { themeColor } from "../themeColor";
import type { AgentsGroupHeader } from "./app";

type Theme = Record<string, string>;

export const agentsGroupHeader = (
  t: Theme,
  row: AgentsGroup,
  header: AgentsGroupHeader | null,
  fold: () => void,
): Element => {
  const named = row.inside === null ? row.name : `${row.name} · in ${row.inside}`;
  if (header?.kind === "banner") {
    const { file, group } = header;
    return div()
      .id(`agents-group-${row.id}`)
      .mt(8)
      .flex_none()
      .h(file.height)
      .overflow_x_hidden()
      .cursor_pointer()
      .on_click(fold)
      .child(
        image(file.path)
          .w(file.width)
          .h(file.height)
          .flex_none()
          .ml(bannerOffset(file.width, bannerSpace(), group.clip)),
      );
  }
  const icon = header?.group.icon ?? null;
  return h_flex()
    .id(`agents-group-${row.id}`)
    .mt(8)
    .h(26)
    .gap(7)
    .items_center()
    .rounded(6)
    .cursor_pointer()
    .hover((s) => s.bg(themeColor(t, "hover")))
    .on_click(fold)
    .child(
      icon
        ? div().flex_none().child(icon.value)
        : svg("mods/workspace-chrome/folder.svg").size(13).flex_none(),
    )
    .child(div().flex_1().font_semibold().text_color(themeColor(t, "foreground")).child(named));
};
