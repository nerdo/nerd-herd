import { describe, expect, test } from "bun:test";
import { SavedDataError } from "../errors/savedDataError";
import { z } from "../schema/zod";
import type { SharedState } from "./savedGroupStore";
import { createSavedValue } from "./savedValue";

/** Herdr's shared state, kept in memory. */
const memoryShared = (start: Record<string, unknown> = {}) => {
  const values = new Map(Object.entries(start));
  const shared: SharedState = {
    read: (key) => values.get(key),
    write: (key, value) => values.set(key, value),
  };
  return { shared, values };
};
const Numbers = z.array(z.number());
const numbers = (shared: SharedState) =>
  createSavedValue(shared, "test.numbers", "groups", [] as number[], (raw) => {
    const parsed = Numbers.safeParse(raw);
    return parsed.success ? { ok: true, value: parsed.data } : { ok: false, cause: parsed.error };
  });

// Statements from the user, 2026-11-17: the error card's reference id should not change on every
// redraw, and the card should stay with a button that re-attempts reading the saved data.
describe("a saved value with a backup", () => {
  test("a later read reports the same reference as the read that found the damage", () => {
    const { shared } = memoryShared({ "test.numbers": "damaged" });
    const value = numbers(shared);
    const first = value.load().problem?.metadata.errorId;
    expect([typeof first, value.load().problem?.metadata.errorId]).toEqual(["string", first]);
  });

  test("trying again while the backup still cannot be read keeps the problem and its reference", () => {
    const { shared } = memoryShared({ "test.numbers": "damaged" });
    const value = numbers(shared);
    const reference = value.load().problem?.metadata.errorId;
    value.retry();
    expect(value.load().problem?.metadata.errorId).toBe(reference ?? "missing");
  });

  test("trying again once the backup can be read restores it and clears the problem", () => {
    const { shared, values } = memoryShared({ "test.numbers": "damaged" });
    const value = numbers(shared);
    value.load();
    const backup = values.get("test.numbers.backup");
    values.set("test.numbers.backup", { ...(backup as object), data: [1, 2] });
    value.retry();
    expect([value.load().value, value.load().problem]).toEqual([[1, 2], null]);
  });

  test("damaged data is reported as a saved-data problem and the empty value is in use", () => {
    const { shared } = memoryShared({ "test.numbers": "damaged" });
    const read = numbers(shared).load();
    expect([read.value, read.problem instanceof SavedDataError]).toEqual([[], true]);
  });
});
