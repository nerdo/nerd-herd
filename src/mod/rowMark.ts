import { div, type Element } from "gpui-kit";
import { themeColor } from "./themeColor";

/** How a row is marked: keyboard focus, cut, or where a dragged row would land. */
export type RowMark = "focused" | "cut" | "drop-onto" | "drop-before" | null;

/**
 * Marks a row: an accent outline when focused or when a drop would land in it, a dashed outline
 * when cut, and an accent line along its top when a drop would land before it. Each mark is drawn
 * over the row, taking no room, so the row's content keeps its place (a border on the row itself
 * moved a banner a point down and right; the user, 2026-11-18).
 */
export const marked = (row: Element, mark: RowMark, t: Record<string, string>): Element => {
  if (mark === null) return row;
  if (mark === "drop-before")
    return row
      .relative()
      .child(div().absolute().left(0).right(0).top(0).h(2).bg(themeColor(t, "accent")));
  return row.relative().child(
    div()
      .absolute()
      .inset_0()
      .rounded(6)
      .border_1()
      .border_color(themeColor(t, mark === "cut" ? "dim" : "accent"))
      .when(mark === "cut", (el) => el.border_dashed()),
  );
};
