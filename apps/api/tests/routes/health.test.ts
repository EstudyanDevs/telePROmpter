import { describe, expect, it } from "vitest"
import { app } from "../../src/app.js"

describe("health route", () => {
  it("reports API availability as JSON", async () => {
    const response = await app.request("/health")
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("application/json")
    expect(await response.json()).toEqual({ status: "ok" })
  })

  it("returns 404 for an unknown route", async () => {
    expect((await app.request("/missing")).status).toBe(404)
  })
})
