// The nerd-herd Agents mod: Herdr's sidebar Agents section, drawn from the rows the session list
// arranges. Commands sent to the mod (`rename:{...}`, `focus:{...}`) reach Herdr through the app.
import { h_flex, v_flex } from "gpui-base";
import { type AsyncContext, div, image, svg, View } from "gpui-kit";
import { nextCommand, theme } from "herdr";
import { AgentsListError, rowsOrError } from "../../core/sessions/rowsOrError";
import type { AgentIcon, AgentsRow } from "../../core/sessions/sessionList";
import { errorCard } from "../errorCard";
import { themeColor } from "../themeColor";
import { agentsApp } from "./app";

type Theme = Record<string, string>;

/** The JSON in a command, or null when it cannot be read: the command is skipped, the loop goes on. */
const readJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

/** The string field `key` of the JSON after "<action>:" in a command, or null. */
const field = (command: string, action: string, key: string): string | null => {
  if (!command.startsWith(`${action}:`)) return null;
  const parsed = readJson(command.slice(action.length + 1));
  if (typeof parsed !== "object" || parsed === null) return null;
  const value: unknown = Object.getOwnPropertyDescriptor(parsed, key)?.value;
  return typeof value === "string" ? value : null;
};

const rowView = (t: Theme, row: AgentsRow) => {
  switch (row.kind) {
    case "section":
      return div().pt(6).text_color(themeColor(t, "muted")).child(row.label);
    case "group":
      return div()
        .pt(8)
        .font_semibold()
        .text_color(themeColor(t, "foreground"))
        .child(row.inside === null ? row.name : `${row.name} · in ${row.inside}`);
    case "ungrouped":
      return div().pt(8).font_semibold().text_color(themeColor(t, "foreground")).child(row.label);
    case "folder":
      return div().pt(4).pl(8).text_color(themeColor(t, "muted")).child(row.label);
    case "card":
      return card(t, row);
  }
};

/** Draws an agent's icon the way Herdr's own Agents list does: a tinted glyph, or a picture. */
const iconView = (t: Theme, icon: AgentIcon | null) =>
  icon === null
    ? null
    : icon.tint
      ? svg(icon.path).size(14).flex_none().text_color(themeColor(t, "muted"))
      : image(icon.path).w(14).h(14).flex_none();

const card = (t: Theme, row: Extract<AgentsRow, { kind: "card" }>) => {
  const icon = iconView(t, row.icon);
  return v_flex()
    .id(`card-${row.terminal}`)
    .py(4)
    .rounded(6)
    .cursor_pointer()
    .hover((st) => st.bg(themeColor(t, "hover")))
    .on_click(() => agentsApp.focus(row.terminal))
    .on_mouse_down("right", () => agentsApp.promptRename(row.terminal))
    .child(
      h_flex()
        .gap(6)
        .items_start()
        .when(icon !== null, (el) => (icon ? el.child(icon) : el))
        .child(
          div()
            .flex_1()
            .min_w_0()
            .whitespace_normal()
            .font_semibold()
            .text_color(themeColor(t, "foreground"))
            .child(row.title),
        ),
    )
    .child(div().text_color(themeColor(t, "muted")).child(row.location));
};

/** The rows, or in their place a card with the error's reference. */
const rowsView = (t: Theme, rows: AgentsRow[] | AgentsListError) =>
  rows instanceof AgentsListError
    ? [errorCard(t, rows.message)]
    : rows.map((row) => rowView(t, row));

export default class AgentsMod extends View {
  init(_props: unknown, cx: AsyncContext): void {
    cx.spawn(async (cx) => {
      for (;;) {
        const command = await nextCommand();
        const renamed = field(command, "rename", "terminal");
        const name = field(command, "rename", "name");
        const focused = field(command, "focus", "terminal");
        if (renamed !== null && name !== null) agentsApp.rename(renamed, name);
        if (focused !== null) agentsApp.focus(focused);
        cx.notify();
      }
    });
  }

  render() {
    const t = theme();
    return v_flex()
      .size_full()
      .px(12)
      .gap(2)
      .child(div().text_color(themeColor(t, "foreground")).child("Agents"))
      .children(rowsView(t, rowsOrError(agentsApp.rows)));
  }
}
