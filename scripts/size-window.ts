// Gives the test window for HERDR_APP_HOME a fixed size: `bun scripts/size-window.ts <width> <height>`.
// Under yabai, a tiling window manager, the window's size otherwise follows the person's tiling.
// Only the test window is touched, found by its process ID; without yabai this does nothing.
import { scriptSettings as s } from "./settings";
import { testWindows } from "./testWindows";
import { sizeCommands, type YabaiWindow } from "./windowSize";

if (s.isOwnHome) {
  console.error("size-window only sizes a test window: set HERDR_APP_HOME to a test home");
  process.exit(1);
}
const [width, height] = process.argv.slice(2).map(Number);
if (!width || !height) {
  console.error("usage: bun scripts/size-window.ts <width> <height>");
  process.exit(1);
}
const yabai = Bun.which("yabai");
if (!yabai) process.exit(0);

const windows = (): YabaiWindow[] => {
  const q = Bun.spawnSync([yabai, "-m", "query", "--windows"], { stdout: "pipe", stderr: "pipe" });
  return q.exitCode === 0 ? JSON.parse(q.stdout.toString()) : [];
};
// The window can reach yabai a moment after Herdr answers its first command.
const pids = testWindows();
const until = Date.now() + 10_000;
let commands = sizeCommands(windows(), pids, { width, height });
while (commands.length === 0 && Date.now() < until) {
  Bun.sleepSync(300);
  commands = sizeCommands(windows(), pids, { width, height });
}
if (commands.length === 0) {
  console.error("size-window: yabai shows no window for this test home");
  process.exit(1);
}
for (const args of commands) {
  const r = Bun.spawnSync([yabai, ...args], { stdout: "pipe", stderr: "pipe" });
  if (r.exitCode !== 0) {
    console.error(`yabai ${args.join(" ")} failed: ${r.stderr.toString()}`);
    process.exit(1);
  }
}
