// Herdr's mod runtime has a global crypto with randomUUID() and getRandomValues() (checked with
// `herdr-app check`, 2026-11-16 and 2026-11-17), but its type files declare only the "crypto" module.
// Bun's types declare the global for the rest.
declare const crypto: {
  randomUUID(): string;
  getRandomValues<T extends Uint8Array | Uint32Array>(array: T): T;
};
