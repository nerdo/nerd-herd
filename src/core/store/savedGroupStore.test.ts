import { describe, expect, test } from "bun:test";
import { SavedDataError } from "../errors/savedDataError";
import {
  keepBannerFile,
  makeGroup,
  placeMachine,
  setBanner,
  setFolded,
  setIcon,
} from "../groups/groupActions";
import { emptyGroups } from "../groups/groupModel";
import { placeItem } from "../groups/levelOrder";
import { createGroupStore, type SharedState } from "./savedGroupStore";

/** Herdr's shared state, kept in memory. */
const memoryShared = (start: Record<string, unknown> = {}) => {
  const values = new Map(Object.entries(start));
  const shared: SharedState = {
    read: (key) => values.get(key),
    write: (key, value) => values.set(key, value),
  };
  return { shared, values };
};

describe("saved group store", () => {
  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-saved-groups-read-back-after-a-restart@jj:093e16ca
  // "The read groups equal the written groups"
  test("saved groups read back after a restart", () => {
    let groups = makeGroup(makeGroup(emptyGroups, { id: "work", name: "Work" }), {
      id: "personal",
      name: "Personal",
    });
    groups = placeMachine(groups, "desk-work", "work");
    groups = placeMachine(
      placeMachine(groups, "ai-sandbox", "personal"),
      "desk-home",
      "personal",
    );
    groups = setIcon(setFolded(groups, "work", true), "work", { kind: "emoji", value: "💼" });
    const { shared } = memoryShared();
    createGroupStore(shared).save(groups);
    expect(createGroupStore(shared).load().groups).toEqual(groups);
  });

  // The user, 2026-11-17: "I think we should embed the images." The kept copy survives a restart.
  test("a group's kept banner copy reads back after a restart", () => {
    let groups = makeGroup(emptyGroups, { id: "work", name: "Work" });
    groups = setBanner(groups, "work", "open", "~/banners/work.png");
    groups = keepBannerFile(groups, "~/banners/work.png", {
      path: "mods/nerd-herd-spaces/.banners/abc.png",
      width: 544,
      height: 184,
    });
    const { shared } = memoryShared();
    createGroupStore(shared).save(groups);
    expect(createGroupStore(shared).load().groups).toEqual(groups);
  });

  // The user, 2026-11-17: a level switched to a custom order keeps it, in the top level and in a group.
  test("custom orders of the top level and of a group read back after a restart", () => {
    let groups = makeGroup(makeGroup(emptyGroups, { id: "work", name: "Work" }), {
      id: "clients",
      name: "Clients",
      parent: "work",
    });
    groups = placeItem(
      groups,
      null,
      { kind: "machine", name: null },
      { kind: "group", id: "work" },
    );
    groups = placeItem(
      groups,
      "work",
      { kind: "machine", name: "ai-sandbox" },
      {
        kind: "group",
        id: "clients",
      },
    );
    const { shared } = memoryShared();
    createGroupStore(shared).save(groups);
    expect(createGroupStore(shared).load().groups).toEqual(groups);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-unreadable-saved-groups-are-backed-up-and-reset@jj:093e16ca
  // "It returns no groups, the backup key holds "not groups", and it reports a saved-groups error with userAction report"
  test("unreadable saved groups are backed up and reset", () => {
    const { shared, values } = memoryShared({ "nerd-herd.groups": "not groups" });
    const read = createGroupStore(shared).load();
    expect([
      read.groups,
      (values.get("nerd-herd.groups.backup") as { data?: unknown } | undefined)?.data,
      read.problem instanceof SavedDataError,
      read.problem?.userAction,
    ]).toEqual([emptyGroups, "not groups", true, "report"]);
  });

  // Statement gained when the damaged-data walk found the error card missing: the read that backs
  // up the damaged groups may happen in a view Herdr then replaces, so every later read reports the
  // problem too, while the backup is kept.
  test("after damaged groups were backed up, a later read still reports the problem", () => {
    const { shared } = memoryShared({ "nerd-herd.groups": "not groups" });
    const store = createGroupStore(shared);
    store.load();
    expect(store.load().problem).toBeInstanceOf(SavedDataError);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-with-no-groups-spaces-lists-machines-the-way-herdr-does@jj:093e16ca
  // A first start has nothing saved: no groups, and nothing to report.
  test("nothing saved reads as no groups and no problem", () => {
    const read = createGroupStore(memoryShared().shared).load();
    expect([read.groups, read.problem]).toEqual([emptyGroups, null]);
  });
});
