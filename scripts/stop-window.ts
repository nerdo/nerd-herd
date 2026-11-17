// Quits every Herdr test window for HERDR_APP_HOME: first through Herdr (app.quit), then by ending
// any Herdr process still running on that home. Refuses the person's own Herdr home.
import { scriptSettings as s } from "./settings";

if (s.isOwnHome) {
  console.error("stop-window only quits a test window: set HERDR_APP_HOME to a test home");
  process.exit(1);
}
const env = { ...process.env, HERDR_APP_HOME: s.herdrHome };
const status = () =>
  Bun.spawnSync(["herdr-app", "status"], { env, stdout: "pipe", stderr: "pipe" }).exitCode;
if (status() === 0)
  Bun.spawnSync(["herdr-app", "do", "app.quit"], { env, stdout: "pipe", stderr: "pipe" });
const until = Date.now() + s.windowWaitMs;
while (status() === 0 && Date.now() < until) Bun.sleepSync(300);

/** Herdr processes whose environment names this test home; the person's own Herdr never does. */
const testWindows = (): number[] => {
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
for (const pid of testWindows()) process.kill(pid, "SIGTERM");
const gone = Date.now() + 5_000;
while (testWindows().length > 0 && Date.now() < gone) Bun.sleepSync(300);
for (const pid of testWindows()) process.kill(pid, "SIGKILL");
