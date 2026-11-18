// The project's install command (`bun run herdr:install`): builds the Spaces mod, makes sure a Herdr window
// runs for the Herdr home, installs the mod and the nerd-herd layout there, and shows that layout.
import { existsSync } from "node:fs";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { keyBindings, mergeKeys } from "../src/core/keyboard/keyBindings";
import { withJjMods } from "./installLayout";
import { scriptSettings as s } from "./settings";
import { testWindows } from "./testWindows";

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
    const log = join(s.herdrHome, "window.log");
    if (s.launch === "direct") {
      // Herdr run directly keeps this PATH (the walks' fake curl), and takes the front for a moment.
      Bun.spawn([s.herdrBinary], { env, stdout: Bun.file(log), stderr: Bun.file(log) }).unref();
    } else {
      // macOS's open -g leaves the app in front where it was: run directly, Herdr took the keyboard
      // for about 1.8 s (the user, 2026-11-17: "have it not steal focus"). open passes only the
      // variables named; Herdr then uses the login shell's PATH, as for any Finder launch.
      const app = s.herdrBinary.replace(/\/Contents\/MacOS\/[^/]+$/, "");
      const opened = Bun.spawnSync(
        ["open", "-g", "-n", "-a", app, "--env", `HERDR_APP_HOME=${s.herdrHome}`].concat([
          "--stdout",
          log,
          "--stderr",
          log,
        ]),
      );
      if (opened.exitCode !== 0) throw new Error(`open could not start Herdr: ${opened.stderr}`);
    }
  }
  const until = Date.now() + s.windowWaitMs;
  while (!windowRuns()) {
    if (Date.now() > until) throw new Error(`No Herdr window answered for ${s.herdrHome}`);
    Bun.sleepSync(500);
  }
  if (s.isOwnHome) return;
  // The program that owns the test window (NERD_HERD_OWNER_PID, else whoever ran this script);
  // a watchdog quits the window once that program ends, even when it is interrupted.
  const owner = process.env.NERD_HERD_OWNER_PID ?? String(process.ppid);
  for (const pid of testWindows())
    Bun.spawn(["bun", join(import.meta.dir, "window-watchdog.ts"), owner, String(pid)], {
      env,
      stdio: ["ignore", "ignore", "ignore"],
    }).unref();
}

async function installLayout(): Promise<void> {
  const main = await readFile(join(s.herdrHome, "layouts/main.json"), "utf8");
  if (!main.includes('"mod": "spaces"'))
    throw new Error("layouts/main.json has no Spaces block to replace");
  // herdr-app-jj's Changes panel and status bar, where this home has them (scripts/installLayout.ts).
  const homeHas = (mod: string) => existsSync(join(s.herdrHome, "mods", mod));
  await writeFile(
    join(s.herdrHome, "layouts/nerd-herd.json"),
    withJjMods(main.replace('"mod": "spaces"', `"mod": "${modName}"`), homeHas),
  );
}

/**
 * Adds the Spaces mod's key section to the home's keys.json, keeping any section already there
 * (Herdr's guide: merge a mod's keys into the person's). Herdr stops upgrading an edited keys.json,
 * so the file as it was is kept beside it the first time.
 */
async function installKeys(): Promise<void> {
  const file = join(s.herdrHome, "keys.json");
  const before = await readFile(file, "utf8").catch(() => "{}");
  const merged = mergeKeys(JSON.parse(before), keyBindings(process.platform));
  const after = `${JSON.stringify(merged, null, 2)}\n`;
  if (JSON.stringify(JSON.parse(before)) === JSON.stringify(merged)) return;
  const backup = join(s.herdrHome, "keys.json.before-nerd-herd");
  if (!(await Bun.file(backup).exists())) await writeFile(backup, before);
  await writeFile(file, after);
}

const built = build();
await ensureWindow();
await mkdir(join(s.herdrHome, "mods", modName), { recursive: true });
await cp(built, join(s.herdrHome, "mods", modName), { recursive: true });
await installLayout();
await installKeys();
const shown = herdr("do", "layout.switch", "--name", "nerd-herd");
if (shown.exitCode !== 0) throw new Error(`layout.switch failed: ${shown.stderr.toString()}`);
console.log(`nerd-herd Spaces mod is running in the Herdr window for ${s.herdrHome}`);
