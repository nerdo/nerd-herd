// The pin's room on a card, in a running Herdr window: a pinned card and an unpinned card with the
// same long title wrap it at the same word, because every card keeps the pin's room whether the pin
// shows or not. A walk cannot hover, so the pinned card stands in for a hovered one: both draw the
// pin. The window runs on a private herdr-core session.

import { expect, test } from "@playwright/test";
import { AgentsWindow } from "./support/agents-window";

const window = new AgentsWindow();
const title = "Fix the log and the cache and the sync and the job and the queue and the mail";
const words = title.split(" ");
let lines: readonly string[];

test.beforeAll(() => {
  window.start();
  const pinned = window.startFakeAgent({ space: "alpha", title });
  window.startFakeAgent({ space: "beta", title });
  window.startShellTab();
  window.readAgents();
  window.actAgents("pin", { terminal: pinned });
  window.readUntilAgents((text) => /Pinned/.test(text), { sections: true });
  lines = window.read();
});

test.afterAll(() => window.stop());

/** How many of the title's words a line holds in order from the first, past any mark before it. */
const titleWordsIn = (line: string): number => {
  const said = line.split(/\s+/);
  const start = said.indexOf(words[0] ?? "");
  let n = 0;
  while (start >= 0 && said[start + n] === words[n]) n++;
  return n;
};

// Spec: docs/specs/in-progress/executing-nerd-herd-agents.html#test-case-a-card-keeps-the-pin-s-room-whether-the-pin-shows-or-not
// "A pinned card and an unpinned card with the same long title: both titles' first lines end at the
//  same word." (the user, 2026-11-21: "the push pin is making the title on the card shift
//  sometimes, making the size of the card change")
test("a pinned card and an unpinned card wrap the same long title at the same word", () => {
  const firsts = lines.filter((l) => titleWordsIn(l) > 0).map(titleWordsIn);
  expect(
    firsts.length === 2 && firsts[0] === firsts[1] && (firsts[0] ?? 0) < words.length,
    `two first lines, wrapped, holding the same number of title words: ${JSON.stringify(firsts)} in: ${lines.join(" | ")}`,
  ).toBe(true);
});
