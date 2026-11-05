import { appendFile } from "node:fs/promises"
import { pathToFileURL } from "node:url"

const ciName = /^ci-\d+-\d+$/
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitForOperations(request, response) {
  for (const operation of response.operations ?? []) {
    let finished = false
    for (let attempt = 0; attempt < 60; attempt++) {
      const { operation: current } = await request("GET", `/operations/${operation.id}`)
      if (current.status === "finished") { finished = true; break }
      if (["failed", "error", "cancelled"].includes(current.status)) {
        throw new Error(`Neon operation ${operation.id} failed`)
      }
      await sleep(2000)
    }
    if (!finished) throw new Error(`Neon operation ${operation.id} timed out`)
  }
}

export async function createDatabase(request, { name, parentID }, output) {
  if (!ciName.test(name) || !parentID) throw new Error("Expected a run-specific CI name and parent")
  const created = await request("POST", "/branches", {
    branch: { name, parent_id: parentID },
    endpoints: [{ type: "read_write" }],
  })
  const branchID = created.branch?.id
  if (!branchID) throw new Error("Neon did not return a branch ID")
  // Record before polling or database creation so failure cleanup can find it.
  await output.branch(branchID)
  await waitForOperations(request, created)
  const role = created.connection_uris?.[0]?.connection_parameters?.role
  if (!role) throw new Error("Neon did not return a connection role")
  const database = await request("POST", `/branches/${branchID}/databases`, {
    database: { name: "ci", owner_name: role },
  })
  await waitForOperations(request, database)
  const query = new URLSearchParams({ branch_id: branchID, database_name: "ci", role_name: role })
  const direct = await request("GET", `/connection_uri?${query}`)
  query.set("pooled", "true")
  const pooled = await request("GET", `/connection_uri?${query}`)
  for (const uri of [direct.uri, pooled.uri]) {
    if (!uri || new URL(uri).pathname !== "/ci") throw new Error("Expected the empty CI database")
  }
  await output.connections({ direct: direct.uri, pooled: pooled.uri, branchID })
}

export function isOwnedBranch(branch, parentID) {
  return ciName.test(branch.name) && branch.parent_id === parentID
    && !branch.default && !branch.protected
}

export async function deleteDatabaseBranch(request, branchID, parentID) {
  if (!branchID || !parentID) throw new Error("Branch ID and CI parent are required")
  let branch
  try {
    ;({ branch } = await request("GET", `/branches/${encodeURIComponent(branchID)}`))
  } catch (error) {
    if (error.status === 404) return
    throw error
  }
  if (!isOwnedBranch(branch, parentID)) throw new Error("Refusing to delete a branch outside this CI parent")
  await request("DELETE", `/branches/${encodeURIComponent(branchID)}`)
}

export async function cleanStaleBranches(request, parentID, now = Date.now()) {
  let cursor
  const seen = new Set()
  do {
    const query = new URLSearchParams({ limit: "100" })
    if (cursor) query.set("cursor", cursor)
    const page = await request("GET", `/branches?${query}`)
    for (const branch of page.branches ?? []) {
      if (isOwnedBranch(branch, parentID) && now - Date.parse(branch.created_at) > 86_400_000) {
        await deleteDatabaseBranch(request, branch.id, parentID)
      }
    }
    cursor = page.pagination?.cursor
    if (cursor && seen.has(cursor)) throw new Error("Neon pagination did not advance")
    if (cursor) seen.add(cursor)
  } while (cursor)
}

async function main() {
  const required = (key) => {
    if (!process.env[key]) throw new Error(`${key} is required`)
    return process.env[key]
  }
  const token = required("NEON_API_KEY")
  const projectID = required("NEON_PROJECT_ID")
  const parentID = required("NEON_CI_PARENT_ID")
  const base = `https://console.neon.tech/api/v2/projects/${encodeURIComponent(projectID)}`
  const request = async (method, path, body) => {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(30_000),
    })
    if (!response.ok) {
      const error = new Error(`Neon ${method} request failed: HTTP ${response.status}`)
      error.status = response.status
      throw error
    }
    return response.status === 204 ? {} : response.json()
  }
  const command = process.argv[2]
  if (command === "create") {
    const name = `ci-${required("GITHUB_RUN_ID")}-${required("GITHUB_RUN_ATTEMPT")}`
    const outputFile = required("GITHUB_OUTPUT")
    const envFile = required("GITHUB_ENV")
    await createDatabase(request, { name, parentID }, {
      branch: (id) => appendFile(outputFile, `branch_id=${id}\n`),
      connections: async ({ direct, pooled, branchID }) => {
        for (const value of [direct, pooled, decodeURIComponent(new URL(direct).password)]) {
          if (value) process.stdout.write(`::add-mask::${value}\n`)
        }
        await appendFile(envFile, [
          `MIGRATE_DATABASE_URL=${direct}`,
          `TEST_DATABASE_URL=${pooled}`,
          `NEON_CI_BRANCH_ID=${branchID}`,
          `NEON_CI_TEST_HOST=${new URL(pooled).hostname}`,
          "",
        ].join("\n"))
      },
    })
    console.log(`Created throwaway Neon database for ${name}`)
  } else if (command === "delete") {
    await deleteDatabaseBranch(request, required("NEON_BRANCH_ID"), parentID)
    console.log("Deleted throwaway Neon branch")
  } else if (command === "cleanup") {
    await cleanStaleBranches(request, parentID)
    console.log("Stale Neon CI branch cleanup finished")
  } else {
    throw new Error("Usage: node neon-ci-database.mjs create|delete|cleanup")
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1 })
}
