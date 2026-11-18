// One overlay color in a group's settings (the user, 2026-11-18): a swatch that opens the picker,
// a text box for a hex color or a color name, and Reset, which puts back the default. Typing, the
// square, and the bars keep each other in step; an empty box is the default.
import { h_flex, InputState, v_flex } from "gpui-base";
import { type AsyncContext, type Context, div, type Element } from "gpui-kit";
import { barPick, type FieldColor, fieldColor, squarePick } from "../../core/colors/colorPicker";
import { fromHsva, type HexColor, type Hsva, toHsva } from "../../core/colors/overlayColor";
import { themeColor } from "../themeColor";
import {
  barWidth,
  colorSquare,
  hueBar,
  opacityBar,
  type PickEvent,
  squareSize,
} from "./colorPickerView";
import { button, field, hint, type Theme } from "./formParts";

/** The part of the picker the pointer is dragging in. */
type Part = "square" | "hue" | "opacity";

export class ColorField {
  readonly input: InputState;
  private hsva: Hsva;
  private open: boolean;
  private pressed: Part | null = null;
  /** Set while this field writes its own text box, so the box's change event does not echo back. */
  private writing = false;

  /**
   * @param saved the group's saved color; null: the default.
   * @param start where the picker starts when the field holds the default.
   * @param open whether the picker shows from the start.
   */
  constructor(
    private readonly id: string,
    saved: HexColor | null,
    private readonly start: Hsva,
    open: boolean,
    _cx: AsyncContext,
  ) {
    this.open = open;
    this.input = InputState.new({ value: saved ?? "" });
    this.hsva = saved === null ? start : toHsva(saved);
    this.input.on("change", (_e, cx) => {
      if (this.writing) return;
      const typed = fieldColor(this.input.value());
      if (typed.kind === "color") this.hsva = toHsva(typed.color);
      cx.notify();
    });
  }

  /** What the field holds now: the default, a color, or text that names no color. */
  value(): FieldColor {
    return fieldColor(this.input.value());
  }

  /** The color to preview: the one held, or null for the default (also while the text names none). */
  shown(): HexColor | null {
    const v = this.value();
    return v.kind === "color" ? v.color : null;
  }

  /** Ends a drag; the dialog calls this on any release inside it. */
  release(): void {
    this.pressed = null;
  }

  /** A color picked in the square or on a bar: written to the box. */
  private set(hsva: Hsva, cx: Context): void {
    this.hsva = hsva;
    this.writing = true;
    this.input.set_value(fromHsva(hsva));
    this.writing = false;
    cx.notify();
  }

  /**
   * Follows the pointer in one part: a press starts a drag there, moves pick while it lasts, and the
   * release picks once more and ends it.
   */
  private drag(part: Part, pick: (x: number, y: number) => Hsva) {
    return (x: number, y: number, event: PickEvent, cx: Context) => {
      if (event === "down") this.pressed = part;
      if (this.pressed !== part) return;
      if (event === "up") this.pressed = null;
      this.set(pick(x, y), cx);
    };
  }

  private reset(): void {
    this.writing = true;
    this.input.set_value("");
    this.writing = false;
    this.hsva = this.start;
  }

  render(t: Theme): Element[] {
    const held = this.value();
    const swatch = div()
      .id(`${this.id}-swatch`)
      .size(32)
      .flex_none()
      .rounded(8)
      .border_1()
      .border_color(themeColor(t, "input"))
      .cursor_pointer()
      .tooltip(this.open ? "Close the color picker" : "Open the color picker")
      .when(held.kind === "color", (el) => el.bg(held.kind === "color" ? held.color : "#00000000"))
      .on_click((_e, cx) => {
        this.open = !this.open;
        cx.notify();
      });
    const row = h_flex()
      .gap(8)
      .items_center()
      .child(swatch)
      .child(div().flex_1().child(field(t, this.input)))
      .child(
        button(t, `${this.id}-reset`, "Reset", false, (cx) => {
          this.reset();
          cx.notify();
        }),
      );
    const picker = v_flex()
      .pt(8)
      .gap(6)
      .w(squareSize.width)
      .child(
        colorSquare(
          `${this.id}-square`,
          this.hsva,
          this.drag("square", (x, y) => ({ ...this.hsva, ...squarePick({ x, y }, squareSize) })),
        ),
      )
      .child(
        hueBar(
          `${this.id}-hue`,
          this.hsva,
          this.drag("hue", (x) => ({ ...this.hsva, h: barPick(x, barWidth, 0, 360) })),
        ),
      )
      .child(
        opacityBar(
          `${this.id}-opacity`,
          this.hsva,
          this.drag("opacity", (x) => ({ ...this.hsva, a: barPick(x, barWidth, 0, 100) / 100 })),
        ),
      );
    return [
      row,
      ...(held.kind === "invalid" ? [hint(t, `"${held.text.trim()}" is not a color.`, true)] : []),
      ...(this.open ? [picker] : []),
    ];
  }
}
