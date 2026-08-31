# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

Monorepo for a household-management app: a Go API server at the repo root and an Expo/React Native client in `client/`. Members of a household collaboratively manage tasks, bills, shopping lists, polls, notes, and smart home devices (Home Assistant integration), with real-time sync over WebSockets.

## Backend (Go, repo root)

### Commands

```bash
# Run locally (requires Postgres + Redis reachable, see .env)
go run cmd/server/main.go

# Hot-reload dev loop (uses .air.toml, builds ./cmd/server into tmp/main)
air

# Build
go build -v ./cmd/server

# Run the full test suite (same set CI runs)
go test -v ./internal/test/handlers ./internal/test/middleware ./internal/test/services

# Run a single test
go test -v ./internal/test/handlers -run TestRoomHandler_Create

# Run everything via Docker Compose (API, Postgres, Redis, Prometheus, Grafana)
docker compose -f docker-compose.dev.yaml up --build   # dev, hot-reload
docker compose up --build -d                            # prod-like
```

Swagger docs are pre-generated into `docs/` (`docs.go`, `swagger.json`, `swagger.yaml`) from `@Summary`/`@Router` annotations on handler methods (see any file in `internal/http/handlers`); regenerate with `swag init` after changing handler annotations. Served at `/swagger/*` behind Basic Auth (`AdminUsername`/`AdminPassword`).

### Architecture

Strictly layered, dependency-injected by hand (no DI framework):

```
router → handlers → services (interfaces) → repository (interfaces) → models (GORM)
```

- **`cmd/server/`** — composition root. `app.go` builds every repository, service, and handler and wires them into `serviceSet`/`handlerSet`/`repositories` structs; `server.go` (`NewServer`/`Run`) owns DB/Redis connections, migrations, background workers, and graceful shutdown; `workers.go` starts the scheduled goroutines (task scheduler, task reminders, bill scheduler). When adding a new domain, extend all three struct groups in `app.go` the same way existing ones (e.g. `room`, `bill`) are wired.
- **`internal/router/setup_routes.go`** — single source of truth for all HTTP routes, built with `go-chi`. Routes are nested under `/api/homes/{home_id}/...`; most domain routes are split into per-domain `mountXRoutes(r, deps)` helpers in sibling files (`home_resources.go` etc.). Route-level middleware enforces membership (`middleware.RequireMember`) or admin role (`middleware.RequireAdmin`) per home — check the existing route tree before adding a new protected route rather than reinventing auth checks in the handler.
- **`internal/http/handlers/`** — thin HTTP layer: decode request, call one service method, write response via `utils.JSON`/`utils.JSONError`/`utils.SafeError`. Ownership/admin checks that need cross-cutting data (e.g. "is this room's home the one in the URL, and is the caller its creator or a home admin") live here, using `middleware.GetUserID(r)` and the injected `repository.HomeRepository`, not inside the service.
- **`internal/services/`** — business logic. Each domain exposes a public `IXService` interface (e.g. `IRoomService`, `IBillService`) implemented by an unexported struct; handlers depend on the interface, enabling mocking in tests (see `internal/test/handlers/room_test.go` for the mock pattern). Services commonly take a Redis cache client and the `NotificationService` as dependencies for cache invalidation and cross-domain notifications.
- **`internal/repository/`** — GORM data access behind an interface per domain, same interface/struct pattern as services.
- **`internal/models/`** — GORM models plus request/response DTOs (e.g. `CreateRoomRequest`) colocated in the same file as the model they belong to.
- **`internal/http/middleware/`** — JWT auth, home membership/role checks, rate limiting (global + per-route "strict" limiters via `middleware.StrictRateLimitMiddleware`, see auth/upload/OCR routes in `setup_routes.go` for the pattern), request logging, Prometheus metrics, security headers, body size limits.
- **`internal/http/websocket/`** — WebSocket hub for real-time push; events are dispatched by module (TASK, BILL, POLL, etc.) — see `internal/event/event.go`.
- **`internal/metrics/`** — Prometheus metrics, including a GORM plugin (`gorm_plugin.go`) that auto-instruments DB queries. Exposed at `/metrics` behind Basic Auth.
- **`internal/config/config.go`** — all env-driven config in one `Config` struct, loaded once in `NewServer`. Add new env vars here.
- **`pkg/security/`** — standalone JWT/hashing helpers, importable outside `internal/`.
- **Tests** live in `internal/test/{handlers,services,middleware}`, not next to the code they test. Handler tests mock the service interface; service tests mock the repository interface.

## Client (Expo/React Native, `client/`)

### Commands (run from `client/`)

```bash
npm install
npm start              # Expo dev server
npm run android        # Android
npm run ios            # iOS
npm run web            # Web
npm run tunnel         # ngrok tunnel, for physical devices on a different network
npm run lint           # Biome check
npm run lint:fix       # Biome check --write
npm run format         # Biome format --write
npm run build:web      # expo export -p web + PWA injection script
```

Config: copy `client/.env.example`-equivalent and set `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_GOOGLE_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`.

### Architecture

- **`app/`** — Expo Router file-based routing. `(tabs)/` holds the bottom-tab screens (home, tasks, shopping, budget, polls, profile); other top-level files/dirs (`rooms/`, `smarthome/`, `login.tsx`, `members.tsx`, etc.) are pushed screens.
- **`stores/`** — Zustand stores (`authStore`, `homeStore`, `themeStore`, `i18nStore`) using `subscribeWithSelector`. `homeStore.currentHomeId` is the multi-tenancy anchor — nearly every data fetch is scoped to it, since a user can belong to multiple homes.
- **`lib/api.ts`** — single Axios client with every API endpoint. Interceptors: (1) attach the JWT from `secureStorage.ts` (Expo Secure Store) to every request and handle 401s, (2) convert request/response bodies between the client's `camelCase` and the Go backend's `snake_case` via `lib/caseConverter.ts` — never hand-roll case conversion elsewhere.
- **`lib/websocket.ts`** — singleton `WebSocketManager`; connects/disconnects automatically on auth state changes and dispatches events by module (TASK, BILL, POLL, ...). Components consume it via the `useRealtimeRefresh` hook rather than subscribing to the socket directly.
- **`components/ui/`** — shared design-system components (Button, Input, Modal, Card, etc.); `components/skeletons/` — loading placeholders matching each screen's layout.
- **`constants/`** — theme color palettes and font definitions; styling is NativeWind (Tailwind for RN), so prefer utility classes over `StyleSheet` for new UI.
- **`lib/i18n/`** — translations for 8 languages; add new user-facing strings here rather than hardcoding text.
- Linting/formatting is Biome (`client/biome.json`), not ESLint/Prettier, despite `eslint`/`eslint-config-expo` being present in devDependencies — use `npm run lint`/`npm run format`.

## Cross-cutting conventions

- **snake_case vs camelCase**: the Go API is snake_case; the RN client is camelCase. The boundary conversion happens only in `lib/caseConverter.ts` on the client — don't introduce a second conversion point.
- **Multi-tenancy**: almost every backend route and client data fetch is scoped by home ID (`{home_id}` path param server-side, `homeStore.currentHomeId` client-side). When adding a new domain feature, follow this scoping pattern rather than making it global.
- **Auth**: backend issues JWTs (`pkg/security/jwt.go`), validated by `middleware.JWTAuth`; refresh/session state also touches Redis (see `authStore`/token handling). Client stores the JWT in Expo Secure Store, never in plain AsyncStorage.
