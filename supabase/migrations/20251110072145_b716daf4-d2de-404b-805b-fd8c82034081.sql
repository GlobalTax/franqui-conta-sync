-- ============================================================================
-- Purpose: Fix RLS policies for franchisees and companies tables
-- Issue: Users were seeing franchisees and companies they shouldn't have access to
-- Solution: Implement 3-tier access logic consistent with v_user_centres
-- ============================================================================

-- =============================================================
-- PART 1: Fix franchisees table RLS policies
-- =============================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own franchisee data (via profiles)" ON franchisees;
DROP POLICY IF EXISTS "Admins can manage all franchisees" ON franchisees;

-- Tier 1: Admins can view all franchisees
CREATE POLICY "Admins can view all franchisees"
ON franchisees FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Tier 2: Franchisees can view their own franchisee
CREATE POLICY "Franchisees can view their own franchisee"
ON franchisees FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT franchisee_id 
    FROM user_roles 
    WHERE user_id = auth.uid() 
      AND franchisee_id IS NOT NULL
  )
);

-- Tier 3: Centre managers can view their centre's franchisee
CREATE POLICY "Centre managers can view their centre's franchisee"
ON franchisees FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT DISTINCT c.franchisee_id
    FROM centres c
    JOIN user_roles ur ON ur.centro = c.codigo
    WHERE ur.user_id = auth.uid()
      AND ur.centro IS NOT NULL
      AND c.franchisee_id IS NOT NULL
  )
);

-- Admin management policy
CREATE POLICY "Admins can manage all franchisees"
ON franchisees FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- =============================================================
-- PART 2: Fix companies table RLS policies
-- =============================================================

-- Drop old policy
DROP POLICY IF EXISTS "Users can view companies of their franchisee" ON companies;

-- New policy: Users can view companies of accessible franchisees
CREATE POLICY "Users can view companies of accessible franchisees"
ON companies FOR SELECT
TO authenticated
USING (
  -- Tier 1: Admins see everything
  has_role(auth.uid(), 'admin')
  OR
  -- Tier 2 & 3: Users see companies of their accessible franchisees
  franchisee_id IN (
    -- Franchisee users
    SELECT DISTINCT franchisee_id 
    FROM user_roles 
    WHERE user_id = auth.uid() 
      AND franchisee_id IS NOT NULL
    
    UNION
    
    -- Centre managers
    SELECT DISTINCT c.franchisee_id
    FROM centres c
    JOIN user_roles ur ON ur.centro = c.codigo
    WHERE ur.user_id = auth.uid()
      AND ur.centro IS NOT NULL
      AND c.franchisee_id IS NOT NULL
  )
);

-- Keep existing admin management policy
-- (Admins can manage all companies - already exists)

-- =============================================================
-- PART 3: Data consistency verification
-- =============================================================

-- Check for centres without franchisee_id
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM centres 
  WHERE franchisee_id IS NULL AND activo = true;
  
  IF orphan_count > 0 THEN
    RAISE WARNING 'Found % active centres without franchisee_id. These centres will not be accessible to non-admin users.', orphan_count;
  END IF;
END $$;

-- Check for active companies without franchisee_id
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM companies 
  WHERE franchisee_id IS NULL AND activo = true;
  
  IF orphan_count > 0 THEN
    RAISE WARNING 'Found % active companies without franchisee_id. These companies will not be accessible to non-admin users.', orphan_count;
  END IF;
END $$;

-- =============================================================
-- PART 4: Summary of changes
-- =============================================================

-- This migration ensures:
-- 1. Franchisees table: 3-tier access (admin → franchisee_id → centro)
-- 2. Companies table: Same 3-tier logic, consistent with franchisees
-- 3. Data integrity checks for orphaned records
-- 4. Complete alignment with v_user_centres view logic

-- Expected behavior after migration:
-- - Admin users: See all franchisees, companies, and centres
-- - Franchisee users: See only their franchisee, its companies, and its centres
-- - Centre managers: See their centre's franchisee, its companies, and their centre only