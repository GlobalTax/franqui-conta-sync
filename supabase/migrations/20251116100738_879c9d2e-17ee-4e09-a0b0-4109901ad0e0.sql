-- ============================================================================
-- AUTO-POSTING SYSTEM - Database Schema
-- ============================================================================

-- 1. Agregar campos de trust a suppliers
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS is_trusted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS successful_posts_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_successful_post_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS avg_invoice_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS invoice_count INTEGER DEFAULT 0;

-- 2. Agregar campos de auto-posting a invoices_received
ALTER TABLE invoices_received
  ADD COLUMN IF NOT EXISTS auto_posted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS auto_post_confidence NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS auto_post_criteria JSONB,
  ADD COLUMN IF NOT EXISTS auto_post_evaluated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS manual_review_reason TEXT;

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_suppliers_trusted 
  ON suppliers(is_trusted) WHERE is_trusted = TRUE;

CREATE INDEX IF NOT EXISTS idx_invoices_auto_posted 
  ON invoices_received(auto_posted, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_auto_post_confidence 
  ON invoices_received(auto_post_confidence DESC) 
  WHERE auto_post_confidence IS NOT NULL;

-- 4. Función para actualizar supplier trust score
CREATE OR REPLACE FUNCTION update_supplier_trust_score(p_supplier_id UUID)
RETURNS VOID AS $$
DECLARE
  v_successful_count INTEGER;
  v_avg_amount NUMERIC(12,2);
  v_invoice_count INTEGER;
  v_is_trusted BOOLEAN;
BEGIN
  SELECT 
    COUNT(*) FILTER (WHERE approval_status IN ('approved_accounting', 'posted')),
    AVG(total) FILTER (WHERE approval_status IN ('approved_accounting', 'posted')),
    COUNT(*)
  INTO v_successful_count, v_avg_amount, v_invoice_count
  FROM invoices_received
  WHERE supplier_id = p_supplier_id;
  
  v_is_trusted := v_successful_count >= 5;
  
  UPDATE suppliers
  SET 
    is_trusted = v_is_trusted,
    successful_posts_count = v_successful_count,
    avg_invoice_amount = v_avg_amount,
    invoice_count = v_invoice_count,
    last_successful_post_at = (
      SELECT MAX(updated_at) 
      FROM invoices_received 
      WHERE supplier_id = p_supplier_id AND approval_status = 'posted'
    )
  WHERE id = p_supplier_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 5. Trigger para actualizar trust score automáticamente
CREATE OR REPLACE FUNCTION trigger_update_supplier_trust()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.approval_status IN ('approved_accounting', 'posted') AND NEW.supplier_id IS NOT NULL THEN
    PERFORM update_supplier_trust_score(NEW.supplier_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_update_supplier_trust_on_post ON invoices_received;
CREATE TRIGGER trg_update_supplier_trust_on_post
  AFTER UPDATE OF approval_status ON invoices_received
  FOR EACH ROW
  WHEN (NEW.approval_status IN ('approved_accounting', 'posted'))
  EXECUTE FUNCTION trigger_update_supplier_trust();

-- 6. Vista de métricas de auto-posting
CREATE OR REPLACE VIEW v_auto_posting_metrics AS
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
ORDER BY date DESC;