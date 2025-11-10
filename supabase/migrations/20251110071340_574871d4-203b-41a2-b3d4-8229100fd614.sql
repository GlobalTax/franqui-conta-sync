-- ============================================================================
-- Purpose: Fix v_user_centres view to properly respect franchisee boundaries
-- Issue: Franchisee users were seeing centres from other franchisees
-- Solution: Implement 3-tier access logic (admin, franchisee, centre manager)
-- ============================================================================

-- Step 1: Clean inconsistent data in user_roles
-- Remove direct centro assignments for users who have franchisee_id
-- This ensures franchisees only access centres via their franchisee_id
UPDATE user_roles 
SET centro = NULL 
WHERE franchisee_id IS NOT NULL 
  AND centro IS NOT NULL;

-- Step 2: Redefine v_user_centres view with proper franchisee logic
-- Using CREATE OR REPLACE to avoid CASCADE issues
CREATE OR REPLACE VIEW v_user_centres AS
-- Tier 1: Admins see ALL centres
SELECT DISTINCT 
  ur.user_id,
  c.codigo AS centro_code,
  c.id AS centro_id,
  c.nombre AS centro_nombre,
  c.orquest_service_id,
  ur.role
FROM user_roles ur
CROSS JOIN centres c
WHERE ur.role = 'admin'
  AND c.activo = true

UNION ALL

-- Tier 2: Franchisees see ALL centres of their franchisee
SELECT DISTINCT 
  ur.user_id,
  c.codigo AS centro_code,
  c.id AS centro_id,
  c.nombre AS centro_nombre,
  c.orquest_service_id,
  ur.role
FROM user_roles ur
JOIN centres c ON c.franchisee_id = ur.franchisee_id
WHERE ur.franchisee_id IS NOT NULL
  AND c.activo = true

UNION ALL

-- Tier 3: Centre managers see ONLY their specific centre
SELECT DISTINCT 
  ur.user_id,
  c.codigo AS centro_code,
  c.id AS centro_id,
  c.nombre AS centro_nombre,
  c.orquest_service_id,
  ur.role
FROM user_roles ur
JOIN centres c ON c.codigo = ur.centro
WHERE ur.centro IS NOT NULL 
  AND ur.franchisee_id IS NULL
  AND c.activo = true;