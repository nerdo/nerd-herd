// The overlay color picker's parts (the user, 2026-11-18: "full picker"): a square for saturation
// and brightness, a hue bar, and a see-through bar. Herdr's kit has no picker, so the square is
// painted from gradients and takes the pointer itself; the bars are the kit's native sliders,
// which carry their own drag.
import { Slider, SliderIndicator, type SliderState, SliderThumb, SliderTrack } from "gpui-base";
import { Background, type Color, type Context, div, type Element, PathBuilder } from "gpui-kit";
import { fromHsva, type Hsva } from "../../core/colors/overlayColor";

/** A rectangle filling its parent, painted with a native background such as a gradient. */
const painted = (fill: Background): Element =>
  div()
    .absolute()
    .inset_0()
    .child(
      window.paint_path(
        PathBuilder.fill()
          .add_polygon([
            [0, 0],
            ["100%", 0],
            ["100%", "100%"],
            [0, "100%"],
          ])
          .build(),
        fill,
      ),
    );

const opaque = (h: number): Color => fromHsva({ h, s: 100, v: 100, a: 1 });

export const squareSize = { width: 384, height: 120 };

/**
 * The saturation and brightness square at the color's hue: the hue in full, white fading in from
 * the left, black from the bottom. A press, a move, and a release in it each call `pick` with the
 * point; the pointer's moves count only while it is pressed, which the caller tracks.
 */
export const colorSquare = (
  id: string,
  hsva: Hsva,
  pick: (x: number, y: number, event: "down" | "move" | "up", cx: Context) => void,
): Element =>
  div()
    .id(id)
    .relative()
    .w(squareSize.width)
    .h(squareSize.height)
    .rounded(6)
    .overflow_hidden()
    .cursor_pointer()
    .bg(opaque(hsva.h))
    .child(painted(Background.linear_gradient(90, "#ffffffff", "#ffffff00")))
    .child(painted(Background.linear_gradient(0, "#000000ff", "#00000000")))
    .child(
      // The chosen point, as a ring.
      div()
        .absolute()
        .left((hsva.s / 100) * squareSize.width - 6)
        .top((1 - hsva.v / 100) * squareSize.height - 6)
        .size(12)
        .rounded(6)
        .border_2()
        .border_color("#ffffff"),
    )
    .on_mouse_down("left", (e, cx) => {
      if (e.local_position) pick(e.local_position.x, e.local_position.y, "down", cx);
    })
    .on_mouse_move((e, cx) => pick(e.local_position.x, e.local_position.y, "move", cx))
    .on_mouse_up("left", (e, cx) => {
      if (e.local_position) pick(e.local_position.x, e.local_position.y, "up", cx);
    });

/** A native slider whose groove is painted by `groove`. */
const bar = (state: SliderState, groove: Element[]): Element =>
  Slider.new(state).child(
    SliderTrack.new(state)
      .flex()
      .items_center()
      .h(22)
      .w(squareSize.width)
      .child(
        SliderIndicator.new(state)
          .relative()
          .w_full()
          .h(12)
          .rounded(6)
          .overflow_hidden()
          .children(groove)
          .child(
            SliderThumb.new(state)
              .size(16)
              .rounded(8)
              .border_2()
              .border_color("#ffffff")
              .bg("#00000033")
              .ml(-8),
          ),
      ),
  );

/** The hue bar: red, yellow, green, cyan, blue, magenta, and back to red. */
export const hueBar = (state: SliderState): Element =>
  bar(state, [
    div()
      .absolute()
      .inset_0()
      .flex()
      .children(
        [0, 60, 120, 180, 240, 300].map((h) =>
          div()
            .relative()
            .flex_1()
            .h_full()
            .child(painted(Background.linear_gradient(90, opaque(h), opaque(h + 60)))),
        ),
      ),
  ]);

/** The see-through bar: the color from fully see-through to opaque, over a checkerboard. */
export const opacityBar = (state: SliderState, hsva: Hsva): Element =>
  bar(state, [
    painted(Background.checkerboard("#c8c8c8", 6)),
    painted(
      Background.linear_gradient(
        90,
        fromHsva({ ...hsva, a: 0 }),
        fromHsva({ ...hsva, a: 1 }),
      ),
    ),
  ]);
