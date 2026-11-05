# TelePROmpter development guide

TelePROmpter is a local-first browser teleprompter and PWA. Organize code around
script editing, prompting, recording, settings, and synchronization.

## Directory map

This tree defines where code belongs as the app grows. Create optional folders
when implementing their responsibility; the tree does not imply that every
folder or feature is already implemented.

```text
telePROmpter/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── index.ts          # Node server startup and shutdown
│   │   │   ├── app.ts            # Hono setup, middleware and route registration
│   │   │   ├── env.ts            # Zod-validated server environment
│   │   │   ├── logger.ts         # Pino configuration
│   │   │   ├── middleware/       # Request logging, validation and HTTP concerns
│   │   │   ├── routes/           # HTTP handlers grouped by resource
│   │   │   ├── services/         # Server business logic
│   │   │   │   ├── scripts/      # Script operations when remote storage exists
│   │   │   │   └── sync/         # Sync operations, conflicts and change tracking
│   │   │   └── lib/              # Shared server utilities and integrations
│   │   ├── tests/                # Routes, services, middleware, fakes, integration
│   │   ├── vitest.config.ts      # Unit and integration test projects
│   │   └── tsconfig.json
│   └── web/
│       ├── public/
│       │   └── icons/            # PWA icons served directly
│       ├── src/
│       │   ├── main.tsx          # React bootstrap and global CSS import
│       │   ├── app/              # App composition, providers and layouts
│       │   ├── routes/           # TanStack Router route definitions
│       │   ├── assets/           # Assets imported by application code
│       │   ├── components/
│       │   │   ├── ui/           # Shared shadcn/ui primitives
│       │   │   └── magicui/      # Shared Magic UI components
│       │   ├── features/
│       │   │   ├── scripts/      # Library, editor and script import/export
│       │   │   ├── prompter/     # Reading view, scrolling and playback controls
│       │   │   ├── recordings/   # Capture controls, local playback and export
│       │   │   └── settings/     # Reading, device and application preferences
│       │   ├── hooks/            # Hooks used by multiple features
│       │   ├── lib/              # Shared frontend utilities
│       │   ├── platform/
│       │   │   ├── storage/      # Native IndexedDB schema and repositories
│       │   │   ├── sync/         # Client sync engine, queue and transport
│       │   │   ├── media/        # MediaDevices and MediaRecorder adapters
│       │   │   ├── speech/       # Web Speech API adapter
│       │   │   └── display/      # Fullscreen and Screen Wake Lock adapters
│       │   ├── pwa/              # Service worker, registration and update flow
│       │   └── styles/           # Tailwind entry, theme and global styles
│       ├── tests/                # Features, platform, components, fakes, E2E
│       ├── vitest.config.ts      # Unit and integration test projects
│       ├── playwright.config.ts  # Browser tests and test server lifecycle
│       ├── components.json       # shadcn aliases and component configuration
│       ├── index.html
│       ├── tsconfig.json
│       └── vite.config.ts
├── packages/
│   └── shared/
│       └── src/                  # Schemas and contracts consumed by both apps
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                # Install, tests, lint, typecheck, builds, E2E
│   │   └── promotion-guard.yml   # Validate dev -> staging -> main promotions
│   └── scripts/                 # CI resource setup and cleanup when needed
├── docs/                         # Architecture and project documentation
├── AGENTS.md
└── README.md
```

## Frontend placement

- Keep route files focused on navigation, route data loading and composing feature views.
- Keep providers and application wiring in `app/`.
- Keep a feature's components, hooks, services, stores, queries, helpers and types
  inside its feature folder. Add only the subfolders that feature needs.
- Put Zustand stores in the owning feature's `stores/`. Put TanStack Query hooks
  and query options in its `queries/`.
- Use frontend feature services for workflows and API calls. Browser API details
  and IndexedDB access belong in `platform/` adapters and repositories.
- Move code to shared `components/`, `hooks/` or `lib/` when multiple features
  need the same behavior. Keep feature-specific code with its owner.
- Keep animation code with the component it animates. Add reusable Magic UI
  components to `components/magicui/`.
- Put frontend tests in `apps/web/tests/`, mirroring the owning source area.
  Use the testing layout below instead of introducing a second test convention.

## API placement

- Keep `index.ts` responsible for the server process and `app.ts` responsible for
  composing the Hono application.
- Put endpoints in resource-named route files such as `routes/scripts.ts`,
  `routes/sync.ts` and `routes/health.ts` as those endpoints are implemented.
- Routes parse and validate HTTP input, call services and map results to responses.
- Put reusable request behavior in `middleware/` and business operations in
  `services/`. Introduce `services/scripts/` or `services/sync/` when that domain
  needs multiple files; a small service can begin as a single named file.
- Keep configuration and logger setup in the existing `env.ts` and `logger.ts`.
- Group API tests under `apps/api/tests/` by `routes/`, `middleware/`, `services/`
  or `lib/`. Put integration tests in a separate `tests/integration/` suite.

## Data boundaries

- IndexedDB is the frontend's persistent source of truth. TanStack Query caches
  asynchronous data; Zustand owns transient shared UI state.
- Keep recording blobs and recording files on the client. Exclude them from API
  upload and sync payloads.
- Keep client synchronization in `platform/sync/` and server synchronization in
  API services. Keep service-worker caching and lifecycle code in `pwa/`.
- Put shared Zod schemas and inferred types in `packages/shared/src/` when both
  apps consume them. Keep browser and server runtime code in their owning app.
- Validate external data at its boundary: imports, API requests and sync messages.

## Folder maintenance

- Use names from TelePROmpter's responsibilities when adding domains.
- Add `.gitkeep` to intentionally empty scaffold folders. Remove it when the
  folder receives its first real file.
- Exclude generated output such as `dist/` and installed dependencies from Git.
- Use pnpm. Read the affected app's `package.json` for available commands; run
  its build after changing application code or build configuration.

## Tests and CI/CD

Use Vitest for unit and integration tests, reusable fakes for external boundaries,
and Playwright for browser journeys. Keep each app's tests under its own `tests/`
directory. Shared packages own their tests when they gain executable behavior.

Database-backed CI tests use a throwaway Neon branch with an empty `ci` database
per run attempt. Apply migrations there and delete the branch after its last
consumer finishes, including failure paths. Follow the lifecycle in the guide below.

Before adding tests, configuring test tools, editing GitHub Actions, or changing
release automation, read [Testing and CI/CD](docs/testing-and-ci.md). It defines
suite separation, test isolation, TelePROmpter scenarios and promotion rules.

The test tooling, workflows and release process in this guide are the intended
conventions. They are not installed or configured by this documentation change.
Check actual scripts, workflows and repository settings before reporting a check
or deployment as available or passing.

## Branching and promotion PRs

| Branch | Purpose | Allowed incoming PRs |
| --- | --- | --- |
| `dev` | Development and feature integration | Feature, fix and maintenance branches |
| `staging` | Staging validation | `dev` from this repository only |
| `main` | Production | `staging` from this repository only |

Open routine work PRs against `dev`. Promote with `dev -> staging`, then
`staging -> main`. These are the only allowed promotion PR directions; fixes
follow the same path. Use the lowercase branch names shown above.

When implementing branch protection, require PRs for all three branches and the
promotion guard on `staging` and `main`. Reject other source branches, fork-based
promotions and direct pushes. Follow the CI guide for checks on the promoted tree.
