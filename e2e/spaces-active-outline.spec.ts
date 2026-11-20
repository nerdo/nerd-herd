// The active space's row in Spaces, outlined in purple like the focused card in Agents. The window
// runs on a private herdr-core session.

import { expect, test } from "@playwright/test";
import { AgentsWindow } from "./support/agents-window";
import { colorCount } from "./support/window-pixels";

const window = new AgentsWindow();

/** The Spaces rows: the sidebar's left part, from under the Spaces header to above Agents. */
const spacesRows = { from: 0, to: 0.27, top: 0.1, bottom: 0.25 } as const;

let purple: number;

test.beforeAll(() => {
  window.start();
  // The space comes with a stand-in agent; a plain shell tab then takes the focus, so no Agents card
  // is outlined.
  window.startFakeAgent({ space: "sandbox", title: "Reset leader election" });
  window.startShellTab();
  window.readUntil((lines) => /This computer/.test(lines.join("\n")));
  purple = colorCount(window, "#ff00ff", spacesRows, "tinted");
});

test.afterAll(() => window.stop());

// Spec: docs/specs/in-progress/executing-nerd-herd-agents.html (test case "The active space's row is
// outlined in purple"): "One space, shown in the window: the space's row shows a purple outline."
test("the active space's row in Spaces shows a purple outline", () => {
  expect(purple, "purple pixels in the Spaces rows").toBeGreaterThan(100);
});
