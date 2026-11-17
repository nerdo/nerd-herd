// The project's start command (`bun run start`): builds the Spaces mod, makes sure a Herdr window
// runs for the Herdr home, installs the mod and the nerd-herd layout there, and shows that layout.
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { scriptSettings as s } from "./settings";

const root = join(import.meta.dir, "..");
const modName = "nerd-herd-spaces";
const env = { ...process.env, HERDR_APP_HOME: s.herdrHome };
const herdr = (...args: string[]) =>
  Bun.spawnSync(["herdr-app", ...args], { env, stdout: "pipe", stderr: "pipe" });
const windowRuns = () => herdr("status").exitCode === 0;

function build(): string {
  // The build is defined once, as the package's `build` script.
  const r = Bun.spawnSync(["bun", "run", "build"], {
    cwd: root,
    stdout: "inherit",
    stderr: "inherit",
  });
  if (r.exitCode !== 0) throw new Error("The Spaces mod did not build (bun run build)");
  return join(root, "dist/mods", modName);
}

async function ensureWindow(): Promise<void> {
  if (windowRuns()) return;
  if (s.isOwnHome) Bun.spawnSync(["open", "-a", "Herdr"]);
  else {
    // A test window keeps its log in its own home, so a failure can be read afterward.
    const log = Bun.file(join(s.herdrHome, "window.log"));
    Bun.spawn([s.herdrBinary], { env, stdout: log, stderr: log }).unref();
    // The program that owns the test window (NERD_HERD_OWNER_PID, else whoever ran this script);
    // a watchdog quits the window once that program ends, even when it is interrupted.
    const owner = process.env.NERD_HERD_OWNER_PID ?? String(process.ppid);
    Bun.spawn(["bun", join(import.meta.dir, "window-watchdog.ts"), owner], {
      env,
      stdio: ["ignore", "ignore", "ignore"],
    }).unref();
  }
  const until = Date.now() + s.windowWaitMs;
  while (!windowRuns()) {
    if (Date.now() > until) throw new Error(`No Herdr window answered for ${s.herdrHome}`);
    Bun.sleepSync(500);
  }
}

async function installLayout(): Promise<void> {
  const main = await readFile(join(s.herdrHome, "layouts/main.json"), "utf8");
  if (!main.includes('"mod": "spaces"'))
    throw new Error("layouts/main.json has no Spaces block to replace");
  await writeFile(
    join(s.herdrHome, "layouts/nerd-herd.json"),
    main.replace('"mod": "spaces"', `"mod": "${modName}"`),
  );
}

const built = build();
await ensureWindow();
await mkdir(join(s.herdrHome, "mods", modName), { recursive: true });
await cp(built, join(s.herdrHome, "mods", modName), { recursive: true });
await installLayout();
const shown = herdr("do", "layout.switch", "--name", "nerd-herd");
if (shown.exitCode !== 0) throw new Error(`layout.switch failed: ${shown.stderr.toString()}`);
console.log(`nerd-herd Spaces mod is running in the Herdr window for ${s.herdrHome}`);
