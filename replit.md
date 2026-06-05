# Real Estate Investment App

A mobile-first investment platform where users complete daily click-to-earn tasks by "renting" virtual properties, track earnings, and manage withdrawals.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — express-session secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite, Tailwind CSS, shadcn/ui, framer-motion, wouter routing

## Where things live

- `artifacts/api-server/src/routes/` — all API route handlers
- `artifacts/api-server/src/middleware/auth.ts` — `requireAuth` middleware
- `artifacts/real-estate-app/src/pages/` — frontend pages (home, login, register, admin, profile, tasks, position, earnings)
- `artifacts/real-estate-app/src/contexts/AuthContext.tsx` — auth state (useAuth hook)
- `lib/db/src/schema.ts` — DB schema source of truth
- `lib/api-spec/openapi.yaml` — OpenAPI spec source of truth
- `lib/api-client-react/src/generated/` — Orval-generated React Query hooks
- `lib/api-zod/src/generated/` — Orval-generated Zod schemas

## Architecture decisions

- Contract-first: OpenAPI spec → Orval codegen → typed hooks + Zod schemas
- Session auth via express-session + connect-pg-simple (requires `session` table in DB)
- All protected routes use `requireAuth` middleware reading `req.session.userId`
- Frontend auth via AuthContext wrapping useGetMe() — redirects to /login if not authenticated
- Admin dashboard uses a desktop sidebar layout; user app is mobile-first (max 430px)
- `GET /api/auth/me` returns `UserFull` directly (not wrapped in `{user: ...}`)

## Product

- **Users**: Register/login, complete daily property rental tasks, earn commissions, view position/earnings/referrals, request withdrawals (pre-filled bank info), manage profile
- **Admin**: Stats overview, broadcast notifications to all users, manage users (activate/disable/edit/delete), approve/deny withdrawal requests

## Admin Credentials

- Email: `admin@realestate.ng`
- Password: `Admin@123456`

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The `session` table must exist in PostgreSQL before the API server starts. It was created manually via SQL (connect-pg-simple's `createTableIfMissing: true` can't find `table.sql` when bundled by esbuild).
- After running Orval codegen, a post-codegen script strips the duplicate `export * from './generated/types'` line from `lib/api-zod/src/index.ts` — do not remove that script.
- `bcryptjs` is not available in the code_execution sandbox; use the API server's built environment or a shell script for password hashing.
- Do not run `pnpm dev` at workspace root — use workflows or `pnpm --filter` commands.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
