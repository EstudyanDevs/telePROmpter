import { afterEach, vi } from "vitest"

process.env.LOG_LEVEL = "silent"

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.useRealTimers()
})
