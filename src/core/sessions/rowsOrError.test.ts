import { expect, test } from "bun:test";
import { AgentsListError, rowsOrError } from "./rowsOrError";

// Behavior entry in docs/specs/in-progress/executing-nerd-herd-agents.html (Agents sidebar mod
// phase), found 2026-11-20: "when arranging the sessions throws, the Agents section shows an error
// card with a reference instead of a stack trace".
test("when reading the sessions throws, the Agents list gets an error with a reference, keeping the cause", () => {
  const broken = new TypeError("sessions.filter is not a function");
  const result = rowsOrError(() => {
    throw broken;
  });
  expect(
    result instanceof AgentsListError
      ? { message: result.message, cause: result.cause }
      : "rows instead of an error",
    "the user-facing message names the reference; the cause is the original error",
  ).toEqual({
    message: `Something went wrong on our end. Reference ${
      result instanceof AgentsListError ? result.metadata.errorId : ""
    }.`,
    cause: broken,
  });
});
