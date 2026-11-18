// The overlay color picker's parts (the user, 2026-11-18: "full picker"): a square for saturation
// and brightness, a hue bar, and an opacity bar. Herdr's kit has no picker, and its painted
// gradients (window.paint_path) drew nothing here (a walk, 2026-11-18: the square was flat red and
// the bars were bare), so each gradient is a row of thin solid strips. All three take the pointer
// the same way: a press, its moves, and its release, each with the point in the part.
import { h_flex, v_flex } from "gpui-base";
import { type Color, type Context, div, type Element } from "gpui-kit";
import { fromHsva, type Hsva } from "../../core/colors/overlayColor";

/** What a part reports: where the pointer is in it, and whether it was pressed, moved, or let go. */
export type PickEvent = "down" | "move" | "up";
export type Pick = (x: number, y: number, event: PickEvent, cx: Context) => void;

export const squareSize = { width: 360, height: 120 };
export const barWidth = squareSize.width;

const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const alpha = (share: number) =>
  Math.round(Math.min(1, Math.max(0, share)) * 255)
    .toString(16)
    .padStart(2, "0");
const opaque = (h: number): Color => fromHsva({ h, s: 100, v: 100, a: 1 });

/** Makes a part take the pointer. A press does not reach the dialog behind it. */
const dragArea = (el: Element, pick: Pick): Element =>
  el
    .cursor_pointer()
    .on_mouse_down("left", (e, cx) => {
      cx.stop_propagation();
      if (e.local_position) pick(e.local_position.x, e.local_position.y, "down", cx);
    })
    .on_mouse_move((e, cx) => pick(e.local_position.x, e.local_position.y, "move", cx))
    .on_mouse_up("left", (e, cx) => {
      if (e.local_position) pick(e.local_position.x, e.local_position.y, "up", cx);
    });

/** A ring marking the chosen point, centered on (x, y). */
const ring = (x: number, y: number): Element =>
  div()
    .absolute()
    .left(x - 7)
    .top(y - 7)
    .size(14)
    .rounded(7)
    .border_2()
    .border_color("#ffffff");

/**
 * The saturation and brightness square at the color's hue: the hue in full, white fading out
 * toward the right, and black fading in toward the bottom.
 */
export const colorSquare = (id: string, hsva: Hsva, pick: Pick): Element =>
  dragArea(
    div()
      .id(id)
      .relative()
      .w(squareSize.width)
      .h(squareSize.height)
      .rounded(6)
      .overflow_hidden()
      .bg(opaque(hsva.h))
      .child(
        h_flex()
          .absolute()
          .inset_0()
          .children(
            range(60).map((i) =>
              div()
                .flex_1()
                .h_full()
                .bg(`#ffffff${alpha(1 - i / 59)}`),
            ),
          ),
      )
      .child(
        v_flex()
          .absolute()
          .inset_0()
          .children(
            range(30).map((j) =>
              div()
                .flex_1()
                .w_full()
                .bg(`#000000${alpha(j / 29)}`),
            ),
          ),
      )
      .child(ring((hsva.s / 100) * squareSize.width, (1 - hsva.v / 100) * squareSize.height)),
    pick,
  );

/** A bar: its strips in a rounded groove, and a knob at `share` (0 to 1) of its length. */
const bar = (id: string, strips: Element, share: number, pick: Pick): Element =>
  dragArea(
    div()
      .id(id)
      .relative()
      .w(barWidth)
      .h(22)
      .flex()
      .items_center()
      .child(div().w_full().h(12).rounded(6).overflow_hidden().relative().child(strips))
      .child(
        div()
          .absolute()
          .top(3)
          .left(share * barWidth - 8)
          .size(16)
          .rounded(8)
          .border_2()
          .border_color("#ffffff")
          .bg("#00000033"),
      ),
    pick,
  );

/** The hue bar: every hue from red around to red again. */
export const hueBar = (id: string, hsva: Hsva, pick: Pick): Element =>
  bar(
    id,
    h_flex()
      .absolute()
      .inset_0()
      .children(range(72).map((i) => div().flex_1().h_full().bg(opaque(i * 5)))),
    hsva.h / 360,
    pick,
  );

/** The opacity bar: the color from fully see-through to opaque, over a checkerboard. */
export const opacityBar = (id: string, hsva: Hsva, pick: Pick): Element => {
  const cells = 60;
  const checker = (row: number) =>
    h_flex()
      .flex_1()
      .w_full()
      .children(
        range(cells).map((i) =>
          div()
            .flex_1()
            .h_full()
            .bg((i + row) % 2 === 0 ? "#c8c8c8" : "#ffffff"),
        ),
      );
  return bar(
    id,
    div()
      .absolute()
      .inset_0()
      .child(v_flex().absolute().inset_0().child(checker(0)).child(checker(1)))
      .child(
        h_flex()
          .absolute()
          .inset_0()
          .children(
            range(cells).map((i) =>
              div()
                .flex_1()
                .h_full()
                .bg(fromHsva({ ...hsva, a: i / (cells - 1) })),
            ),
          ),
      ),
    hsva.a,
    pick,
  );
};
