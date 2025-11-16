-- ============================================================================
-- LEARNING SYSTEM - Aprende de correcciones manuales
-- ============================================================================

-- 1. Tabla de correcciones
CREATE TABLE IF NOT EXISTS ap_learning_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices_received(id) ON DELETE CASCADE,
  
  -- Mapping original (sugerido por sistema)
  original_expense_account TEXT,
  original_tax_account TEXT,
  original_ap_account TEXT,
  original_confidence NUMERIC(5,2),
  
  -- Mapping corregido (usuario)
  corrected_expense_account TEXT NOT NULL,
  corrected_tax_account TEXT,
  corrected_ap_account TEXT,
  
  -- Metadata para pattern detection
  supplier_id UUID REFERENCES suppliers(id),
  supplier_vat TEXT,
  invoice_description TEXT,
  invoice_total NUMERIC(12,2),
  invoice_lines JSONB,
  
  -- Tracking
  corrected_by UUID REFERENCES auth.users(id),
  correction_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Pattern detection
  pattern_detected BOOLEAN DEFAULT FALSE,
  pattern_id UUID,
  
  CONSTRAINT different_mapping CHECK (
    original_expense_account IS DISTINCT FROM corrected_expense_account OR
    original_tax_account IS DISTINCT FROM corrected_tax_account OR
    original_ap_account IS DISTINCT FROM corrected_ap_account
  )
);

-- 2. Tabla de patrones aprendidos
CREATE TABLE IF NOT EXISTS ap_learned_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  supplier_id UUID REFERENCES suppliers(id),
  description_keywords TEXT[],
  amount_range_min NUMERIC(12,2),
  amount_range_max NUMERIC(12,2),
  
  learned_expense_account TEXT NOT NULL,
  learned_tax_account TEXT NOT NULL,
  learned_ap_account TEXT NOT NULL,
  
  occurrence_count INTEGER DEFAULT 1,
  confidence_score NUMERIC(5,2) DEFAULT 70,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_from_corrections INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  
  CONSTRAINT valid_range CHECK (amount_range_max IS NULL OR amount_range_max >= amount_range_min)
);

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_corrections_supplier ON ap_learning_corrections(supplier_id);
CREATE INDEX IF NOT EXISTS idx_corrections_invoice ON ap_learning_corrections(invoice_id);
CREATE INDEX IF NOT EXISTS idx_corrections_created_at ON ap_learning_corrections(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_patterns_supplier ON ap_learned_patterns(supplier_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_patterns_active ON ap_learned_patterns(is_active, confidence_score DESC);

-- 4. Función para detectar patrones
CREATE OR REPLACE FUNCTION detect_correction_patterns()
RETURNS TRIGGER AS $$
DECLARE
  v_similar_corrections INTEGER;
  v_pattern_id UUID;
BEGIN
  SELECT COUNT(*) INTO v_similar_corrections
  FROM ap_learning_corrections
  WHERE supplier_id = NEW.supplier_id
    AND corrected_expense_account = NEW.corrected_expense_account
    AND created_at >= NOW() - INTERVAL '90 days';
  
  IF v_similar_corrections >= 3 THEN
    SELECT id INTO v_pattern_id
    FROM ap_learned_patterns
    WHERE supplier_id = NEW.supplier_id
      AND learned_expense_account = NEW.corrected_expense_account
    LIMIT 1;
    
    IF v_pattern_id IS NOT NULL THEN
      UPDATE ap_learned_patterns
      SET 
        occurrence_count = occurrence_count + 1,
        confidence_score = LEAST(95, confidence_score + 5),
        last_seen_at = NOW(),
        updated_at = NOW()
      WHERE id = v_pattern_id;
      
      UPDATE ap_learning_corrections
      SET pattern_detected = TRUE, pattern_id = v_pattern_id
      WHERE id = NEW.id;
    ELSE
      INSERT INTO ap_learned_patterns (
        supplier_id,
        learned_expense_account,
        learned_tax_account,
        learned_ap_account,
        occurrence_count,
        confidence_score,
        created_from_corrections
      ) VALUES (
        NEW.supplier_id,
        NEW.corrected_expense_account,
        COALESCE(NEW.corrected_tax_account, NEW.original_tax_account),
        COALESCE(NEW.corrected_ap_account, NEW.original_ap_account),
        v_similar_corrections,
        70,
        v_similar_corrections
      ) RETURNING id INTO v_pattern_id;
      
      UPDATE ap_learning_corrections
      SET pattern_detected = TRUE, pattern_id = v_pattern_id
      WHERE supplier_id = NEW.supplier_id
        AND corrected_expense_account = NEW.corrected_expense_account
        AND created_at >= NOW() - INTERVAL '90 days';
    END IF;
    
    RAISE NOTICE 'Pattern detected for supplier % → account %', NEW.supplier_id, NEW.corrected_expense_account;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_detect_patterns ON ap_learning_corrections;
CREATE TRIGGER trg_detect_patterns
  AFTER INSERT ON ap_learning_corrections
  FOR EACH ROW
  EXECUTE FUNCTION detect_correction_patterns();

-- 5. Vista de sugerencias de nuevas reglas
CREATE OR REPLACE VIEW v_suggested_ap_rules AS
SELECT
  p.id AS pattern_id,
  s.name AS supplier_name,
  s.tax_id AS supplier_vat,
  p.learned_expense_account,
  p.learned_tax_account,
  p.learned_ap_account,
  p.occurrence_count,
  p.confidence_score,
  p.created_from_corrections,
  p.last_seen_at,
  (
    SELECT COUNT(*)
    FROM ap_mapping_rules r
    WHERE r.supplier_id = p.supplier_id
      AND r.suggested_expense_account = p.learned_expense_account
  ) AS already_has_rule
FROM ap_learned_patterns p
JOIN suppliers s ON s.id = p.supplier_id
WHERE p.is_active = TRUE
  AND p.confidence_score >= 75
  AND p.occurrence_count >= 3
ORDER BY p.confidence_score DESC, p.occurrence_count DESC;