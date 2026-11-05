import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { test } from "node:test"

function firstRunScript(file) {
  const workflow = readFileSync(new URL(`../workflows/${file}`, import.meta.url), "utf8")
  const block = workflow.match(/        run: \|\n([\s\S]*?)(?=      - |$)/)?.[1]
  assert.ok(block, "Expected a workflow shell guard")
  return block.split("\n").map((line) => line.replace(/^          /, "")).join("\n")
}

const promotionGuard = firstRunScript("promotion-guard.yml")
for (const [base, head, sameRepo, allowed] of [
  ["staging", "dev", true, true],
  ["main", "staging", true, true],
  ["main", "dev", true, false],
  ["staging", "feature/scripts", true, false],
  ["staging", "dev", false, false],
  ["main", "staging", false, false],
]) {
  test(`promotion ${head} -> ${base} (same repository: ${sameRepo})`, () => {
    const result = spawnSync("bash", ["-e", "-o", "pipefail", "-c", promotionGuard], {
      env: { ...process.env, BASE_REF: base, HEAD_REF: head,
        THIS_REPO: "example/teleprompter", HEAD_REPO: sameRepo ? "example/teleprompter" : "fork/teleprompter" },
    })
    assert.equal(result.status === 0, allowed)
  })
}

const releaseGuard = firstRunScript("release-artifacts.yml")
for (const [environment, branch, type, allowed] of [
  ["staging", "staging", "branch", true],
  ["production", "main", "branch", true],
  ["production", "dev", "branch", false],
  ["staging", "main", "branch", false],
  ["production", "main", "tag", false],
]) {
  test(`release ${environment} from ${type} ${branch}`, () => {
    const result = spawnSync("bash", ["-e", "-o", "pipefail", "-c", releaseGuard], {
      env: { ...process.env, TARGET_ENVIRONMENT: environment, BRANCH: branch, REF_TYPE: type },
    })
    assert.equal(result.status === 0, allowed)
  })
}
