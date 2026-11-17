import { describe, expect, test } from "bun:test";
import { emptyGroups, make } from "./groupFixtures";
import { moveTargets } from "./moveTargets";

// Statement gained from the spec's group menu ("Move to…"): the places offered are exactly those the
// move can go, since moving a group into itself or its own subgroup changes nothing (spec case
// "Nesting a group inside its own subgroup changes nothing").
describe("where a group can move", () => {
  test("a group can move to the top level or any group outside itself", () => {
    let saved = make(emptyGroups, "work", "Work");
    saved = make(saved, "clients", "Clients", "work");
    saved = make(saved, "personal", "Personal");
    expect(moveTargets(saved, "work").map((t) => t.name)).toEqual([null, "Personal"]);
  });
});
