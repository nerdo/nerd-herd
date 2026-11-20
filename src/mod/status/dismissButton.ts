// The status bar's Dismiss: shown, in the theme's magenta (ansi5), while the focused session is under
// Done; a click dismisses it, as cmd-e and the Agents mod's dismiss command do.
import { div, type Element } from "gpui-kit";
import { theme } from "herdr";
import { dismissal } from "../../core/sessions/dismiss";
import { doneSessions } from "../../core/sessions/doneLedger";
import { agentsApp } from "../agents/app";
import { focusedTerminal, readTerminals } from "../agents/herdrAgents";
import { themeColor } from "../themeColor";

export const nerdHerdDismiss = (): Element => {
  const terminals = readTerminals();
  const shown = dismissal(focusedTerminal(), terminals, doneSessions(terminals)) !== null;
  if (!shown) return div();
  const t = theme();
  return div()
    .id("nerd-herd-dismiss")
    .px(10)
    .rounded(5)
    .bg(themeColor(t, "ansi5"))
    .text_color(themeColor(t, "background"))
    .cursor_pointer()
    .on_click(() => {
      void agentsApp.dismiss();
    })
    .child("Dismiss");
};
