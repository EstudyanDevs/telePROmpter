import { readdirSync } from "node:fs"
import { validateTestDatabase } from "../database-config.js"

const databaseTests = readdirSync("tests/integration/database", { recursive: true })
  .some((file) => /\.test\.tsx?$/.test(String(file)))

if (databaseTests) validateTestDatabase(process.env)
