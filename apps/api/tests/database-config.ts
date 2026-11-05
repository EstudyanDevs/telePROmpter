export function validateTestDatabase(environment: NodeJS.ProcessEnv) {
  if (!environment.TEST_DATABASE_URL) throw new Error("Database tests require TEST_DATABASE_URL")
  const url = new URL(environment.TEST_DATABASE_URL)
  if (url.pathname !== "/ci" || environment.TEST_DATABASE_URL === environment.DATABASE_URL) {
    throw new Error("Database tests must use the isolated ci database")
  }
  if (environment.CI && (!environment.NEON_CI_BRANCH_ID
    || url.hostname !== environment.NEON_CI_TEST_HOST)) {
    throw new Error("CI database must match the provisioned Neon branch")
  }
}
