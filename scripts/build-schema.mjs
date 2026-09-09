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

/**
 * The schema's own version, read out of the statement that records it rather
 * than kept beside it.
 *
 * Two numbers that are supposed to agree will eventually not, and this pair
 * would fail silently in the direction that matters: the app would compare
 * every department against a version no department has, and tell all of them
 * to re-run a file that is already installed. Taking it from the SQL means
 * there is one number, and the build stops rather than guessing when the
 * statement is missing or has been edited into a shape this cannot read.
 */
const stamp = /insert\s+into\s+public\.schema_version\s*\([^)]*\)\s*values\s*\(\s*true\s*,\s*(\d+)\s*\)/i.exec(sql);
if (!stamp) {
  throw new Error(
    "build-schema: no version stamp in db/tenant-schema.sql. It must end with " +
      "`insert into public.schema_version (id, version) values (true, <n>)`, " +
      "and <n> has to go up whenever the file changes."
  );
}
const version = Number(stamp[1]);

// Inside a template literal only these two sequences can break out.
const escaped = sql.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

const out = `// GENERATED FILE -- do not edit.
// Source: db/tenant-schema.sql   Regenerate: npm run build:schema

/**
 * The version db/tenant-schema.sql currently installs.
 *
 * Import this from SERVER code only, and pass the number down as a prop. It
 * lives in the same module as the whole schema text below, so a client
 * component that imports it risks shipping ${Math.round(sql.length / 1024)} kB
 * of SQL to every visitor.
 */
export const TENANT_SCHEMA_VERSION = ${version};

export const TENANT_SCHEMA_SQL = \`${escaped}\`;
`;

const target = join(root, "src", "lib", "tenant", "schema-sql.generated.ts");
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, out, "utf8");

console.log(
  `build-schema: wrote ${target} (schema version ${version}, ${sql.length} chars of SQL)`
);
