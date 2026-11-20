import { expect, test } from "bun:test";
import { type CoreTerminal, doneSessions, withLedger } from "./doneLedger";

const terminal = (o: Partial<CoreTerminal> & Pick<CoreTerminal, "turn">): CoreTerminal => ({
  address: o.address ?? "desk-client/t1y",
  status: o.status ?? "idle",
  turn: o.turn,
  labels: o.labels ?? {},
});
const done = (...terminals: CoreTerminal[]) => doneSessions(terminals);

// Spec: docs/specs/finalized/nerd-herd-agents.html#test-case-a-label-that-is-not-a-turn-number-counts-as-no-label@jj:14ab73a0
// "A finished session at turn 13 whose herdr.seen is 11 and whose nerd-herd.handled label is
//  'soon': the session is under Done, as a session with no label would be."
test("a handled label that is not a whole turn number counts as no label, so turn 13 seen at 11 is under Done", () => {
  const t = terminal({ turn: 13, labels: { "herdr.seen": "11", "nerd-herd.handled": "soon" } });
  expect(done(t), "the session is under Done").toEqual(new Set([t.address]));
});

// Spec: docs/specs/finalized/nerd-herd-agents.html#test-case-a-session-with-no-label-starts-from-herdr-s-seen-turn@jj:14ab73a0
// "Two finished sessions with no nerd-herd.handled label: one at turn 28 with herdr.seen 28, one at
//  turn 13 with herdr.seen 11: only the session at turn 13 is under Done."
test("with no handled label, a session counts from Herdr's seen turn: 28 seen at 28 is not under Done, 13 seen at 11 is", () => {
  const seen = terminal({ address: "t1", turn: 28, labels: { "herdr.seen": "28" } });
  const unseen = terminal({ address: "t2", turn: 13, labels: { "herdr.seen": "11" } });
  expect(done(seen, unseen), "only turn 13").toEqual(new Set(["t2"]));
});

// Spec: docs/specs/finalized/nerd-herd-agents.html#test-case-a-finished-turn-above-the-handled-turn-is-under-done@jj:14ab73a0
// "A finished session at turn 9 whose nerd-herd.handled label is 8: the session is under Done."
test("a finished session at turn 9 handled at 8 is under Done", () => {
  const t = terminal({ turn: 9, labels: { "nerd-herd.handled": "8" } });
  expect(done(t), "the session is under Done").toEqual(new Set([t.address]));
});

// Spec: docs/specs/finalized/nerd-herd-agents.html#test-case-a-session-herdr-counts-as-seen-stays-under-done@jj:14ab73a0
// "A finished session at turn 9 whose herdr.seen is 9 and whose nerd-herd.handled label is 8: the
//  session is under Done."
test("a session Herdr counts as seen at turn 9 but handled at 8 stays under Done", () => {
  const t = terminal({ turn: 9, labels: { "herdr.seen": "9", "nerd-herd.handled": "8" } });
  expect(done(t), "the session is under Done").toEqual(new Set([t.address]));
});

// Spec: docs/specs/finalized/nerd-herd-agents.html#test-case-a-working-session-is-not-under-done@jj:14ab73a0
// "A working session at turn 10 whose nerd-herd.handled label is 8: the session is under Working."
// The ledger answers which sessions are under Done; this one is under Working, so the set is empty.
test("a working session at turn 10 handled at 8 sits under Working, so the Done set is empty", () => {
  const t = terminal({ status: "working", turn: 10, labels: { "nerd-herd.handled": "8" } });
  expect(done(t), "no session under Done").toEqual(new Set());
});

// Spec: docs/specs/finalized/nerd-herd-agents.html#test-case-the-turn-after-a-reply-comes-back-under-done@jj:14ab73a0
// "A session dismissed at turn 9, which Dannel replied to and which has finished turn 10: the
//  session is under Done."
test("a session dismissed at turn 9 that finished turn 10 after a reply is under Done again", () => {
  const t = terminal({ turn: 10, labels: { "herdr.seen": "10", "nerd-herd.handled": "9" } });
  expect(done(t), "the session is under Done").toEqual(new Set([t.address]));
});

// Spec: docs/specs/finalized/nerd-herd-agents.html#sec-ambiguity-resolution@jj:14ab73a0
// "The Agents mod shows nerd-herd's meaning under the Done header. Herdr's done and idle both feed
//  it, and its Idle header holds the rest."
test("sessions the ledger names are Done, and a session Herdr calls done that the ledger does not name is Idle", () => {
  const sessions = [
    { terminal: "t1", status: "done" },
    { terminal: "t2", status: "idle" },
    { terminal: "t3", status: "working" },
  ] as const;
  expect(
    withLedger(sessions, new Set(["t2"])).map((s) => [s.terminal, s.status]),
    "t1 Idle, t2 Done, t3 still Working",
  ).toEqual([
    ["t1", "idle"],
    ["t2", "done"],
    ["t3", "working"],
  ]);
});
