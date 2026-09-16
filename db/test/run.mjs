import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

// Run the same SQL and role impersonation as run.sh, in isolated PostgreSQL
// WASM instances. No server, credentials, network, or platform shell required.
const readSql = async (path) =>
  (await readFile(new URL(path, import.meta.url), "utf8"))
    .replace(/^\\.*$/gm, ""); // psql output/formatting directives only

/**
 * Each entry gets its own disposable database.
 *
 * The two suites that share one have cost real time twice now, in the way
 * shared fixtures always do: a section demoted the administrator a later
 * section assumed, and another filled the report queue to the cap a later
 * count was asserting against. Both looked like failures of the code under
 * test and were failures of the arrangement above it.
 *
 * Adding a row here is the cheap way out -- a new section that wants to reason
 * about totals, or about who is an administrator, gets a database with nothing
 * in it but the schema. The existing pairs stay together on purpose: they are
 * written against each other's fixtures now, and rewriting them to prove the
 * same things would be motion rather than progress.
 */
let failed = false;
for (const [name, schema, suites] of [
  ["tenant", "../tenant-schema.sql", ["./02-rls-tests.sql", "./04-tenant-security-regressions.sql"]],
  ["control", "../control-plane.sql", ["./03-control-plane-tests.sql", "./05-control-security-regressions.sql"]],
  ["tenant-isolated", "../tenant-schema.sql", ["./06-tenant-isolated.sql"]],
]) {
  const db = new PGlite({ extensions: { pgcrypto } });
  try {
    await db.exec(await readSql("./00-shim.sql"));
    const sql = await readSql(schema);
    await db.exec(sql);
    await db.exec(sql); // Reapplication is the supported upgrade path.
    await db.exec(await readSql("./01-helpers.sql"));
    for (const suite of suites) await db.exec(await readSql(suite));
    const { rows } = await db.query("select * from odtest.report()");
    const failures = rows.filter((row) => row.outcome === "FAIL");
    console.log(`${name}: ${rows.length - failures.length}/${rows.length} assertions passed; schema applied twice`);
    for (const row of failures) console.error(row.name, row.detail);
    failed ||= failures.length > 0;
  } catch (error) {
    failed = true;
    console.error(`${name}: ${error.message}`);
    if (error.where) console.error(error.where);
  } finally {
    await db.close();
  }
}
if (failed) process.exitCode = 1;
