# Auth Service — Project Notes

## Stack
- Express 5 (Node.js, TypeScript)
- Drizzle ORM + Supabase Postgres (hosted)
- Better Auth (auth library) with Drizzle adapter
- Zod + drizzle-zod for validation
- argon2 (superseded by Better Auth's internal hashing — no longer used directly)

## Architecture

src/
db/
schema.ts <- all tables, including Better Auth's user/session/account/verification
validation.ts <- zod schemas via drizzle-zod (needs cleanup post-Better Auth migration)
db.ts <- drizzle client (postgres-js, Supabase transaction pooler)
lib/
auth.ts <- betterAuth() config (plugins, providers, schema)
services/
auth.service.ts <- register/login/logout, calls auth.api.*
controllers/
auth.controller.ts
routes/
auth.route.ts
shared/
errors.ts <- AppError + subclasses (ValidationError, ConflictError, AuthError, ForbiddenError, NotFoundError)
middlewares/
auth.middleware.ts <- requireAuth, requireRole, requireGuest
errorHandler.ts <- global error middleware (must be last in app.ts)


## Database
- Supabase hosted Postgres.
- Two connection strings needed:
  - `DATABASE_URL` — Transaction pooler (port 6543), used at runtime (`db.ts`).
  - `DIRECT_URL` — Session pooler (port 5432), used for migrations (`drizzle.config.ts`). Direct connection (`db.<ref>.supabase.co`) fails via IPv6-only DNS on most networks — use Session pooler instead.
- Migrations: `npm run db:generate` then `npm run db:migrate`.
- Known drizzle-kit bug: combining a table rename + column type changes in one diff can crash `drizzle-kit generate`. Workaround used: drop all tables/enums and regenerate clean (acceptable since no production data existed yet).

## Auth: Better Auth
- Replaced custom JWT (access + refresh token) implementation with Better Auth's database-backed sessions.
- Core tables (`user`, `session`, `account`, `verification`) merged into the app's existing `schema.ts`, replacing the old custom `users` table.
- `user.id` forced to `uuid` (`advanced.database.generateId`) to match existing FK columns across the schema (was `text` by default).
- Custom fields added to `user` via `additionalFields`: `budget` (numeric), `maritalStatus` (pgEnum), `phone` (text) — all nullable, matching original schema intent.
- Soft-delete: dropped custom `deletedAt` column in favor of Better Auth's built-in `banned`/`banReason`/`banExpires` (admin plugin) — this is enforced at the auth layer (banned users can't create sessions), unlike a manual `deletedAt` flag which nothing would check automatically.
- Roles (`admin | user | store`) handled via the `admin` plugin's `role` field (plain text, not DB-enum-enforced — a CHECK constraint could be added later if needed).
- Auth is bearer-token based (`bearer` plugin), not cookie-based — chosen because the frontend is a plain static HTML/JS site hosted separately (no server), and cross-origin cookies are unreliable (Safari/ITP blocks third-party cookies). Token stored in `localStorage` on the frontend.
- OAuth: Google and Facebook configured via `socialProviders`. Redirect URIs: `/api/auth/callback/google`, `/api/auth/callback/facebook`.

## API surface
- App wraps Better Auth's native endpoints with its own routes for consistent error responses:
  - `POST /auth/register` → validates via zod, calls `auth.api.signUpEmail`
  - `POST /auth/login` → calls `auth.api.signInEmail`
  - `POST /auth/logout` → requires auth, calls `auth.api.signOut`
- Frontend should call these wrapper routes, not Better Auth's native `/api/auth/*` paths directly, to get consistent `AppError`-shaped responses.
- Better Auth's raw routes are still mounted at `app.all("/api/auth/*splat", toNodeHandler(auth))` (must be registered before `express.json()`, since Better Auth needs the raw body).

## Error handling
- `AppError` base class (statusCode, isOperational) with subclasses: `ValidationError` (400), `ConflictError` (409), `NotFoundError` (404), `AuthError` (401), `ForbiddenError` (403).
- Single global `errorHandler` middleware registered last in `app.ts`, not per-router.
- Express 5 auto-forwards thrown async errors to error middleware (no `express-async-errors` package needed).

## Known gotchas hit during setup
- Express 5 / path-to-regexp v7: bare `*` wildcard routes are invalid, must be named (`*splat`).
- `drizzle.config.ts` does not auto-load `.env` — needs explicit `import "dotenv/config"` at the top.
- `drizzleAdapter` requires the schema object passed explicitly (`drizzleAdapter(db, { provider: "pg", schema })`) or Better Auth throws "model not found" even if tables exist in the DB.
- Supabase direct connection host is IPv6-only; use Session pooler for any environment without IPv6 support.

## Not yet built
- Password reset flow (`sendResetPassword` + Nodemailer/Resend wiring)
- `/me` (get current user) endpoint
- First-admin seed script
- Email verification (intentionally skipped for hackathon scope)
- Tests beyond initial register/login scaffold (vitest + supertest installed)