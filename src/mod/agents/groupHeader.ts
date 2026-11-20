// A group's header in the Agents list, drawn the way Spaces draws a group: its banner image (offset
// by its clip side), or its icon and name. A click folds the group in Agents only. Folded, it shows
// what inside needs attention (Herdr's spinner, Needs you, a Done dot and count), on the banner's
// strip placed and colored by the group's Agents overlay settings.
import { h_flex } from "gpui-base";
import { div, type Element, image, svg } from "gpui-kit";
import { bannerOffset } from "../../core/presentation/spacesText";
import { agentsOverlay } from "../../core/groups/groupLook";
import type { AgentsGroup } from "../../core/sessions/sessionList";
import { colorStrip } from "../bannerOverlay";
import { statusMark } from "./cardView";
import { bannerSpace } from "../groupHeaderView";
import { themeColor } from "../themeColor";
import type { AgentsGroupHeader } from "./app";

type Theme = Record<string, string>;

/** What a folded group holds that needs attention: working, blocked, done; null when nothing does. */
const attentionMarks = (t: Theme, row: AgentsGroup): Element | null => {
  const a = row.attention;
  if (!a || a.working + a.blocked + a.done === 0) return null;
  return h_flex()
    .gap(6)
    .items_center()
    .when(a.working > 0, (el) => el.child(statusMark(t, "working")))
    .when(a.blocked > 0, (el) => el.child(statusMark(t, "blocked")))
    .when(a.done > 0, (el) =>
      el.child(
        h_flex()
          .gap(3)
          .items_center()
          .child(statusMark(t, "done"))
          .child(div().text_size(11).child(String(a.done))),
      ),
    );
};

export const agentsGroupHeader = (
  t: Theme,
  row: AgentsGroup,
  header: AgentsGroupHeader | null,
  fold: () => void,
): Element => {
  const named = row.inside === null ? row.name : `${row.name} · in ${row.inside}`;
  if (header?.kind === "banner") {
    const { file, group } = header;
    const marks = attentionMarks(t, row);
    const overlay = agentsOverlay(group);
    const place =
      overlay.align === "top"
        ? "items_start"
        : overlay.align === "bottom"
          ? "items_end"
          : "items_center";
    // Full width and no margin, as Spaces draws a banner: folded banners stack flush.
    return div()
      .id(`agents-group-${row.id}`)
      .relative()
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
      )
      .when(marks !== null, (el) =>
        el.child(
          h_flex()
            .absolute()
            .inset_0()
            [place]()
            .child(
              colorStrip(
                h_flex()
                  .flex_1()
                  .h(24)
                  .px(10)
                  .justify_end()
                  .items_center()
                  .text_color(themeColor(t, "foreground"))
                  .child(marks ?? div()),
                overlay,
              ),
            ),
        ),
      );
  }
  const icon = header?.group.icon ?? null;
  return h_flex()
    .id(`agents-group-${row.id}`)
    .mt(8)
    .mx(10)
    .px(8)
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
    .child(div().flex_1().font_semibold().text_color(themeColor(t, "foreground")).child(named))
    .when(attentionMarks(t, row) !== null, (el) => el.child(attentionMarks(t, row) ?? div()));
};
