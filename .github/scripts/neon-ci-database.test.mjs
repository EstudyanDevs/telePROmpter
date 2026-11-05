import assert from "node:assert/strict"
import { test } from "node:test"
import { cleanStaleBranches, createDatabase, deleteDatabaseBranch } from "./neon-ci-database.mjs"

test("records the branch before a database provisioning failure", async () => {
  let recorded
  const request = async (method, path) => {
    if (method === "POST" && path === "/branches") {
      return { branch: { id: "br-test" }, connection_uris: [{ connection_parameters: { role: "ci" } }] }
    }
    assert.equal(recorded, "br-test")
    throw new Error("Database creation failed")
  }
  await assert.rejects(createDatabase(request, { name: "ci-123-1", parentID: "br-parent" }, {
    branch: async (id) => { recorded = id },
    connections: async () => assert.fail("No URLs should be exported on failure"),
  }), /Database creation failed/)
  assert.equal(recorded, "br-test")
})

test("exports only connections to the empty ci database", async () => {
  const request = async (method, path, body) => {
    if (path === "/branches") return {
      branch: { id: "br-test" }, connection_uris: [{ connection_parameters: { role: "ci" } }],
    }
    if (method === "POST") {
      assert.deepEqual(body, { database: { name: "ci", owner_name: "ci" } })
      return {}
    }
    assert.equal(new URL(path, "https://example.invalid").searchParams.get("database_name"), "ci")
    return { uri: "postgresql://fixture:fixture@example.invalid/ci?sslmode=require" }
  }
  let exported
  await createDatabase(request, { name: "ci-123-1", parentID: "br-parent" }, {
    branch: async () => {}, connections: async (value) => { exported = value },
  })
  assert.equal(new URL(exported.pooled).pathname, "/ci")
  assert.equal(exported.branchID, "br-test")
})

test("refuses to delete a production branch even when given its ID", async () => {
  const request = async (method) => {
    assert.equal(method, "GET")
    return { branch: { id: "br-production", name: "production", parent_id: "br-parent" } }
  }
  await assert.rejects(deleteDatabaseBranch(request, "br-production", "br-parent"), /Refusing/)
})

test("stale cleanup preserves fresh, protected and unrelated branches", async () => {
  const now = Date.parse("2026-11-05T12:00:00Z")
  const old = "2026-11-03T12:00:00Z"
  const branches = [
    { id: "old", name: "ci-123-1", parent_id: "parent", created_at: old },
    { id: "fresh", name: "ci-124-1", parent_id: "parent", created_at: new Date(now).toISOString() },
    { id: "unrelated", name: "ci-125-1", parent_id: "other", created_at: old },
    { id: "protected", name: "ci-126-1", parent_id: "parent", created_at: old, protected: true },
  ]
  const deleted = []
  const request = async (method, path) => {
    if (method === "DELETE") { deleted.push(path); return {} }
    if (path.startsWith("/branches?")) return { branches }
    return { branch: branches.find((branch) => path.endsWith(`/${branch.id}`)) }
  }
  await cleanStaleBranches(request, "parent", now)
  assert.deepEqual(deleted, ["/branches/old"])
})
