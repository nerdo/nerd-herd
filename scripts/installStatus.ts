// The status bar the nerd-herd layout shows: nerd-herd's copy of the one it would otherwise show
// (Herdr's workspace-status, or herdr-app-jj's jj-status), with Dismiss in its center.
const copies = [
  { from: "workspace-status", to: "nerd-herd-status" },
  { from: "jj-status", to: "nerd-herd-jj-status" },
];

export const withNerdHerdStatus = (layout: string): string =>
  copies.reduce(
    (text, c) => text.replace(new RegExp(`("mod":\\s*)"${c.from}"`, "g"), `$1"${c.to}"`),
    layout,
  );
