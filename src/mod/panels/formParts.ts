// The pieces nerd-herd's dialogs are built from, styled like Herdr's own prompt dialog
// (~/.config/herdr-app/mods/prompt/main.js), and the one way a dialog changes anything: a command
// sent to the Spaces mod, which saves it and redraws the sidebar.
import { h_flex, Input, type InputState, ScrollHandle, v_flex } from "gpui-base";
import { div, type Element } from "gpui-kit";
import { closeOverlay, openOverlay, props, run } from "herdr";
import { themeColor } from "../themeColor";

export type Theme = Record<string, string>;

/** A dialog or popup drawn by the Spaces mod. */
export interface Panel {
  render(t: Theme, scroll: DialogScroll): Element;
}

/**
 * Where a dialog's body is scrolled to, moved by keys (Page Down and Page Up). One per dialog copy,
 * made in its init; the dialog frame records how many fields its body holds on every draw.
 */
export class DialogScroll {
  readonly handle = ScrollHandle.new();
  count = 0;
  /** Brings the body's last field into view. */
  end(): void {
    if (this.count > 0) this.handle.scroll_to_item(this.count - 1);
  }
  /** Brings the body's first field into view. */
  start(): void {
    if (this.count > 0) this.handle.scroll_to_item(0);
  }
}

/** Sends one command to the Spaces mod's command loop. */
export const send = (action: string, payload: unknown): void => {
  run(`nerd-herd-spaces.${action}:${JSON.stringify(payload)}`);
};

/**
 * Opens one of the Spaces mod's dialogs; its props name the panel and what it acts on. No height is
 * given, so Herdr sizes the dialog to its content and keeps it inside the window; a fixed height ran
 * past a short window, hiding the title and Save (walk, 2026-11-17, a 520-point window).
 */
export const openPanel = (panel: Record<string, unknown>): void => {
  openOverlay({ mod: "nerd-herd-spaces", kind: "dialog", width: 420, props: panel });
};

/** Opens the Spaces mod's menu for a header, at the pointer. */
export const openMenu = (target: Record<string, unknown>, items: number): void => {
  openOverlay({
    mod: "nerd-herd-spaces",
    kind: "popup",
    width: 180,
    height: 8 + items * 28,
    props: { panel: "menu", target },
  });
};

/** Closes the dialog or popup this panel is drawn in. */
export const close = (): void => {
  closeOverlay(props()?.overlay);
};

export const title = (t: Theme, text: string): Element =>
  div().text_size(15).font_semibold().text_color(themeColor(t, "foreground")).child(text);

export const label = (t: Theme, text: string): Element =>
  div().pt(14).pb(6).text_size(11.5).text_color(themeColor(t, "dim")).child(text);

export const field = (t: Theme, state: InputState): Element =>
  Input.new(state)
    .h(32)
    .px(10)
    .rounded(8)
    .border_1()
    .border_color(themeColor(t, "input"))
    .bg(themeColor(t, "background"))
    .text_size(12.5)
    .text_color(themeColor(t, "foreground"));

export const hint = (t: Theme, text: string, warn = false): Element =>
  div()
    .pt(6)
    .text_size(11.5)
    .text_color(themeColor(t, warn ? "blocked" : "dim"))
    .child(text);

export const button = (
  t: Theme,
  id: string,
  text: string,
  primary: boolean,
  act: () => void,
): Element =>
  h_flex()
    .id(id)
    .h(30)
    .px(14)
    .items_center()
    .rounded(8)
    .border_1()
    .border_color(themeColor(t, primary ? "solid" : "input"))
    .bg(themeColor(t, primary ? "solid" : "raised"))
    .text_color(themeColor(t, primary ? "solid_foreground" : "foreground"))
    .text_size(12.5)
    .cursor_pointer()
    .hover((s) => s.opacity(0.88))
    .on_click(() => act())
    .child(text);

/** One choice among a few, drawn as a row of buttons with the chosen one marked. */
export const choice = <V extends string>(
  t: Theme,
  id: string,
  options: readonly { readonly value: V; readonly text: string }[],
  current: V,
  pick: (value: V) => void,
): Element =>
  h_flex()
    .gap(6)
    .flex_wrap()
    .children(
      options.map((o) =>
        div()
          .id(`${id}-${o.value}`)
          .px(10)
          .h(26)
          .flex()
          .items_center()
          .rounded(6)
          .border_1()
          .border_color(themeColor(t, o.value === current ? "accent" : "input"))
          .text_size(12)
          .text_color(themeColor(t, "foreground"))
          .cursor_pointer()
          .on_click(() => pick(o.value))
          .child(o.text),
      ),
    );

/** A dialog's frame: its content, scrolling when tall, then Cancel and the primary action at the bottom right. */
export const dialog = (
  t: Theme,
  scroll: DialogScroll,
  content: Element[],
  save: string,
  act: () => void,
): Element => {
  scroll.count = content.length;
  return (
    v_flex()
      .id("nerd-herd-dialog")
      .size_full()
      .p(18)
      .bg(themeColor(t, "popover"))
      .text_color(themeColor(t, "foreground"))
      // The content scrolls when it is taller than the dialog; Cancel and Save stay in view below it.
      .child(
        v_flex()
          .id("dialog-body")
          .flex_1()
          .min_h(0)
          .overflow_y_scroll()
          .track_scroll(scroll.handle)
          .children(content),
      )
      .child(
        h_flex()
          .pt(16)
          .gap(8)
          .justify_end()
          .child(button(t, "dialog-cancel", "Cancel", false, close))
          .child(button(t, "dialog-save", save, true, act)),
      )
  );
};
