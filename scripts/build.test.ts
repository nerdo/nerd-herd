import { expect, test } from "bun:test";
import { join } from "node:path";

// Statement gained when the walk found banners never downloading: Bun's browser target had replaced
// Herdr's fs/promises with an empty stand-in, so mkdir was "not a function" inside Herdr.
test("the built mod imports Herdr's fs/promises module instead of a stand-in", async () => {
  const root = join(import.meta.dir, "..");
  const built = Bun.spawnSync(["bun", "scripts/build.ts"], {
    cwd: root,
    stdout: "pipe",
    stderr: "pipe",
  });
  const bundle = await Bun.file(join(root, "dist/mods/nerd-herd-spaces/main.js")).text();
  expect([
    built.exitCode,
    /^import \{[^}]*\bmkdir\b[^}]*\} from "fs\/promises";$/m.test(bundle),
  ]).toEqual([0, true]);
});
