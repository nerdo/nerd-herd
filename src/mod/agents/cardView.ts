// How the Agents list draws its status pills and session cards (spec questions Card structure and
// Card details): pills filled in Herdr's status colors, cards on a pale tint of their status color,
// Herdr's status marks and time in status, and the machine set apart from the space.
import { h_flex, v_flex } from "gpui-base";
import { div, type Element, image, svg } from "gpui-kit";
import { middleEllipsis, type VcsParts, vcsText } from "../../core/jj/vcsLabel";
import type { AgentIcon, AgentsCard, SessionStatus } from "../../core/sessions/sessionList";
import { type HexColor, themeColor } from "../themeColor";

type Theme = Record<string, string>;

/** A #rrggbb color with an alpha, for a pale tint of a status color. */
const tint = (t: Theme, status: SessionStatus, alpha: string): HexColor => {
  const color = themeColor(t, status);
  return color.length === 7 ? `${color}${alpha}` : color;
};

/** A section as a pill: filled in Herdr's color for its status (grey for Pinned), with its name and
 *  how many it holds. */
export const statusPill = (
  t: Theme,
  status: SessionStatus | "pinned",
  label: string,
  count: number,
  key: string,
  fold: () => void,
): Element =>
  h_flex()
    .pt(8)
    .pb(4)
    .child(
      h_flex()
        .id(`pill-${key}`)
        .cursor_pointer()
        .on_click(fold)
        .gap(6)
        .px(9)
        .h(22)
        .items_center()
        .rounded_full()
        .bg(themeColor(t, status === "pinned" ? "muted" : status))
        .child(
          div().text_size(12).font_semibold().text_color(themeColor(t, "background")).child(label),
        )
        .child(div().text_size(12).text_color(themeColor(t, "background")).child(String(count))),
    );

/** An agent's icon, as Herdr's own Agents list draws it: a tinted glyph, or a picture. */
const iconView = (t: Theme, icon: AgentIcon): Element =>
  icon.tint
    ? svg(icon.path).size(14).flex_none().text_color(themeColor(t, "muted"))
    : image(icon.path).w(14).h(14).flex_none();

/** Herdr's status marks: a spinner while working, Needs you when blocked, a dot when done, a ring when idle. */
export const statusMark = (t: Theme, status: SessionStatus): Element => {
  if (status === "working")
    return svg("mods/workspace-chrome/spinner.svg")
      .size(12)
      .mx(1)
      .flex_none()
      .text_color(themeColor(t, "working"))
      .spin(900);
  if (status === "blocked")
    return div()
      .flex_none()
      .px(6)
      .h(18)
      .rounded(5)
      .bg(tint(t, "blocked", "26"))
      .text_size(10.5)
      .font_semibold()
      .text_color(themeColor(t, "blocked"))
      .flex()
      .items_center()
      .child("Needs you");
  if (status === "idle")
    return div()
      .size(7)
      .mx(3)
      .flex_none()
      .rounded(4)
      .border(1.5)
      .border_color(themeColor(t, "idle"));
  return div().size(7).mx(3).flex_none().rounded(4).bg(themeColor(t, "done"));
};

/** The most characters a version control name takes before it is cut in its middle. */
const vcsRoom = 24;

/** The height of the title's first line, so the icon and the marks center on it. */
const line = 26;

export const cardView = (
  t: Theme,
  row: AgentsCard,
  since: string | null,
  vcs: VcsParts | null,
  focus: () => void,
  rename: () => void,
  pin: {
    readonly hovered: boolean;
    readonly hover: (on: boolean) => void;
    readonly toggle: () => void;
  },
): Element =>
  v_flex()
    .id(`card-${row.terminal}`)
    .mb(6)
    .px(8)
    .py(5)
    .rounded(7)
    .bg(tint(t, row.status, "1f"))
    // The session in the focused pane: outlined in purple, the color of Dismiss in the status bar.
    .border_2()
    .border_color(row.focused ? themeColor(t, "ansi5") : tint(t, row.status, "00"))
    .cursor_pointer()
    .hover((s) => s.bg(tint(t, row.status, "33")))
    .on_click(focus)
    .on_mouse_down("right", rename)
    .on_hover((on, cx) => {
      pin.hover(on);
      cx.notify();
    })
    .child(
      h_flex()
        .gap(6)
        .items_start()
        .when(row.icon !== null, (el) =>
          row.icon ? el.child(h_flex().h(line).items_center().child(iconView(t, row.icon))) : el,
        )
        .child(
          div()
            .flex_1()
            .min_w_0()
            .whitespace_normal()
            .font_semibold()
            .text_color(themeColor(t, "foreground"))
            .child(row.title),
        )
        .child(
          v_flex()
            .flex_none()
            .items_end()
            .child(
              h_flex()
                .h(line)
                .gap(5)
                .items_center()
                // The pin: always on a pinned card, on hover on the others (Herdr's own pin icons).
                .when(row.pinned === true || pin.hovered, (el) =>
                  el.child(
                    div()
                      .id(`pin-${row.terminal}`)
                      .flex_none()
                      .p(2)
                      .rounded(4)
                      .cursor_pointer()
                      .text_color(themeColor(t, row.pinned ? "foreground" : "dim"))
                      .hover((s) => s.bg(tint(t, row.status, "40")))
                      .tooltip(row.pinned ? "Unpin" : "Pin to the top")
                      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
                      .on_click((_e, cx) => {
                        cx.stop_propagation();
                        pin.toggle();
                      })
                      .child(svg("mods/workspace-chrome/pin.svg").size(12)),
                  ),
                )
                .child(statusMark(t, row.status))
                .when(since !== null, (el) =>
                  el.child(
                    div()
                      .text_size(11)
                      .text_color(themeColor(t, "dim"))
                      .child(since ?? ""),
                  ),
                ),
            ),
        ),
    )
    // The session's version control, on its own line at the right under the title, so the title
    // keeps the card's width (the user, 2026-11-20: a long branch name "eats into the space for the
    // title"). A long name is cut in its middle, keeping its start and end, and the whole label shows
    // on hover. The colors are Spaces': a dim name and a green count of changes ahead.
    .when(vcs !== null, (el) =>
      el.child(
        h_flex()
          .justify_end()
          .child(
            h_flex()
              .id(`vcs-${row.terminal}`)
              .gap(3)
              .text_size(11)
              .text_color(themeColor(t, "dim"))
              .tooltip(vcs ? vcsText(vcs) : "")
              .child(
                div()
                  .whitespace_nowrap()
                  .child(vcs ? middleEllipsis(vcs.name, vcsRoom) : ""),
              )
              .when((vcs?.ahead ?? 0) > 0, (el) =>
                el.child(
                  div()
                    .whitespace_nowrap()
                    .text_color(themeColor(t, "ansi2"))
                    .child(`↑${vcs?.ahead ?? 0}`),
                ),
              ),
          ),
      ),
    )
    .child(
      h_flex()
        .gap(8)
        .items_center()
        .child(
          div().flex_1().min_w_0().truncate().text_color(themeColor(t, "muted")).child(row.place),
        )
        .child(div().flex_none().text_size(10).text_color(themeColor(t, "dim")).child(row.machine)),
    );
