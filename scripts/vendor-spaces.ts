// Copies Herdr's shipped Spaces mod into src/mod/vendor/herdrSpaces.js (or the path given as the
// first argument), applies the patch files in patches/spaces/ in file-name order, then nerd-herd's
// marked changes (`bun scripts/vendor-spaces.ts`). Re-run it when Herdr updates its Spaces mod or a
// patch is added; it stops on any change or patch it cannot place, so an upstream edit is noticed
// rather than lost. Patches apply first because published ones are written against Herdr's own file.
import { readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { applyPatches } from "./vendorPatches";

const source = join(homedir(), ".config/herdr-app/mods/spaces/main.js");
const target = process.argv[2] ?? join(import.meta.dir, "../src/mod/vendor/herdrSpaces.js");
const patchDir = join(import.meta.dir, "../patches/spaces");

const patchNames = (await readdir(patchDir)).filter((n) => n.endsWith(".patch"));
const patches = await Promise.all(
  patchNames.map(async (name) => ({ name, text: await Bun.file(join(patchDir, name)).text() })),
);
let text = applyPatches(await Bun.file(source).text(), patches);
const replace = (from: string, to: string) => {
  if (!text.includes(from)) throw new Error(`Herdr's Spaces mod changed; not found:\n${from}`);
  text = text.replace(from, to);
};

replace("export default class Spaces extends View {", "export class Spaces extends View {");
// nerd-herd: a button on a row keeps its press from reaching the row, as Herdr's own dialogs do, so
// pressing it does not start dragging the row (the user, 2026-11-18: a row outline showed on hover
// after using a row's buttons). Herdr's buttons stop only their click.
const clickStop = ".on_click((_e, cx) => { cx.stop_propagation();";
if (!text.includes(clickStop)) throw new Error(`Herdr's Spaces mod changed; not found:\n${clickStop}`);
text = text.replaceAll(
  clickStop,
  `.on_mouse_down("left", (_e, cx) => cx.stop_propagation())${clickStop}`,
);
replace(
  `    if (!remote.length) {
      if (loading(null) && !rows.length) return [loadingRow(null)];
      this.activeAt = rows.findIndex(r => r.w.active);
      return rows.map(draw);
    }
    const machineNames = [null, ...remote];
    return machineNames.flatMap((m) => {`,
  `    // nerd-herd: the rows to draw, in the user's order; machines appear as sections, depth-indented.
    const layoutRows = this.layoutRows(remote);
    if (!remote.length && layoutRows.every(r => r.kind === "machine")) {
      if (loading(null) && !rows.length) return [loadingRow(null)];
      this.activeAt = rows.findIndex(r => r.w.active);
      return rows.map(draw);
    }
    const machineSection = (m, depth) => {`,
);
replace(
  `      before += items.length;
      return items;
    });
  }`,
  `      before += items.length;
      // nerd-herd: what is under the machine's row is indented by spaceIndent() (a Spaces setting).
      const indent = this.spaceIndent();
      return collapsed ? items : items.map((el, i) => el.ml(depth * 12 + (i > 0 ? indent : 0)));
    };
    // nerd-herd: group and ungrouped headers interleave with the machine sections.
    return layoutRows.flatMap((r) => {
      if (r.kind === "machine") return machineSection(r.name, r.depth);
      before += 1;
      return [r.kind === "group" ? this.groupHeader(r, t, collapsed) : this.ungroupedHeader(r, t, collapsed)];
    });
  }

  // nerd-herd: Herdr's own order, this computer first then machines by name; a subclass overrides it.
  layoutRows(remote) {
    return [null, ...remote].map((name) => ({ kind: "machine", name, depth: 0 }));
  }
  groupHeader() { return div(); }
  ungroupedHeader() { return div(); }
  headerTools() { return div(); }
  belowHeader() { return div(); }`,
);
replace(
  `        .when(!collapsed, el => el.child("Spaces"))
        .child(div().id("space-new")`,
  `        .when(!collapsed, el => el.child(div().flex_1().child("Spaces")))
        .when(!collapsed, el => el.child(this.headerTools(t, collapsed)))
        .child(div().id("space-new")`,
);
replace(
  `      .child(v_flex().flex_1().min_h(0).px(collapsed ? 0 : 8).pb(14)`,
  `      .when(!collapsed, el => el.child(this.belowHeader(t, collapsed)))
      .child(v_flex().flex_1().min_h(0).px(collapsed ? 0 : 8).pb(14)`,
);

replace(
  "      const items = [cell(head), ...guidance,",
  "      // nerd-herd: the machine row passes through machineHead(), which marks it when it has keyboard focus.\n      const items = [cell(this.machineHead(m, head, t)), ...guidance,",
);
replace(
  "  groupHeader() { return div(); }",
  "  groupHeader() { return div(); }\n  machineHead(_m, head) { return head; }\n  spaceIndent() { return 0; }",
);

replace(
  '          .on_click(() => run("space.new")).child(svg("mods/workspace-chrome/plus.svg").size(14))))',
  '          // nerd-herd: a tooltip names the button.\n          .tooltip("New space").on_click(() => run("space.new")).child(svg("mods/workspace-chrome/plus.svg").size(14))))',
);

const header = `// Vendored from Herdr 0.1.16's shipped Spaces mod (~/.config/herdr-app/mods/spaces/main.js),
// Copyright Herdr authors, Apache License 2.0 (/Applications/Herdr.app/Contents/Resources/LICENSE).
// Generated by scripts/vendor-spaces.ts; edit that script, not this file. nerd-herd changes, marked
// "nerd-herd:": the class is exported for subclassing; the machine sections follow layoutRows()
// (groups interleaved, sections indented by depth, a machine's spaces indented by
// spaceIndent()); and the header has headerTools() and
// belowHeader() hooks. Herdr's guide: duplicate a shipped mod before editing. Before those
// changes, the patches in patches/spaces/ are applied in file-name order; each names its source.

`;
await Bun.write(target, header + text);
console.log(`vendored ${target}`);
