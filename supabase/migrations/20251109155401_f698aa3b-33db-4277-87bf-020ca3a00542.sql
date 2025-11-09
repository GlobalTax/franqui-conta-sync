-- Grant execute to authenticated for adjustments RPC
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'calculate_pl_report_with_adjustments'
  ) THEN
    GRANT EXECUTE ON FUNCTION calculate_pl_report_with_adjustments(TEXT, UUID, TEXT, TEXT, TEXT) TO authenticated;
  END IF;
END $$;