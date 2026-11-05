import { serve } from "@hono/node-server"
import { app } from "./app.js"
import { env } from "./env.js"
import { logger } from "./logger.js"

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  logger.info({ port: info.port }, "API listening")
})

server.on("error", (err) => {
  logger.fatal({ err }, "API server failed")
  process.exit(1)
})

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    logger.info({ signal }, "Stopping API")
    server.close((err) => {
      if (err) {
        logger.error({ err }, "API shutdown failed")
        process.exit(1)
      }
    })
  })
}
