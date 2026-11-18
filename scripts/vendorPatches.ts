// Applies patch files to the text of Herdr's Spaces mod (see scripts/vendor-spaces.ts), with the
// system's `patch` program, one at a time in file-name order, each on the result of the one before.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export type SpacesPatch = { name: string; text: string };

/** A patch in patches/spaces that no longer fits Herdr's Spaces mod: the vendor step stops on it. */
export class PatchDidNotApply extends Error {
  constructor(
    readonly patchName: string,
    readonly output: string,
  ) {
    super(`patches/spaces/${patchName} does not apply to Herdr's Spaces mod:\n${output}`);
    this.name = "PatchDidNotApply";
  }
}

export function applyPatches(text: string, patches: SpacesPatch[]): string {
  const dir = mkdtempSync(join(tmpdir(), "nerd-herd-vendor-"));
  const file = join(dir, "main.js");
  try {
    writeFileSync(file, text);
    for (const p of [...patches].sort((a, b) => a.name.localeCompare(b.name))) {
      // --reject-file=-: a failed hunk leaves no .rej file behind, the error carries patch's output.
      const r = Bun.spawnSync(
        ["patch", "--batch", "--forward", "--no-backup-if-mismatch", "--reject-file=-", file],
        { stdin: new TextEncoder().encode(p.text), stdout: "pipe", stderr: "pipe" },
      );
      if (r.exitCode !== 0)
        throw new PatchDidNotApply(p.name, `${r.stdout.toString()}${r.stderr.toString()}`);
    }
    return readFileSync(file, "utf8");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
