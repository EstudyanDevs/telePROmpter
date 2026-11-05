# TelePROmpter

Local-first teleprompter for browsers and installation as a PWA.

The web app has a minimal React, Vite, TypeScript, and Tailwind CSS setup.
Feature folders are placeholders; teleprompter features are not implemented yet.

## Development

Run commands from `apps/web`:

```bash
pnpm install
pnpm dev
```

Use `pnpm build` to type-check and build for production, `pnpm typecheck` to
check types, and `pnpm preview` to serve the production build locally.

For the API, run commands from `apps/api`:

```bash
pnpm install
pnpm dev
```

Use `pnpm build` to compile to `dist/` and `pnpm start` to run the compiled
server. `GET http://localhost:3000/health` returns `{"status":"ok"}`.
Set `PORT` to change the port and `LOG_LEVEL` to control logging verbosity.
`pnpm dev` enables readable Pino logs; `pnpm start` defaults to production
JSON logs. Configuration is validated with Zod at startup. Supply environment
variables through the shell or your deployment platform; `.env` files are not
loaded automatically.

## Structure

```text
telePROmpter/
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── app.ts            # Hono app and health endpoint
│   │       ├── env.ts            # Zod-validated server configuration
│   │       ├── index.ts          # Node.js server entry point
│   │       └── logger.ts         # Pino logging configuration
│   └── web/
│       ├── public/
│       │   └── icons/            # Installable PWA icons
│       └── src/
│           ├── app/              # App entry, providers, routing, layouts
│           ├── assets/           # Imported images, fonts, and other assets
│           ├── components/
│           │   ├── ui/           # shadcn/ui primitives
│           │   └── magicui/      # Magic UI components
│           ├── features/
│           │   ├── scripts/      # Script library and editing
│           │   ├── prompter/     # Playback, scrolling, and reading controls
│           │   ├── recordings/   # Recording sessions and local playback
│           │   └── settings/     # User preferences
│           ├── hooks/            # Hooks used across features
│           ├── lib/              # Small shared frontend utilities
│           ├── platform/
│           │   ├── storage/      # Native IndexedDB, schema, repositories
│           │   ├── sync/         # Custom sync engine and queue
│           │   ├── media/        # MediaDevices and MediaRecorder adapters
│           │   ├── speech/       # Web Speech API adapter
│           │   └── display/      # Screen Wake Lock and Fullscreen adapters
│           ├── pwa/              # Service worker and registration
│           └── styles/           # Tailwind entry and global styles
├── packages/
│   └── shared/
│       └── src/                  # Contracts shared across apps when needed
└── docs/                         # Architecture and project documentation
```

## Placement rules

- Keep feature-specific components, hooks, and types inside their feature folder.
- Keep browser API and persistence details in `platform/`; features consume those adapters.
- Keep service-worker code in `pwa/`. The sync engine owns synchronization logic.
- Keep recording data local. Do not include recording blobs in synchronization payloads.
- Put code in `packages/shared` only when multiple apps need it; frontend-only code stays in `apps/web`.
- Use Motion within the components that need animation.

The intended frontend stack is React, Vite, TypeScript, Tailwind CSS,
shadcn/ui, Motion, and Magic UI. The API uses Hono, Zod, and Pino.
Database, authentication, and sync endpoints are not implemented yet.

Empty directories contain `.gitkeep` files so Git preserves the structure.
Remove a directory's placeholder when adding its first real file.
