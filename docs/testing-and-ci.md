# Testing and CI/CD

These conventions adapt SIC-APP's Vitest projects, reusable fakes, isolated
integration tests, Playwright smoke tests and guarded branch promotions to
TelePROmpter. This is a target design; test tooling, GitHub Actions, branch
protection and hosting must be configured separately.

## Test layout

Create these folders and configuration files when implementing their tests.

```text
apps/
├── api/
│   ├── tests/
│   │   ├── routes/               # HTTP contracts through the Hono app
│   │   ├── middleware/           # Validation and request behavior
│   │   ├── services/             # Business behavior with external fakes
│   │   ├── lib/                  # Server utility behavior
│   │   ├── integration/          # Real persistence and service boundaries
│   │   ├── fakes/                # Reusable implementations of external ports
│   │   ├── fixtures/             # Deterministic script and sync inputs
│   │   └── setup.ts              # Integration lifecycle and isolation
│   └── vitest.config.ts
└── web/
    ├── tests/
    │   ├── features/             # scripts/, prompter/, recordings/, settings/
    │   ├── components/           # Shared interactive UI behavior
    │   ├── platform/             # Storage, media, speech and display adapters
    │   ├── lib/                  # Shared frontend utility behavior
    │   ├── integration/          # Repository, queue and feature interactions
    │   ├── fakes/                # Browser API and transport substitutes
    │   ├── fixtures/             # Script text and small synthetic media samples
    │   ├── e2e/                  # Playwright browser journeys
    │   └── setup.ts              # Integration lifecycle and isolation
    ├── vitest.config.ts
    └── playwright.config.ts
```

Use `.test.ts` or `.test.tsx` for Vitest and `.spec.ts` for Playwright. Mirror
the source path within the appropriate test area. Keep Playwright specs out of
Vitest discovery.

## Test behavior and isolation

- Split Vitest into named `unit` and `integration` projects. Unit tests run in
  parallel without live network or server database access. Integration suites
  exercise real boundaries; serialize only suites that share mutable resources.
- Use the Node environment for API tests and a DOM environment for frontend
  component tests. Use React Testing Library for user-visible component behavior.
- Assert observable outcomes: returned data, persisted state, HTTP responses and
  user interactions. Add regression coverage for consequential bug fixes; avoid
  tests that only repeat implementation details or verify static scaffolding.
- Prefer reusable fakes at storage, media and network boundaries. Keep domain
  logic real. A fake tests the consumer's behavior; add integration or browser
  coverage for the real adapter where platform behavior matters.
- Use deterministic timestamps, IDs and fixtures. Reset stores, query caches,
  IndexedDB databases, fake state and timers between tests; close connections
  and release media resources afterward.
- For server persistence tests, use the per-run Neon database described below.
  Cleanup may operate only on that test resource.
- Fail CI when required integration configuration is missing. Local skips must
  be explicit and reported; a skipped suite is not evidence of a passing check.

## Throwaway Neon database

Use a new Neon branch for each CI run attempt, following SIC-APP's lifecycle.
Implement creation and deletion in `.github/scripts/neon-ci-database.sh` when
adding the database-backed workflow. Neon supports isolated branches and
per-branch database creation through its API:
[branch API](https://api-docs.neon.tech/reference/createprojectbranch),
[database API](https://api-docs.neon.tech/reference/createprojectbranchdatabase).

1. Name the branch `ci-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}`. Parallel jobs
   that require independent database state also need distinct job suffixes.
2. Use `NEON_API_KEY` from GitHub Actions secrets and `NEON_PROJECT_ID` from
   repository variables. Keep credentials masked and connection URLs out of logs.
   Provision only in trusted workflow contexts with secrets available; never run
   untrusted pull-request code with privileged secrets via `pull_request_target`.
3. Create the branch and its read/write endpoint. Record the returned branch ID
   as a step output immediately, so later provisioning failures can still trigger
   cleanup. Wait for Neon operations with bounded retries and timeouts.
4. Create a fresh, empty database named `ci` on that branch. A normal branch can
   inherit parent data; tests must connect specifically to the new `ci` database,
   never an inherited application database. Prefer a dedicated CI parent with
   synthetic data so provisioning does not copy production records.
5. Export a direct `MIGRATE_DATABASE_URL` and a pooled `TEST_DATABASE_URL` for
   that database. Apply the repository's migrations using the direct URL and
   seed deterministic test fixtures. Select a migration tool when persistence is
   implemented; this convention does not prescribe an ORM.
6. Point integration tests explicitly at `TEST_DATABASE_URL`. Check the database
   name and run-specific endpoint against the provisioning outputs before any
   destructive cleanup. Leave development, staging and production URLs untouched.
7. Keep the branch alive through its last database consumer, including API-backed
   Playwright tests if present. Then delete exactly the recorded branch ID using
   an `always()` cleanup step, even when provisioning, migration or tests fail.
8. Add expiration or a scheduled cleanup for stale CI branches left by hard
   cancellations or runner loss. Restrict cleanup to identifiable CI-owned
   resources. Report provisioning and cleanup failures clearly.

CI must fail when database integration tests are required but provisioning or
configuration is missing. Do not turn that failure into a silently skipped suite.
Database-free unit tests need no Neon branch.

## TelePROmpter coverage

Cover these behaviors as their features are implemented:

- Scripts: create, edit, import validation, export and persistence after reload.
- Prompter: play/pause, speed changes, scroll boundaries and preference changes.
- Recording: permission rejection, unsupported media APIs, start/stop, resource
  cleanup, local playback and export. Assert that recording data stays local.
- Storage and sync: IndexedDB migrations, offline writes, queue persistence,
  retry/reconnect, duplicate operation handling and documented conflict behavior.
- PWA: a production build loads offline after an initial cached visit; service
  worker updates preserve local scripts and recordings.

Use controlled browser media inputs for automated recording tests. Keep manual
device checks for browser support gaps visible in validation notes.

## Playwright

- Start with Chromium smoke tests. Add browsers as supported behavior requires.
- Let Playwright own its test servers; use dedicated ports and
  `reuseExistingServer: false`. Start the API when a journey exercises it.
- In CI, build first and serve the web production output with Vite preview.
  Test service-worker behavior against that build, with PWA registration enabled.
- Reject focused tests in CI with `forbidOnly`. Use no retries locally and at
  most two in CI; capture traces on the first retry. Investigate flaky failures.
- Use fresh browser contexts and role-based locators. Keep browser tests focused
  on user journeys rather than CSS classes or internal component structure.

## Continuous integration

When implementing `.github/workflows/ci.yml`:

1. Run on feature pull requests targeting `dev`. Required checks must report for
   documentation-only changes too; avoid workflow path filters that strand them.
2. Pin a supported Node version and use the repository's pnpm version. Install
   with `--frozen-lockfile`; cache pnpm using the lockfile paths actually present.
3. Provision the throwaway Neon database when database tests are present, using
   the lifecycle above. Give other integration resources the same run isolation.
4. Run unit and integration tests, lint, typecheck and builds for both apps and
   executable shared packages. Add the required scripts when implementing CI;
   CI must fail if an expected check is unavailable.
5. Run Playwright against production builds. Cache browser downloads by
   Playwright version while installing required OS libraries on each runner.
6. Upload available failure reports and traces even when tests fail. Check that
   browser bundles do not expose server secrets; Vite's `VITE_` variables are public.

Cancel superseded runs for the same pull request. Parallel runs must have isolated
resources. Keep workflow permissions minimal and pass untrusted branch names
through environment variables rather than interpolating them into shell code.

## Promotion and deployment

- Use the branch mapping in `AGENTS.md`: `dev` is development, `staging` is
  staging, and `main` is production. Feature, fix and maintenance PRs target `dev`.
- Allow only same-repository `dev -> staging` and `staging -> main` promotion
  PRs. Route fixes through the same sequence.
- Add a promotion guard for PRs targeting `staging` and `main`. Accept only the
  corresponding source branch in the same repository. Recheck when a PR is
  opened, updated, reopened or retargeted.
- Configure branch protection to require the appropriate CI and promotion
  checks and PRs instead of direct pushes. Require feature branches to be up to
  date with `dev`.
- Keep full CI on promotion PRs unless automation can prove that the promoted
  source and resulting tree already passed the required checks. A source-branch
  name alone does not prove that the merge result was tested.
- Bind staging and production deployments to their corresponding protected
  branches when hosting is selected. Use separate environment configuration and
  test data. Deploy only revisions whose required checks passed.
- Keep deployment steps and migration commands in runbooks as infrastructure is
  implemented. Neon CI isolation is the chosen database testing convention;
  SIC-APP's Next.js, Prisma and hosting setup do not prescribe this app's stack.
