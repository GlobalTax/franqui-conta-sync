-- Create helper function to get closing periods with proper RLS
CREATE OR REPLACE FUNCTION get_closing_periods(
  p_centro_code TEXT DEFAULT NULL,
  p_year INTEGER DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  centro_code TEXT,
  period_type TEXT,
  period_year INTEGER,
  period_month INTEGER,
  status TEXT,
  closing_date DATE,
  closing_entry_id UUID,
  regularization_entry_id UUID,
  closed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.id,
    cp.centro_code,
    cp.period_type,
    cp.period_year,
    cp.period_month,
    cp.status,
    cp.closing_date,
    cp.closing_entry_id,
    cp.regularization_entry_id,
    cp.closed_by,
    cp.notes,
    cp.created_at,
    cp.updated_at
  FROM closing_periods cp
  WHERE 
    (p_centro_code IS NULL OR cp.centro_code = p_centro_code)
    AND (p_year IS NULL OR cp.period_year = p_year)
    AND (
      has_role(auth.uid(), 'admin')
      OR cp.centro_code IN (
        SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
      )
    )
  ORDER BY cp.period_year DESC, cp.period_month DESC NULLS LAST;
END;
$$;