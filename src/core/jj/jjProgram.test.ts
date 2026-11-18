import { expect, test } from "bun:test";
import { jjProgramLookup } from "./jjProgram";

/** A fake way to run the lookup on a machine: answers with `stdout`, and records each machine asked. */
function fakeMachines(stdout: Record<string, string>) {
  const asked: string[] = [];
  const run = async (machine: string, _script: string) => {
    asked.push(machine);
    return { code: 0, stdout: stdout[machine] ?? "" };
  };
  return { run, asked };
}

// docs/specs/drafts/vendored-spaces-patches.html#test-case-on-this-computer-jj-runs-by-name@jj:eee79aca
test("on this computer the lookup answers jj and runs nothing", async () => {
  const m = fakeMachines({});
  const lookup = jjProgramLookup(m.run, () => 0);
  expect([await lookup(null), m.asked]).toEqual(["jj", []]);
});

// docs/specs/drafts/vendored-spaces-patches.html#test-case-on-another-machine-the-login-shell-names-jj@jj:eee79aca
test("on another machine the lookup answers the path its login shell reports", async () => {
  const m = fakeMachines({ box: "/home/dana/.local/bin/jj\n" });
  expect(await jjProgramLookup(m.run, () => 0)("box")).toBe("/home/dana/.local/bin/jj");
});

// docs/specs/drafts/vendored-spaces-patches.html#test-case-what-the-login-shell-prints-first-is-ignored@jj:eee79aca
test("lines the login shell prints before the path are ignored", async () => {
  const m = fakeMachines({ box: "Last connected from: 10.0.0.1\n/home/dana/.local/bin/jj\n" });
  expect(await jjProgramLookup(m.run, () => 0)("box")).toBe("/home/dana/.local/bin/jj");
});

// docs/specs/drafts/vendored-spaces-patches.html#test-case-each-machine-s-login-shell-is-asked-once@jj:eee79aca
test("a machine whose login shell found jj is asked only once", async () => {
  const m = fakeMachines({ box: "/usr/bin/jj\n" });
  const lookup = jjProgramLookup(m.run, () => 0);
  await lookup("box");
  await lookup("box");
  expect(m.asked).toEqual(["box"]);
});

// docs/specs/drafts/vendored-spaces-patches.html#test-case-without-jj-in-the-login-shell-jj-runs-by-name@jj:eee79aca
test("when the login shell prints no path the lookup answers jj", async () => {
  const m = fakeMachines({ box: "Last connected from: 10.0.0.1\n" });
  expect(await jjProgramLookup(m.run, () => 0)("box")).toBe("jj");
});

// docs/specs/drafts/vendored-spaces-patches.html#test-case-a-machine-without-jj-is-asked-again-after-a-minute@jj:eee79aca
test("a machine whose login shell found no jj is asked again a minute later", async () => {
  const m = fakeMachines({});
  let now = 0;
  const lookup = jjProgramLookup(m.run, () => now);
  await lookup("box");
  now = 60_000;
  await lookup("box");
  expect(m.asked).toEqual(["box", "box"]);
});
