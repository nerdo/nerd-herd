// Copies the status bars nerd-herd's own status bar is made from (`bun scripts/vendor-status.ts`):
// Herdr's shipped workspace-status, and herdr-app-jj's jj-status with the jj lookup it imports. Each
// gets the Dismiss button in its center (nerd-herd Agents spec, question "How Dismiss gets into the
// status bar"). Re-run it when either status bar updates; it stops on a line it cannot find, so an
// upstream change is noticed rather than lost. The files stay under their upstream licenses.
import { copyFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const mods = join(homedir(), ".config/herdr-app/mods");
const vendor = process.argv[2] ?? join(import.meta.dir, "../src/mod/status/vendor");

/** The spacer before the palette hint, in both status bars: Dismiss goes between two of them. */
const spacer = ".child(div().flex_1())";

export const withDismiss = (source: string, from: string): string => {
  if (source.split(spacer).length !== 2)
    throw new Error(`${from} changed: expected one ${spacer} before the palette hint`);
  return `// nerd-herd: vendored by scripts/vendor-status.ts from ${from}; do not edit by hand.
import { nerdHerdDismiss } from "../dismissButton";
${source.replace(spacer, `${spacer}.child(nerdHerdDismiss())${spacer}`)}`;
};

if (import.meta.main) {
  for (const [mod, out] of [
    ["workspace-status", "workspaceStatus.js"],
    ["jj-status", "jjStatus.js"],
  ] as const) {
    const from = join(mods, mod, "main.js");
    await writeFile(join(vendor, out), withDismiss(await Bun.file(from).text(), `${mod}/main.js`));
  }
  await copyFile(join(mods, "jj-status/jjProgram.js"), join(vendor, "jjProgram.js"));
  console.log(`vendored status bars into ${vendor}`);
}
