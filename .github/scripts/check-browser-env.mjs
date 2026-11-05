import { readdir, readFile } from "node:fs/promises"
import { pathToFileURL } from "node:url"

export function forbiddenEnvironmentNames(source) {
  const names = [...source.matchAll(/(?:process\.env|import\.meta\.env)(?:\.([A-Z][A-Z0-9_]*)|\[['"]([A-Z][A-Z0-9_]*)['"]\])/g)]
    .map((match) => match[1] ?? match[2])
  return names.filter((name) => /^(?:NEON_API_KEY|DATABASE_URL|MIGRATE_DATABASE_URL|TEST_DATABASE_URL)$/.test(name)
    || /^VITE_.*(?:SECRET|PASSWORD|PRIVATE_KEY|DATABASE_URL|NEON_API_KEY)/.test(name))
}

async function checkDirectory(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const file = `${path}/${entry.name}`
    if (entry.isDirectory()) await checkDirectory(file)
    else if (/\.(?:ts|tsx|js|mjs)$/.test(entry.name)) {
      const forbidden = forbiddenEnvironmentNames(await readFile(file, "utf8"))
      if (forbidden.length) throw new Error(`Server environment reference in ${file}: ${forbidden.join(", ")}`)
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  checkDirectory("apps/web/src").then(() => console.log("Browser environment references checked"))
    .catch((error) => { console.error(error.message); process.exitCode = 1 })
}
