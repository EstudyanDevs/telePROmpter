import { expect, it } from "vitest"
import { validateTestDatabase } from "../database-config.js"

it("rejects missing database configuration instead of silently skipping", () => {
  expect(() => validateTestDatabase({})).toThrow("TEST_DATABASE_URL")
})

it("rejects application databases and unexpected CI hosts", () => {
  expect(() => validateTestDatabase({
    TEST_DATABASE_URL: "postgresql://fixture@example.invalid/production",
  })).toThrow("isolated ci database")
  expect(() => validateTestDatabase({
    CI: "true",
    TEST_DATABASE_URL: "postgresql://fixture@wrong.invalid/ci",
    NEON_CI_BRANCH_ID: "br-test",
    NEON_CI_TEST_HOST: "expected.invalid",
  })).toThrow("provisioned Neon branch")
})

it("accepts the run-specific CI database", () => {
  expect(() => validateTestDatabase({
    CI: "true",
    TEST_DATABASE_URL: "postgresql://fixture@expected.invalid/ci",
    NEON_CI_BRANCH_ID: "br-test",
    NEON_CI_TEST_HOST: "expected.invalid",
  })).not.toThrow()
})
