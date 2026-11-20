// The nerd-herd Agents mod: Herdr's sidebar Agents section, drawn from the rows the session list
// arranges. Commands sent to the mod (`rename:{...}`, `focus:{...}`) reach Herdr through the app.
import { h_flex, v_flex } from "gpui-base";
import { type AsyncContext, div, image, svg, View } from "gpui-kit";
import { nextCommand, props, theme } from "herdr";
import { AgentsListError, rowsOrError } from "../../core/sessions/rowsOrError";
import type { AgentIcon, AgentsRow, SessionStatus } from "../../core/sessions/sessionList";
import { errorCard } from "../errorCard";
import { themeColor } from "../themeColor";
import { agentsApp } from "./app";
import { agentsGroupHeader } from "./groupHeader";
import { openSortMenu, sortMenu } from "./sortMenu";

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
      return row.status === undefined || row.count === undefined
        ? div().pt(6).text_color(themeColor(t, "muted")).child(row.label)
        : statusPill(t, row.status, row.label, row.count);
    case "group":
      return agentsGroupHeader(t, row, agentsApp.groupHeader(row.id, row.folded === true), () =>
        agentsApp.fold(row.id),
      );
    case "ungrouped":
      return div().pt(8).font_semibold().text_color(themeColor(t, "foreground")).child(row.label);
    case "folder":
      return statusPill(t, row.status, row.label, row.count);
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

/** A status as a pill: outlined in Herdr's color for that status, its name and how many it holds. */
const statusPill = (t: Theme, status: SessionStatus, label: string, count: number) =>
  h_flex()
    .pt(8)
    .pb(4)
    .child(
      h_flex()
        .gap(6)
        .px(8)
        .h(22)
        .items_center()
        .rounded_full()
        .border_1()
        .border_color(themeColor(t, status))
        .child(div().size(7).rounded_full().bg(themeColor(t, status)))
        .child(div().text_size(12).text_color(themeColor(t, "foreground")).child(label))
        .child(div().text_size(12).text_color(themeColor(t, "muted")).child(String(count))),
    );

const card = (t: Theme, row: Extract<AgentsRow, { kind: "card" }>) => {
  const icon = iconView(t, row.icon);
  return v_flex()
    .mb(6)
    .px(8)
    .bg(themeColor(t, "surface"))
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
    .child(div().min_w_0().truncate().text_color(themeColor(t, "muted")).child(row.location));
};

/** One of this copy's props (from the layout, or the overlay that opened it). */
const prop = (key: string): unknown => {
  const given: unknown = props();
  return typeof given === "object" && given !== null
    ? Object.getOwnPropertyDescriptor(given, key)?.value
    : undefined;
};
const isSortMenu = (): boolean => prop("sortMenu") === true;

/** The rows, or in their place a card with the error's reference. */
const rowsView = (t: Theme, rows: AgentsRow[] | AgentsListError) =>
  rows instanceof AgentsListError
    ? [errorCard(t, rows.message)]
    : rows.map((row) => rowView(t, row));

export default class AgentsMod extends View {
  init(_props: unknown, cx: AsyncContext): void {
    // The sort menu is a second copy of this mod in a popup; only the sidebar's copy takes commands.
    if (isSortMenu()) return;
    agentsApp.recordStartingPoints();
    cx.timer.every(2000, () => agentsApp.recordStartingPoints());
    cx.spawn(async (cx) => {
      for (;;) {
        const command = await nextCommand();
        const renamed = field(command, "rename", "terminal");
        const name = field(command, "rename", "name");
        const focused = field(command, "focus", "terminal");
        const sort = field(command, "sort", "id");
        const fold = field(command, "fold", "group");
        if (fold !== null) agentsApp.fold(fold);
        if (command === "open-sort") openSortMenu();
        if (command === "dismiss") await agentsApp.dismiss();
        if (sort !== null) agentsApp.sort(sort);
        if (renamed !== null && name !== null) agentsApp.rename(renamed, name);
        if (focused !== null) agentsApp.focus(focused);
        cx.notify();
      }
    });
  }

  render() {
    const t = theme();
    const given = props();
    if (
      typeof given === "object" &&
      given !== null &&
      Object.getOwnPropertyDescriptor(given, "sortMenu")?.value === true
    ) {
      const overlay: unknown = Object.getOwnPropertyDescriptor(given, "overlay")?.value;
      return sortMenu(
        t,
        agentsApp.sortChoices(),
        agentsApp.currentSort(),
        agentsApp.sort,
        typeof overlay === "string" ? overlay : null,
      );
    }
    return v_flex()
      .size_full()
      .px(12)
      .gap(2)
      .child(
        h_flex()
          .justify_between()
          .items_center()
          .child(div().text_color(themeColor(t, "foreground")).child("Agents"))
          .child(
            div()
              .id("agents-sort")
              .cursor_pointer()
              .text_color(themeColor(t, "muted"))
              .on_click(() => openSortMenu())
              .child(svg("mods/workspace-chrome/clock.svg").size(14)),
          ),
      )
      .children(rowsView(t, rowsOrError(agentsApp.rows)));
  }
}
