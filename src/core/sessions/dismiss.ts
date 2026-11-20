// What dismissing the focused session records: its current turn, as handled, on its own machine
// (hc reaches the machine from the terminal's address, such as desk-client/t1y).
import type { TerminalAddress } from "./doneLedger";

/** The hc arguments that dismiss the focused session; null when it is not under Done. */
export const dismissal = (
  focused: TerminalAddress | null,
  terminals: readonly { readonly address: TerminalAddress; readonly turn: number }[],
  done: ReadonlySet<TerminalAddress>,
): string[] | null => {
  if (focused === null || !done.has(focused)) return null;
  const terminal = terminals.find((t) => t.address === focused);
  return terminal ? ["label", focused, `nerd-herd.handled=${terminal.turn}`] : null;
};
