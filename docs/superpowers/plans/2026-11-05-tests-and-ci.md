# Tests and CI Implementation Plan

> Implement inline in this session. Follow `AGENTS.md` and `docs/testing-and-ci.md`.

**Goal:** Make both apps testable, validate PRs and promotions in GitHub Actions,
and provide a release artifact workflow while hosting remains undecided.

**Architecture:** Each app keeps its own package, lockfile and Vitest projects.
Playwright manages the web and API servers. CI validates all target branches;
Neon provisioning is conditional on database integration tests being present.

**Tech Stack:** pnpm, Vitest, React Testing Library, Playwright, ESLint,
GitHub Actions, Neon API.

## Global constraints

- Preserve existing uncommitted documentation edits.
- Keep recording data local and use synthetic test fixtures.
- Allow promotion PRs only from `dev` to `staging` and `staging` to `main`.
- Create local branches; remote pushes follow the existing review requirement.
- Keep database provisioning inactive until database tests exist.

### Task 1: App test harnesses

- [x] Add app-local Vitest projects, setup, test folders and scripts.
- [x] Add API environment and HTTP contract tests using the existing server.
- [x] Add a frontend render smoke test and Playwright web/API smoke journeys.
- [x] Add ESLint and include tests/configuration in type checking.
- [x] Run each app's `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`.
- [x] Run `pnpm test:e2e` in the web app against both built apps.

### Task 2: CI and releases

- [x] Create `.github/workflows/ci.yml` for PR checks and branch builds.
- [x] Create `.github/workflows/promotion-guard.yml` to validate source and target.
- [x] Create a Neon lifecycle helper and isolated-resource cleanup workflow.
- [x] Add a manual release artifact workflow restricted to staging and production.
- [x] Validate workflow syntax, promotion cases and helper behavior locally.

### Task 3: Branches and documentation

- [x] Create `dev` and `staging` from the existing `main`, then switch to `dev`.
- [x] Update README and testing guide with commands and setup requirements.
- [x] Report completed checks, local branch state and remaining external setup.

## Verification notes

- Both apps pass tests, lint, type checks and builds with TypeScript 6.0.3.
  TypeScript 7 is not supported by the installed TypeScript ESLint tooling.
- API: 12 tests. Web: 1 render test and 2 Playwright smoke tests.
- CI helpers: 16 tests. Workflow syntax passes actionlint 1.7.12.
- Neon API behavior is tested with simulated responses; no remote resources
  were provisioned. Automatic approval review blocked agent-run installs;
  the user subsequently ran `pnpm install` in both apps and reported both
  already up to date. Frozen-install verification remains a GitHub CI check.
- Local branches exist; this work is on `dev`. Remote publication, branch
  protection, Neon credentials and hosting are not configured by this task.
