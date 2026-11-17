// Quits a Herdr test window once the program that started it has ended, so an interrupted test run
// leaves no window behind. Started by scripts/start.ts as `bun scripts/window-watchdog.ts <owner pid>`.
import { join } from "node:path";
import { scriptSettings as s } from "./settings";

const owner = Number(process.argv[2]);
if (s.isOwnHome || !Number.isInteger(owner) || owner <= 0) process.exit(0);
const alive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};
while (alive(owner)) Bun.sleepSync(2_000);
Bun.spawnSync(["bun", join(import.meta.dir, "stop-window.ts")], {
  env: { ...process.env, HERDR_APP_HOME: s.herdrHome },
  stdout: "ignore",
  stderr: "ignore",
});
