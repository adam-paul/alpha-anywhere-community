/**
 * Ambient declaration for Vite's `?raw` import suffix, used by the prompt
 * loader. Mirrors Vite's own `client.d.ts` shape so the package type-checks
 * without declaring a dep on `vite` (which is already in the root workspace).
 */
declare module '*.md?raw' {
  const content: string;
  export default content;
}
