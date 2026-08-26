/**
 * Next declares `*.module.css` but not a plain `*.css`, and TypeScript 5.7
 * started reporting a side-effect import of an undeclared module (TS2882).
 * The one line below is what stands between a clean checkout and
 * `npm run typecheck` failing on `import "./globals.css"` in the root layout.
 */
declare module "*.css";
