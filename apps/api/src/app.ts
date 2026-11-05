import { Hono } from "hono"
import { logger } from "./logger.js"

export const app = new Hono()

app.get("/health", (c) => c.json({ status: "ok" }))

app.onError((err, c) => {
  logger.error({ err }, "Request failed")
  return c.json({ error: "Internal server error" }, 500)
})
