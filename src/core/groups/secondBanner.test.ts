import { expect, test } from "bun:test";
import type { BannerFile } from "../banners/bannerCache";
import { bannersToLoad, keepBannerFile, setLook } from "./groupActions";
import { applyCommand } from "../commands/applyCommand";
import { computeRows, defaultSettings, emptyGroups, header, make } from "./groupFixtures";

const quiet = "https://banners.example/quiet-open.png";
const quietFolded = "https://banners.example/quiet-folded.png";
const file: BannerFile = {
  path: "mods/nerd-herd-spaces/.banners/quiet.png",
  width: 300,
  height: 60,
};
const withSecond = () =>
  setLook(make(emptyGroups, "work", "Work"), "work", {
    secondOpenBanner: quiet,
    secondFoldedBanner: quietFolded,
  });

// Behavior entry in docs/specs/in-progress/executing-nerd-herd-agents.html (Group looks phase):
// "the second banner style's images are copied in and kept like the first style's, so a group
//  shown as its second banner draws it after a restart".
test("a second banner style's two links are loaded once, like the first style's", () => {
  expect(bannersToLoad(withSecond()), "both second-style links").toEqual([quiet, quietFolded]);
});

test("a loaded second banner image is kept with the group, beside its link", () => {
  const kept = keepBannerFile(withSecond(), quiet, file);
  expect(
    kept.groups[0]?.secondOpenBannerFile,
    "the kept copy of the second style's open image",
  ).toEqual(file);
});

test("a group shown as its second banner in Spaces carries that image's kept copy in Spaces' rows", () => {
  const saved = setLook(keepBannerFile(withSecond(), quiet, file), "work", {
    spacesLook: "second",
  });
  const row = header(computeRows(saved, [], defaultSettings), "Work");
  expect(
    row?.kind === "group" ? [row.banner, row.bannerFile] : "no group row",
    "link and copy",
  ).toEqual([quiet, file]);
});

// As for the first style (setBanner): a new link drops the kept copy, so the new image is loaded.
test("a new second-style open link drops the kept copy, so the new image is loaded", () => {
  const before = { groups: keepBannerFile(withSecond(), quiet, file), settings: defaultSettings };
  const after = applyCommand(
    before,
    'group-banner:{"group":"Work","secondOpen":"https://banners.example/other.png"}',
    () => "g1",
  );
  expect(bannersToLoad(after.groups), "the new link waits to be loaded").toContain(
    "https://banners.example/other.png",
  );
});
