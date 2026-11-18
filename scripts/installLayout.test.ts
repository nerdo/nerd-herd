import { expect, test } from "bun:test";
import { withJjMods } from "./installLayout";

// The blocks of Herdr's main layout that the install rewrites, in Herdr's own formatting.
const main = `{
  "id": "root",
  "children": [
    { "id": "spaces", "type": "block", "content": { "mod": "spaces" } },
    { "id": "changes", "type": "block", "content": {
        "mod": "changes"
      } },
    { "id": "status", "type": "block", "content": { "mod": "workspace-status" } }
  ]
}`;

const modOf = (layout: string, id: string): string | undefined => {
  type Node = { id?: string; content?: { mod?: string }; children?: Node[] };
  const find = (n: Node): Node | undefined =>
    n.id === id ? n : (n.children ?? []).map(find).find(Boolean);
  return find(JSON.parse(layout))?.content?.mod;
};

const homeWith =
  (...mods: string[]) =>
  (name: string) =>
    mods.includes(name);

// docs/specs/drafts/vendored-spaces-patches.html#test-case-the-install-shows-jj-changes@jj:cef71a9a
test("with jj-changes in the home, the layout's changes block shows jj-changes", () => {
  expect(modOf(withJjMods(main, homeWith("jj-changes")), "changes")).toBe("jj-changes");
});

// docs/specs/drafts/vendored-spaces-patches.html#test-case-the-install-shows-jj-status@jj:cef71a9a
test("with jj-status in the home, the layout's status block shows jj-status", () => {
  expect(modOf(withJjMods(main, homeWith("jj-status")), "status")).toBe("jj-status");
});

// docs/specs/drafts/vendored-spaces-patches.html#test-case-without-jj-mods-herdr-s-blocks-stay@jj:cef71a9a
test("without jj mods in the home, the changes and status blocks keep Herdr's mods", () => {
  const layout = withJjMods(main, homeWith());
  expect([modOf(layout, "changes"), modOf(layout, "status")]).toEqual([
    "changes",
    "workspace-status",
  ]);
});
