-- ============================================================================
-- RECONCILIATION PATTERN ANALYZER
-- Analiza transacciones conciliadas y detecta patrones para sugerir reglas
-- ============================================================================

CREATE OR REPLACE FUNCTION analyze_reconciliation_patterns(
  p_centro_code TEXT,
  p_bank_account_id UUID,
  p_min_occurrences INTEGER DEFAULT 3,
  p_confidence_threshold NUMERIC DEFAULT 75
)
RETURNS JSONB AS $$
DECLARE
  v_pattern RECORD;
  v_suggestions JSONB := '[]'::JSONB;
  v_pattern_score NUMERIC;
BEGIN
  -- Analizar patrones de descripción + tipo de transacción
  FOR v_pattern IN
    WITH reconciled_txns AS (
      SELECT 
        bt.description,
        bt.amount,
        CASE WHEN bt.amount > 0 THEN 'credit' ELSE 'debit' END as txn_type,
        br.matched_type,
        br.confidence_score,
        COUNT(*) as occurrence_count,
        AVG(ABS(bt.amount)) as avg_amount,
        STDDEV(ABS(bt.amount)) as stddev_amount,
        MIN(ABS(bt.amount)) as min_amount,
        MAX(ABS(bt.amount)) as max_amount
      FROM bank_transactions bt
      JOIN bank_reconciliations br ON br.bank_transaction_id = bt.id
      WHERE br.reconciliation_status = 'confirmed'
        AND (p_centro_code IS NULL OR bt.centro_code = p_centro_code)
        AND (p_bank_account_id IS NULL OR bt.bank_account_id = p_bank_account_id)
        AND bt.description IS NOT NULL
        AND bt.description != ''
      GROUP BY bt.description, CASE WHEN bt.amount > 0 THEN 'credit' ELSE 'debit' END, br.matched_type, br.confidence_score
      HAVING COUNT(*) >= p_min_occurrences
    ),
    pattern_analysis AS (
      SELECT 
        *,
        -- Calcular score de confianza basado en frecuencia y consistencia
        LEAST(100, (
          (occurrence_count * 20) + -- Más ocurrencias = mayor confianza
          (CASE WHEN COALESCE(stddev_amount, 0) < (avg_amount * 0.1) THEN 30 ELSE 15 END) + -- Consistencia de importe
          (CASE WHEN occurrence_count > 10 THEN 20 ELSE 10 END) -- Bonus por alta frecuencia
        )) as pattern_confidence
      FROM reconciled_txns
    )
    SELECT * FROM pattern_analysis
    WHERE pattern_confidence >= p_confidence_threshold
    ORDER BY occurrence_count DESC, pattern_confidence DESC
    LIMIT 20
  LOOP
    -- Construir sugerencia de regla
    v_suggestions := v_suggestions || jsonb_build_object(
      'suggested_rule_name', 
      CASE 
        WHEN v_pattern.matched_type = 'daily_closure' THEN 'Cierre diario - ' || LEFT(v_pattern.description, 30)
        WHEN v_pattern.matched_type = 'invoice' THEN 'Facturas - ' || LEFT(v_pattern.description, 30)
        WHEN v_pattern.matched_type = 'royalty' THEN 'Royalties - ' || LEFT(v_pattern.description, 30)
        ELSE 'Patrón detectado - ' || LEFT(v_pattern.description, 30)
      END,
      'description_pattern', v_pattern.description,
      'transaction_type', v_pattern.txn_type,
      'amount_min', FLOOR(v_pattern.min_amount * 0.95), -- 5% margen
      'amount_max', CEIL(v_pattern.max_amount * 1.05),
      'auto_match_type', v_pattern.matched_type,
      'confidence_threshold', ROUND(v_pattern.pattern_confidence),
      'priority', 
        CASE 
          WHEN v_pattern.occurrence_count > 10 THEN 100
          WHEN v_pattern.occurrence_count > 5 THEN 50
          ELSE 10
        END,
      'evidence', jsonb_build_object(
        'occurrences', v_pattern.occurrence_count,
        'avg_amount', ROUND(v_pattern.avg_amount::numeric, 2),
        'consistency_score', ROUND(v_pattern.pattern_confidence),
        'amount_range', jsonb_build_object(
          'min', ROUND(v_pattern.min_amount::numeric, 2),
          'max', ROUND(v_pattern.max_amount::numeric, 2),
          'avg', ROUND(v_pattern.avg_amount::numeric, 2),
          'stddev', ROUND(COALESCE(v_pattern.stddev_amount, 0)::numeric, 2)
        )
      )
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'suggestions_count', jsonb_array_length(v_suggestions),
    'suggestions', v_suggestions,
    'analysis_criteria', jsonb_build_object(
      'min_occurrences', p_min_occurrences,
      'confidence_threshold', p_confidence_threshold
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION analyze_reconciliation_patterns TO authenticated;

COMMENT ON FUNCTION analyze_reconciliation_patterns IS 
'Analiza transacciones bancarias conciliadas e identifica patrones recurrentes para sugerir nuevas reglas de conciliación automática';