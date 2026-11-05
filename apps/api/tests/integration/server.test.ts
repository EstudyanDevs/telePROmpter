import type { ServerType } from "@hono/node-server"
import { serve } from "@hono/node-server"
import { afterAll, beforeAll, expect, it } from "vitest"
import { app } from "../../src/app.js"

let server: ServerType | undefined
let baseURL: string

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = serve({ fetch: app.fetch, port: 0, hostname: "127.0.0.1" }, (info) => {
      baseURL = `http://127.0.0.1:${info.port}`
      resolve()
    })
  })
})

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    if (!server) return resolve()
    server.close((error) => error ? reject(error) : resolve())
  })
})

it("serves the Hono app through a real Node HTTP server", async () => {
  const response = await fetch(`${baseURL}/health`)
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ status: "ok" })
})
