import { expect, test } from "bun:test";
import { applyPatches } from "./vendorPatches";

const patch = (from: string, to: string) =>
  `--- a/main.js\n+++ b/main.js\n@@ -1,3 +1,3 @@\n a\n-${from}\n+${to}\n c\n`;

// docs/specs/drafts/vendored-spaces-patches.html#test-case-patches-apply-in-file-name-order@jj:0250c40a
test("patches apply to the Spaces text in file-name order, each on the one before", () => {
  const patches = [
    { name: "20-second.patch", text: patch("B", "X") },
    { name: "10-first.patch", text: patch("b", "B") },
  ];
  expect(applyPatches("a\nb\nc\n", patches)).toBe("a\nX\nc\n");
});

// docs/specs/drafts/vendored-spaces-patches.html#test-case-a-patch-that-does-not-apply-is-named@jj:0250c40a
test("a patch whose context is not in the Spaces text fails with the patch's file name", () => {
  const patches = [{ name: "30-stale.patch", text: patch("missing", "Y") }];
  expect(() => applyPatches("a\nb\nc\n", patches)).toThrow("30-stale.patch");
});
