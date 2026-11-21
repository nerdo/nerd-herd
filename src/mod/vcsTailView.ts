// The version control label after a space's name, drawn the same way in Spaces' rows and on Agents'
// cards: the name dim and cut to fit, the changes ahead in green and behind in red, as Herdr's Spaces
// draws them, with the whole name on hover.

import { h_flex } from "gpui-base";
import { div, type Element } from "gpui-kit";
import type { VcsTail } from "../core/vcs/vcsTail";
import { themeColor } from "./themeColor";

/** True when the label has anything to show. */
export const hasVcsTail = (tail: VcsTail | null): tail is VcsTail =>
  tail !== null && (tail.where !== "" || tail.ahead > 0 || tail.behind > 0);

export const vcsTailView = (t: Record<string, string>, tail: VcsTail, id: string): Element =>
  h_flex()
    .min_w(0)
    .gap(5)
    .items_center()
    .text_size(11.5)
    .text_color(themeColor(t, "dim"))
    .when(tail.where !== "", (el) =>
      el.child(div().id(id).min_w(0).truncate().tooltip(tail.whole).child(tail.where)),
    )
    .when(tail.ahead > 0, (el) =>
      el.child(div().flex_none().text_color(themeColor(t, "ansi2")).child(`↑${tail.ahead}`)),
    )
    .when(tail.behind > 0, (el) =>
      el.child(div().flex_none().text_color(themeColor(t, "ansi1")).child(`↓${tail.behind}`)),
    );

/** The tooltip on a space's name: the repository its folder is in. */
export const repoTooltip = (repo: string): string => `Repository: ${repo}`;
