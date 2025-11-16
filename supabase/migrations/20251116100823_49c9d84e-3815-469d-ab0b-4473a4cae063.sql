-- RPC function para obtener métricas de auto-posting (evita problemas de tipos)
CREATE OR REPLACE FUNCTION get_auto_posting_metrics()
RETURNS TABLE (
  date TIMESTAMPTZ,
  total_invoices BIGINT,
  auto_posted_count BIGINT,
  manual_review_count BIGINT,
  avg_confidence NUMERIC,
  auto_post_rate_percent NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE_TRUNC('day', created_at) AS date,
    COUNT(*) AS total_invoices,
    COUNT(*) FILTER (WHERE auto_posted = TRUE) AS auto_posted_count,
    COUNT(*) FILTER (WHERE auto_posted = FALSE) AS manual_review_count,
    ROUND(AVG(auto_post_confidence), 2) AS avg_confidence,
    ROUND(
      (COUNT(*) FILTER (WHERE auto_posted = TRUE)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 
      1
    ) AS auto_post_rate_percent
  FROM invoices_received
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY DATE_TRUNC('day', created_at)
  ORDER BY date DESC
  LIMIT 30;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;