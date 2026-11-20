import { expect, test } from "bun:test";
import { duration, statusSince } from "./statusTime";

const minute = 60_000;

// Spec: docs/specs/in-progress/executing-nerd-herd-agents.html#test-case-time-in-a-status-reads-as-herdr-writes-it@jj:607ab1aa
// "Sessions in their status for 30 seconds, 5 minutes, 3 hours and 2 days: they read <1m, 5m, 3h
//  and 2d."
test("times in a status read <1m, 5m, 3h and 2d, as Herdr's Agents list writes them", () => {
  expect(
    [0.5 * minute, 5 * minute, 3 * 60 * minute, 2 * 24 * 60 * minute].map(duration),
    "Herdr's short forms",
  ).toEqual(["<1m", "5m", "3h", "2d"]);
});

// Spec: docs/specs/in-progress/executing-nerd-herd-agents.html#test-case-the-time-restarts-when-the-status-changes@jj:607ab1aa
// "A session idle since 10:00 that starts working at 10:05: its time computed at 10:07 reads 2m,
//  counted from 10:05; done and idle count as one status."
test("a session's time counts from its last status change, done and idle counting as one", () => {
  const ten = Date.UTC(2026, 10, 20, 10, 0);
  let since = statusSince({}, [{ terminal: "t1", status: "idle" }], ten);
  since = statusSince(since, [{ terminal: "t1", status: "done" }], ten + 2 * minute);
  since = statusSince(since, [{ terminal: "t1", status: "working" }], ten + 5 * minute);
  expect(
    [since.t1?.at, duration(ten + 7 * minute - (since.t1?.at ?? 0))],
    "working since 10:05, read at 10:07",
  ).toEqual([ten + 5 * minute, "2m"]);
});
