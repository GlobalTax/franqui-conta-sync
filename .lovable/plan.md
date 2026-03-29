

# Plan: Fix CORS error on `v_user_centres`

## Root Cause

The view `v_user_centres` has `security_invoker = true`, which means it runs with the calling user's permissions. When an authenticated user queries it:

1. The view accesses `centres` table → RLS kicks in
2. `centres` SELECT policy calls `has_permission()` → queries `user_roles`
3. This creates a circular/expensive chain that causes the query to fail
4. Supabase returns an error without CORS headers → browser shows CORS error

The "CORS error" is actually a **failed query** — Supabase doesn't always include CORS headers on 500 error responses.

## Solution

Run a migration to change `v_user_centres` from `security_invoker = true` to `security_invoker = false` (default). This makes the view run as the owner (postgres), bypassing RLS on the underlying `centres` and `user_roles` tables.

This is correct because `v_user_centres` **IS** the security boundary — it already filters by `user_id` in each tier. It doesn't need RLS on its underlying tables.

## Migration SQL

```sql
-- Remove security_invoker from v_user_centres
-- The view itself IS the security boundary (filters by user_id per tier)
-- security_invoker causes circular RLS dependency with centres table
ALTER VIEW public.v_user_centres SET (security_invoker = false);
```

## Files Changed

| File | Change |
|------|--------|
| Migration (new) | `ALTER VIEW` to disable `security_invoker` |

No frontend changes needed — the query in `useAllUserCentres.ts` is already correct.

