// Type declarations for the custom `figma:asset/*` import scheme
// resolved at build time by the vite plugin in vite.config.ts.

declare module 'figma:asset/*' {
  const src: string;
  export default src;
}
