---
name: Auth GetMe response shape
description: GET /api/auth/me returns UserFull directly, not wrapped in {user: ...}
---

The OpenAPI spec for GET /api/auth/me defines the response as `UserFull` (not `{user: UserFull}`).

**Why:** Simpler API shape. Login returns `{user: UserFull}` but /me returns the user directly.

**How to apply:** In AuthContext, use `data || null` (not `data?.user || null`). The server route does `res.json(GetMeResponse.parse(toUserFull(user)))` directly.
