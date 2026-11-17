/** FNV-1a over the bytes from a starting value, in unsigned 32-bit arithmetic. */
const fnv1a32 = (bytes: Uint8Array, start: number): number => {
  let h = start;
  for (const b of bytes) h = Math.imul(h ^ b, 0x01000193) >>> 0;
  return h >>> 0;
};
const hex8 = (n: number): string => n.toString(16).padStart(8, "0");

/**
 * 16 hex digits naming a banner file by its bytes: FNV-1a with its standard start, then again
 * from a second start. Only 32-bit integer steps, which every JavaScript engine computes alike.
 * (A BigInt version gave a signed name inside Herdr: the 2026-11-17 production-path probe.)
 */
export const fileHash = (bytes: Uint8Array): string =>
  hex8(fnv1a32(bytes, 0x811c9dc5)) + hex8(fnv1a32(bytes, 0x9e3779b9));
