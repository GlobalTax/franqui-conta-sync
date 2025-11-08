-- Drop the failed view creation attempt if exists
DROP VIEW IF EXISTS public.user_memberships CASCADE;

-- Create materialized view for user memberships with all related data
CREATE MATERIALIZED VIEW IF NOT EXISTS public.v_user_memberships AS
SELECT 
  m.id as membership_id,
  m.user_id,
  p.email as user_email,
  p.nombre as user_nombre,
  p.apellidos as user_apellidos,
  m.organization_id,
  f.name as organization_name,
  f.email as organization_email,
  f.company_tax_id as organization_tax_id,
  m.restaurant_id,
  c.codigo as restaurant_code,
  c.nombre as restaurant_name,
  c.direccion as restaurant_address,
  c.ciudad as restaurant_city,
  c.activo as restaurant_active,
  m.role,
  m.active,
  m.created_at,
  m.updated_at
FROM public.memberships m
LEFT JOIN public.profiles p ON p.id = m.user_id
LEFT JOIN public.franchisees f ON f.id = m.organization_id
LEFT JOIN public.centres c ON c.id = m.restaurant_id
WHERE m.active = true
ORDER BY f.name NULLS LAST, c.nombre NULLS LAST;

-- Create unique index on membership_id for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_v_user_memberships_id ON public.v_user_memberships(membership_id);

-- Create index on user_id for filtering by user
CREATE INDEX IF NOT EXISTS idx_v_user_memberships_user_id ON public.v_user_memberships(user_id);

-- Create index on organization_id for filtering by organization
CREATE INDEX IF NOT EXISTS idx_v_user_memberships_org_id ON public.v_user_memberships(organization_id) WHERE organization_id IS NOT NULL;

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_v_user_memberships_user_org_active ON public.v_user_memberships(user_id, organization_id, active);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION public.refresh_user_memberships()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.v_user_memberships;
END;
$$;

-- Trigger function to auto-refresh the materialized view
CREATE OR REPLACE FUNCTION public.trigger_refresh_user_memberships()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.v_user_memberships;
  RETURN NULL;
END;
$$;

-- Drop existing triggers if any
DROP TRIGGER IF EXISTS refresh_user_memberships_on_membership_change ON public.memberships;
DROP TRIGGER IF EXISTS refresh_user_memberships_on_profile_change ON public.profiles;
DROP TRIGGER IF EXISTS refresh_user_memberships_on_franchisee_change ON public.franchisees;
DROP TRIGGER IF EXISTS refresh_user_memberships_on_centre_change ON public.centres;

-- Trigger on memberships table
CREATE TRIGGER refresh_user_memberships_on_membership_change
AFTER INSERT OR UPDATE OR DELETE ON public.memberships
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_refresh_user_memberships();

-- Trigger on profiles table (when user info changes)
CREATE TRIGGER refresh_user_memberships_on_profile_change
AFTER UPDATE OF nombre, apellidos, email ON public.profiles
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_refresh_user_memberships();

-- Trigger on franchisees table (when organization info changes)
CREATE TRIGGER refresh_user_memberships_on_franchisee_change
AFTER UPDATE OF name, email, company_tax_id ON public.franchisees
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_refresh_user_memberships();

-- Trigger on centres table (when restaurant info changes)
CREATE TRIGGER refresh_user_memberships_on_centre_change
AFTER UPDATE OF nombre, codigo, direccion, ciudad, activo ON public.centres
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_refresh_user_memberships();

-- Grant permissions
GRANT SELECT ON public.v_user_memberships TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_user_memberships() TO authenticated;

-- Initial refresh to populate the view
REFRESH MATERIALIZED VIEW public.v_user_memberships;