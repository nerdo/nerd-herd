import { expect, test } from "bun:test";
import { type JjRun, readJjState, vcsLabel } from "./vcsLabel";

/** A jj that answers each command the way a repository at `bookmark`, `ahead` changes on, would. */
const fakeJj =
  (o: { bookmark: string | null; ahead: number; change: string }): JjRun =>
  async (args) => {
    const joined = args.join(" ");
    if (joined.includes(" root")) return { code: 0, stdout: "/repo\n" };
    if (joined.includes("heads(::@ & bookmarks())..@"))
      return { code: 0, stdout: "x".repeat(o.ahead) };
    if (joined.includes("heads(::@ & bookmarks())"))
      return { code: 0, stdout: o.bookmark ? `zzzz\t${o.bookmark}\n` : "" };
    if (joined.includes("-r @ ")) return { code: 0, stdout: `${o.change}\t\n` };
    return { code: 1, stdout: "" };
  };

// Spec: docs/specs/in-progress/executing-nerd-herd-agents.html#test-case-a-card-shows-its-jj-bookmark-and-the-changes-ahead-of-it@jj:607ab1aa
// "A session in a jj repository whose working copy is two non-empty changes ahead of the main
//  bookmark: the card reads main ↑2 under its time."
test("a jj working copy two changes ahead of main reads main ↑2", async () => {
  const state = await readJjState(fakeJj({ bookmark: "main", ahead: 2, change: "kxyz" }));
  expect(vcsLabel(state, null), "the label").toBe("main ↑2");
});

// As the Spaces jj label: with no bookmark below the working copy, its change id.
test("a jj working copy with no bookmark below it reads its change id", async () => {
  const state = await readJjState(fakeJj({ bookmark: null, ahead: 0, change: "kxyz1234" }));
  expect(vcsLabel(state, null), "the label").toBe("@kxyz1234");
});

// Outside jj, Herdr's git branch for the pane, as Herdr's Spaces shows it.
test("outside jj, a session reads its git branch", () => {
  expect(vcsLabel(null, "develop"), "the label").toBe("develop");
});
