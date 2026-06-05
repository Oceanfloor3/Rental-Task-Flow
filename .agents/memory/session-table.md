---
name: Session table bootstrap
description: connect-pg-simple can't auto-create its session table when bundled via esbuild
---

The `createTableIfMissing: true` option in connect-pg-simple reads `table.sql` from the package directory. When the API server is bundled by esbuild, that file is not available in the dist output.

**Why:** esbuild bundles only JS/TS, not arbitrary files.

**How to apply:** Before the API server starts for the first time (especially in production), manually create the sessions table:
```sql
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
```
