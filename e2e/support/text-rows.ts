// Turns read-text's output ("<left> <top> <right>\t<text>" per block, positions as fractions of the
// image) into the lines a person reads: top to bottom, blocks on one row joined left to right.

/** One line as drawn: its text, and its left edge in points from the window's left. */
export interface PlacedLine {
  readonly text: string;
  readonly left: number;
}

interface Block {
  readonly left: number;
  readonly top: number;
  readonly text: string;
}

const blocksIn = (out: string): Block[] =>
  out
    .split("\n")
    .map((line) => line.split("\t"))
    .flatMap(([pos, text]) => {
      const [left, top] = (pos ?? "").split(" ").map(Number);
      return left !== undefined && top !== undefined && !Number.isNaN(top) && text
        ? [{ left, top, text: text.trim() }]
        : [];
    })
    .sort((a, b) => a.top - b.top);

/** Every block's text, top to bottom. */
export const linesIn = (out: string): string[] => blocksIn(out).map((b) => b.text);

/**
 * The rows left of `edge` (a fraction of the image), each placed in points: blocks drawn on one row
 * (tops within a third of a row) are one line, read left to right.
 */
export const rowsIn = (out: string, edge: number, points: number): PlacedLine[] => {
  const rows: { top: number; blocks: Block[] }[] = [];
  for (const b of blocksIn(out).filter((b) => b.left < edge)) {
    const row = rows.at(-1);
    if (row && b.top - row.top < 0.008) row.blocks.push(b);
    else rows.push({ top: b.top, blocks: [b] });
  }
  return rows.map((r) => {
    const sorted = r.blocks.sort((a, b) => a.left - b.left);
    return { text: sorted.map((b) => b.text).join(" "), left: (sorted[0]?.left ?? 0) * points };
  });
};
