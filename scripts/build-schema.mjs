import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Bakes db/tenant-schema.sql into a TypeScript module.
 *
 * The setup wizard has to show a new owner the exact SQL to paste into their
 * own Supabase project, which means the text must survive into the deployed
 * bundle. Reading it from disk at request time works locally and then fails on
 * Vercel, where only traced files ship. Generating a module makes the SQL an
 * ordinary import that the bundler cannot lose.
 *
 * db/tenant-schema.sql stays the single source of truth -- edit that, never
 * the generated file.
 */
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const sql = readFileSync(join(root, "db", "tenant-schema.sql"), "utf8");

// Inside a template literal only these two sequences can break out.
const escaped = sql.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

const out = `// GENERATED FILE -- do not edit.
// Source: db/tenant-schema.sql   Regenerate: npm run build:schema

export const TENANT_SCHEMA_SQL = \`${escaped}\`;
`;

const target = join(root, "src", "lib", "tenant", "schema-sql.generated.ts");
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, out, "utf8");

console.log(
  `build-schema: wrote ${target} (${sql.length} chars of SQL)`
);
