// Finds the Herdr processes of a test window: those whose environment names the test home.
import { scriptSettings as s } from "./settings";

/** Herdr processes whose environment names this test home; the person's own Herdr never does. */
export const testWindows = (): number[] => {
  const pids = Bun.spawnSync(["pgrep", "-f", s.herdrBinary], { stdout: "pipe" })
    .stdout.toString()
    .split("\n")
    .filter(Boolean)
    .map(Number);
  return pids.filter((pid) => {
    const ps = Bun.spawnSync(["ps", "eww", "-o", "command=", "-p", String(pid)], {
      stdout: "pipe",
    });
    return ps.stdout.toString().split(" ").includes(`HERDR_APP_HOME=${s.herdrHome}`);
  });
};
