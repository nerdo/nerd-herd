import { describe, expect, test } from "bun:test";
import type { BannerFile } from "../banners/bannerCache";
import { bannersToLoad, keepBannerFile, setBanner } from "./groupActions";
import { computeRows, defaultSettings, emptyGroups, make } from "./groupFixtures";
import type { SavedGroups } from "./groupModel";

// The user, 2026-11-17: "I think we should embed the images. The dialog then becomes an image
// loading mechanism, and ... the url that it was last loaded from, it's kept as a reference." A
// banner is loaded once, when its link is set, and the group keeps the loaded copy; Herdr does not
// read the link again at each start.
const link = "~/banners/work.png";
const file: BannerFile = {
  path: "mods/nerd-herd-spaces/.banners/abc.png",
  width: 544,
  height: 184,
};
const withLink = setBanner(make(emptyGroups, "work", "Work"), "work", "open", link);
const kept = keepBannerFile(withLink, link, file);
const bannerFileOf = (saved: SavedGroups) => {
  const row = computeRows(saved, [], defaultSettings).find((r) => r.kind === "group");
  return row?.kind === "group" ? row.bannerFile : "no group row";
};

describe("embedding a group's banner", () => {
  test("a group with a banner link and no kept copy needs its banner loaded", () => {
    expect(bannersToLoad(withLink)).toEqual([link]);
  });

  test("a loaded banner's copy is kept with the group, and its row draws from it", () => {
    expect(bannerFileOf(kept)).toEqual(file);
  });

  test("a group that keeps its banner's copy needs nothing loaded", () => {
    expect(bannersToLoad(kept)).toEqual([]);
  });

  test("setting a different link drops the kept copy, so the new link is loaded", () => {
    expect(bannersToLoad(setBanner(kept, "work", "open", "~/banners/new.png"))).toEqual([
      "~/banners/new.png",
    ]);
  });

  test("setting the same link again keeps the kept copy", () => {
    expect(bannerFileOf(setBanner(kept, "work", "open", link))).toEqual(file);
  });

  test("a copy loaded for a link the group no longer has is not kept", () => {
    const changed = setBanner(withLink, "work", "open", "~/banners/new.png");
    expect(bannerFileOf(keepBannerFile(changed, link, file))).toBeNull();
  });
});
