// The one build of the Spaces mod (`bun run build`): one ES module for Herdr, with Herdr's own
// modules left as imports. Bun's browser target replaces Node built-ins with empty stand-ins even
// when they are marked external, so a plugin marks Herdr's "fs/promises" external before that happens.
import { cp } from "node:fs/promises";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const out = join(root, "dist/mods/nerd-herd-spaces");
const herdrModules = /^(herdr|gpui-kit|gpui-base|fs\/promises)$/;

const result = await Bun.build({
  entrypoints: [join(root, "src/mod/main.ts")],
  outdir: out,
  naming: "main.js",
  format: "esm",
  target: "browser",
  plugins: [
    {
      name: "herdr-modules",
      setup(build) {
        build.onResolve({ filter: herdrModules }, (args) => ({ path: args.path, external: true }));
      },
    },
  ],
});
if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}
await cp(join(root, "src/mod/mod.json"), join(out, "mod.json"));
console.log(`built ${join(out, "main.js")}`);
