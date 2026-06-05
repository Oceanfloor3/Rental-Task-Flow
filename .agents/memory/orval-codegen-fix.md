---
name: Orval codegen conflict fix
description: Post-codegen script removes duplicate export line from api-zod index.ts
---

Orval in split mode generates types in `lib/api-zod/src/generated/` AND emits a barrel export. The api-zod index.ts was importing `./generated/types` which doesn't exist in split mode, causing a duplicate-export conflict.

**Why:** Orval's zod output config had a `schemas` field that made it try to export types twice.

**How to apply:** There is a post-codegen script in `lib/api-spec/package.json` that strips the `export * from './generated/types'` line after codegen runs. Never remove this script. Always run `pnpm --filter @workspace/api-spec run codegen` to regenerate, not orval directly.
