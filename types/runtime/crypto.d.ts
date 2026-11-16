// Herdr's mod runtime has a global crypto.randomUUID() (checked with `herdr-app check`, 2026-11-16),
// but its type files declare only the "crypto" module. Bun's types declare the global for the rest.
declare const crypto: { randomUUID(): string };
