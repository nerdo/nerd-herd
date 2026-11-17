import { describe, expect, test } from "bun:test";
import { setBanner, setFolded, setIcon } from "./groupActions";
import {
  computeRows,
  defaultSettings,
  emptyGroups,
  header,
  make,
  twoBanners,
} from "./groupFixtures";

// Spec-driven bulk tests: each cites the spec case it was written from, pinned to the spec's revision.

describe("a group's header and banner", () => {
  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-a-group-header-carries-its-icon-and-banner@jj:093e16ca
  // "Work's header row carries that icon and that banner"
  test("a group header carries its icon and banner", () => {
    let saved = make(emptyGroups, "work", "Work");
    saved = setBanner(
      setIcon(saved, "work", { kind: "emoji", value: "💼" }),
      "work",
      "open",
      "https://banners.example/work.png",
    );
    const row = header(computeRows(saved, [], defaultSettings), "Work");
    expect([row?.icon?.value, row?.banner]).toEqual(["💼", "https://banners.example/work.png"]);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-a-single-banner-shows-in-both-states@jj:093e16ca
  // "Work's header row carries the open banner"
  test("a single banner shows in both states", () => {
    const saved = setFolded(
      setBanner(
        make(emptyGroups, "work", "Work"),
        "work",
        "open",
        "https://banners.example/open.png",
      ),
      "work",
      true,
    );
    expect(header(computeRows(saved, [], defaultSettings), "Work")?.banner).toBe(
      "https://banners.example/open.png",
    );
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-a-folded-group-with-two-banners-shows-its-folded-banner@jj:093e16ca
  // "Work's header row carries the folded banner"
  test("a folded group with two banners shows its folded banner", () => {
    const saved = setFolded(twoBanners(), "work", true);
    expect(header(computeRows(saved, [], defaultSettings), "Work")?.banner).toBe(
      "https://banners.example/folded.png",
    );
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-an-open-group-with-two-banners-shows-its-open-banner@jj:093e16ca
  // "Work's header row carries the open banner"
  test("an open group with two banners shows its open banner", () => {
    expect(header(computeRows(twoBanners(), [], defaultSettings), "Work")?.banner).toBe(
      "https://banners.example/open.png",
    );
  });
});
