-- Remove security_invoker from v_user_centres
-- The view itself IS the security boundary (filters by user_id per tier)
-- security_invoker causes circular RLS dependency with centres table
ALTER VIEW public.v_user_centres SET (security_invoker = false);