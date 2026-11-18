// One overlay color in a group's settings (the user, 2026-11-18): a swatch that opens the picker,
// a text box for a hex color or a color name, and Reset, which puts back the default. Typing, the
// square, and the bars keep each other in step; an empty box is the default.
import { h_flex, InputState, SliderState, v_flex } from "gpui-base";
import { type AsyncContext, type Context, div, type Element } from "gpui-kit";
import { type FieldColor, fieldColor, squarePick } from "../../core/colors/colorPicker";
import { fromHsva, type HexColor, type Hsva, toHsva } from "../../core/colors/overlayColor";
import { themeColor } from "../themeColor";
import { colorSquare, hueBar, opacityBar, squareSize } from "./colorPickerView";
import { button, field, hint, type Theme } from "./formParts";

const percent = (v: number | [number, number]) => (Array.isArray(v) ? v[1] : v);

export class ColorField {
  readonly input: InputState;
  private hsva: Hsva;
  private open = false;
  private pressed = false;
  /** Set while this field writes its own text box, so the box's change event does not echo back. */
  private writing = false;
  private readonly hue: SliderState;
  private readonly opacity: SliderState;

  /**
   * @param saved the group's saved color; null: the default.
   * @param start where the picker starts when the field holds the default.
   */
  constructor(
    private readonly id: string,
    saved: HexColor | null,
    private readonly start: Hsva,
    _cx: AsyncContext,
  ) {
    this.input = InputState.new({ value: saved ?? "" });
    this.hsva = saved === null ? start : toHsva(saved);
    this.hue = SliderState.new({ min: 0, max: 360, value: this.hsva.h });
    this.opacity = SliderState.new({ min: 0, max: 100, value: Math.round(this.hsva.a * 100) });
    this.input.on("change", (_e, cx) => {
      if (this.writing) return;
      const typed = fieldColor(this.input.value());
      if (typed.kind === "color") this.follow(toHsva(typed.color));
      cx.notify();
    });
    this.hue.on("change", (v, cx) => this.pick({ ...this.hsva, h: percent(v) }, cx));
    this.opacity.on("change", (v, cx) => this.pick({ ...this.hsva, a: percent(v) / 100 }, cx));
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

  /** Moves the bars to a color typed in the box. */
  private follow(hsva: Hsva): void {
    this.hsva = hsva;
    this.hue.set_value(hsva.h);
    this.opacity.set_value(Math.round(hsva.a * 100));
  }

  /** A color picked in the square or on a bar: written to the box. */
  private pick(hsva: Hsva, cx: Context): void {
    this.hsva = hsva;
    this.writing = true;
    this.input.set_value(fromHsva(hsva));
    this.writing = false;
    cx.notify();
  }

  private reset(): void {
    this.writing = true;
    this.input.set_value("");
    this.writing = false;
    this.follow(this.start);
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
        colorSquare(`${this.id}-square`, this.hsva, (x, y, event, cx) => {
          if (event === "down") this.pressed = true;
          if (!this.pressed) return;
          if (event === "up") this.pressed = false;
          this.hsva = { ...this.hsva, ...squarePick({ x, y }, squareSize) };
          this.writing = true;
          this.input.set_value(fromHsva(this.hsva));
          this.writing = false;
          cx.notify();
        }),
      )
      .child(hueBar(this.hue))
      .child(opacityBar(this.opacity, this.hsva));
    return [
      row,
      ...(held.kind === "invalid" ? [hint(t, `"${held.text.trim()}" is not a color.`, true)] : []),
      ...(this.open ? [picker] : []),
    ];
  }
}
