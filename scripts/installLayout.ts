// The jj mods the install shows in the nerd-herd layout (scripts/herdr-install.ts). herdr-app-jj's
// jj-changes and jj-status replace Herdr's Changes panel and status bar; each one is named only when
// the Herdr home has its mod folder, so the layout never names a mod the home lacks. The block ids
// stay: the tab bar's Changes button opens the block whose id is "changes".
const swaps = [
  { herdr: "changes", jj: "jj-changes" },
  { herdr: "workspace-status", jj: "jj-status" },
];

export function withJjMods(layout: string, homeHas: (mod: string) => boolean): string {
  return swaps
    .filter((s) => homeHas(s.jj))
    .reduce(
      (text, s) => text.replace(new RegExp(`("mod":\\s*)"${s.herdr}"`, "g"), `$1"${s.jj}"`),
      layout,
    );
}
