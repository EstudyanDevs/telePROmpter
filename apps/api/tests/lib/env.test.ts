import { beforeEach, describe, expect, it, vi } from "vitest"

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv("NODE_ENV", "test")
  vi.stubEnv("LOG_LEVEL", "silent")
  vi.stubEnv("PORT", undefined)
})

describe("server environment", () => {
  it("defaults the port when none is supplied", async () => {
    const { env } = await import("../../src/env.js")
    expect(env.PORT).toBe(3000)
  })

  it("parses a configured port", async () => {
    vi.stubEnv("PORT", "4321")
    const { env } = await import("../../src/env.js")
    expect(env.PORT).toBe(4321)
  })

  it.each(["invalid", "0", "65536", "1.5"])("rejects invalid port %s", async (port) => {
    vi.stubEnv("PORT", port)
    await expect(import("../../src/env.js")).rejects.toThrow()
  })
})
