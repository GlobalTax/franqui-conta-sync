-- ============================================================================
-- MIGRATION: Create Fiscal Years 2025 for All Active Centers (Fixed)
-- Purpose: Initialize fiscal years for 2025 to enable accounting entries
-- ============================================================================

-- Insert fiscal years 2025 for all active centers
INSERT INTO fiscal_years (id, year, start_date, end_date, status, centro_code, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  2025,
  '2025-01-01'::date,
  '2025-12-31'::date,
  'open',
  codigo,
  NOW(),
  NOW()
FROM centres
WHERE activo = true
ON CONFLICT (centro_code, year) DO NOTHING;

-- Post-migration validation
DO $$
DECLARE
  v_count INTEGER;
  v_centres_count INTEGER;
BEGIN
  -- Count created fiscal years
  SELECT COUNT(*) INTO v_count 
  FROM fiscal_years 
  WHERE year = 2025 AND status = 'open';
  
  -- Count active centres
  SELECT COUNT(*) INTO v_centres_count 
  FROM centres 
  WHERE activo = true;
  
  IF v_count = 0 THEN
    RAISE EXCEPTION 'ERROR: No fiscal years created for 2025';
  END IF;
  
  IF v_count < v_centres_count THEN
    RAISE WARNING 'WARNING: Created % fiscal years but found % active centres. Some may already exist.', v_count, v_centres_count;
  END IF;
  
  RAISE NOTICE 'SUCCESS: Created/verified % fiscal years for 2025', v_count;
END $$;