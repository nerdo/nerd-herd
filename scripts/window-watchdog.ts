// Ends one Herdr test window once the program that started it has ended, so an interrupted test run
// leaves no window behind. Started by scripts/herdr-install.ts as
// `bun scripts/window-watchdog.ts <owner pid> <window pid>`; it touches only that window, so a newer
// test window on the same home keeps running.
import { scriptSettings as s } from "./settings";

const [owner, window] = process.argv.slice(2).map(Number);
const valid = (pid: number | undefined): pid is number => Number.isInteger(pid) && (pid ?? 0) > 0;
if (s.isOwnHome || !valid(owner) || !valid(window)) process.exit(0);
const alive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};
while (alive(owner) && alive(window)) Bun.sleepSync(2_000);
if (alive(window)) {
  process.kill(window, "SIGTERM");
  const until = Date.now() + 5_000;
  while (alive(window) && Date.now() < until) Bun.sleepSync(300);
  if (alive(window)) process.kill(window, "SIGKILL");
}
