import assert from "node:assert/strict"
import { test } from "node:test"
import { forbiddenEnvironmentNames } from "./check-browser-env.mjs"

test("allows public API URLs and rejects server secret references", () => {
  assert.deepEqual(forbiddenEnvironmentNames("import.meta.env.VITE_API_URL"), [])
  assert.deepEqual(forbiddenEnvironmentNames("process.env.DATABASE_URL"), ["DATABASE_URL"])
  assert.deepEqual(forbiddenEnvironmentNames("import.meta.env['VITE_NEON_API_KEY']"), ["VITE_NEON_API_KEY"])
})
