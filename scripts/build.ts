// The one build of nerd-herd's mods (`bun run build`): the Spaces mod and the Agents mod, each one
// ES module for Herdr, with Herdr's own modules left as imports. Bun's browser target replaces Node built-ins with empty stand-ins even
// when they are marked external, so a plugin marks Herdr's "fs/promises" external before that happens.
import { cp } from "node:fs/promises";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const herdrModules = /^(herdr|gpui-kit|gpui-base|fs\/promises)$/;

async function buildMod(name: string, source: string): Promise<void> {
  const out = join(root, "dist/mods", name);
  const result = await Bun.build({
    entrypoints: [join(root, source, "main.ts")],
    outdir: out,
    naming: "main.js",
    format: "esm",
    target: "browser",
    plugins: [
      {
        name: "herdr-modules",
        setup(build) {
          build.onResolve({ filter: herdrModules }, (args) => ({
            path: args.path,
            external: true,
          }));
        },
      },
    ],
  });
  if (!result.success) {
    for (const log of result.logs) console.error(log);
    process.exit(1);
  }
  await cp(join(root, source, "mod.json"), join(out, "mod.json"));
  console.log(`built ${join(out, "main.js")}`);
}

await buildMod("nerd-herd-spaces", "src/mod");
await buildMod("nerd-herd-agents", "src/mod/agents");
