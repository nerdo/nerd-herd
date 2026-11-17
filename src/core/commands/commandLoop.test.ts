import { describe, expect, test } from "bun:test";
import { CommandError } from "./applyCommand";
import { runCommands } from "./commandLoop";

// Statement gained during the build: the mod receives commands one by one (spec: Driving the mod), and
// one that fails must not stop the rest. The failure reaches the user through a report.
describe("running commands", () => {
  test("a command that fails is reported and the next command still applies", async () => {
    const applied: string[] = [];
    const reported: string[] = [];
    await runCommands(
      ["bad", "good"],
      (command) => {
        if (command === "bad") throw new CommandError(command);
        applied.push(command);
      },
      (error) => reported.push(error.name),
    );
    expect([applied, reported]).toEqual([["good"], ["CommandError"]]);
  });
});
