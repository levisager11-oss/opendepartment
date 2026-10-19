import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("keeps the standalone waitlist migration verbatim in the fresh-install schema", () => {
  const migration = readFileSync("db/migrations/2026-10-19-control-waitlist.sql", "utf8");
  const body = migration.slice(migration.indexOf("*/\n") + 3);
  expect(body).toContain("create or replace function public.join_waitlist");
  expect(readFileSync("db/control-plane.sql", "utf8")).toContain(body);
});
