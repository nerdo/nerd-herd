import { expect, test } from "bun:test";
import { computeRows, defaultSettings, header, twoBanners } from "./groupFixtures";

// Spec: docs/specs/finalized/nerd-herd-agents.html#test-case-each-panel-draws-its-own-look@jj:14ab73a0
// "A group with a banner, Show as Folder for Spaces and Banner for Agents: Spaces gets the folder
//  with the group's icon." Spaces' rows carry what Spaces draws.
test("a group with banners whose Spaces look is the folder has no banner in Spaces' rows", () => {
  const saved = twoBanners();
  const withLook = {
    ...saved,
    groups: saved.groups.map((g) => ({ ...g, spacesLook: "folder", agentsLook: "banner" })),
  };
  const row = header(computeRows(withLook, [], defaultSettings), "Work");
  expect(
    row?.kind === "group" ? row.banner : "not a group row",
    "no banner: the folder",
  ).toBeNull();
});
