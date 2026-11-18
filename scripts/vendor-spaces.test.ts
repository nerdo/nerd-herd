import { expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const vendored = join(root, "src/mod/vendor/herdrSpaces.js");

// docs/specs/drafts/vendored-spaces-patches.html#test-case-the-vendored-file-matches-the-vendor-step@jj:0250c40a
test("the vendored Spaces file equals what the vendor step writes from Herdr's Spaces and the patches", async () => {
  const dir = mkdtempSync(join(tmpdir(), "nerd-herd-vendor-test-"));
  try {
    const out = join(dir, "herdrSpaces.js");
    Bun.spawnSync(["bun", "scripts/vendor-spaces.ts", out], {
      cwd: root,
      stdout: "pipe",
      stderr: "pipe",
    });
    const written = await Bun.file(out)
      .text()
      .catch(() => "(the vendor step wrote nothing there)");
    expect(written).toBe(await Bun.file(vendored).text());
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// docs/specs/drafts/vendored-spaces-patches.html#test-case-the-sidebar-asks-jj-first@jj:0250c40a
test("the vendored Spaces check() asks jj before its first git command", async () => {
  const text = await Bun.file(vendored).text();
  const check = text.slice(text.indexOf("  async check(key, cx) {"));
  const jj = check.indexOf("this.checkJj(");
  const git = check.indexOf('exec("git"');
  expect(jj !== -1 && jj < git).toBe(true);
});

// docs/specs/drafts/vendored-spaces-patches.html#test-case-the-sidebar-runs-jj-by-the-looked-up-program@jj:eee79aca
test("the vendored Spaces checkJj() runs jj by the looked-up program, not by the bare name", async () => {
  const text = await Bun.file(vendored).text();
  const start = text.indexOf("  async checkJj(on, cwd) {");
  const body = text.slice(start, text.indexOf("\n  }\n", start));
  expect([start !== -1, body.includes("await jjProgram(on)"), body.includes('exec("jj"')]).toEqual([
    true,
    true,
    false,
  ]);
});
