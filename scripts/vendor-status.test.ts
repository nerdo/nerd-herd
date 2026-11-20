import { expect, test } from "bun:test";
import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { withDismiss } from "./vendor-status";

// Spec: docs/specs/finalized/nerd-herd-agents.html#spec-question-how-dismiss-gets-into-the-status-bar@jj:14ab73a0
// "nerd-herd ships its own status bar mod: the status mod ... with patch files ... that add Dismiss
//  in its center ... An upstream change then shows up as a patch that no longer applies."
test("the vendor step puts Dismiss between two spacers, so it sits in the status bar's center", () => {
  const out = withDismiss(".child(a).child(div().flex_1()).child(palette)", "x/main.js");
  expect(out.split("\n").at(-1), "spacer, Dismiss, spacer, then the palette hint").toBe(
    ".child(a).child(div().flex_1()).child(nerdHerdDismiss()).child(div().flex_1()).child(palette)",
  );
});

test("a status bar without the one spacer it expects stops the vendor step, naming the file", () => {
  expect(() => withDismiss(".child(a).child(palette)", "workspace-status/main.js")).toThrow(
    "workspace-status/main.js changed",
  );
});

test("the vendored status bars equal what the vendor step writes from the installed ones", async () => {
  const root = join(import.meta.dir, "..");
  const fresh = await mkdtemp(join(tmpdir(), "nh-status-"));
  const r = Bun.spawnSync(["bun", "scripts/vendor-status.ts", fresh], { cwd: root });
  const names = (await readdir(fresh)).sort();
  const same = await Promise.all(
    names.map(
      async (n) =>
        (await Bun.file(join(fresh, n)).text()) ===
        (await Bun.file(join(root, "src/mod/status/vendor", n)).text()),
    ),
  );
  expect([r.exitCode, names, same], "the same three files, byte for byte").toEqual([
    0,
    ["jjProgram.js", "jjStatus.js", "workspaceStatus.js"],
    [true, true, true],
  ]);
});
