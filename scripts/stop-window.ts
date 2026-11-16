// Quits the Herdr test window for HERDR_APP_HOME. Refuses the person's own Herdr home.
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
