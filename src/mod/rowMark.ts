import type { Element } from "gpui-kit";
import { themeColor } from "./themeColor";

/** Marks a row the keyboard holds: an accent outline when focused, a dashed one when cut. */
export const marked = (
  row: Element,
  mark: "focused" | "cut" | null,
  t: Record<string, string>,
): Element =>
  mark === null
    ? row
    : row
        .rounded(6)
        .border_1()
        .border_color(themeColor(t, mark === "focused" ? "accent" : "dim"))
        .when(mark === "cut", (el) => el.border_dashed());
