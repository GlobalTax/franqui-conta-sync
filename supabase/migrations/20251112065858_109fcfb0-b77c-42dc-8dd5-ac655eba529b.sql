-- ============================================================================
-- FASE 1: UNIFICAR SISTEMA DE CONCILIACIÓN
-- ============================================================================

-- 1.1. Migrar datos de reconciliation_matches a bank_reconciliations
INSERT INTO bank_reconciliations (
  bank_transaction_id,
  matched_type,
  matched_id,
  reconciliation_status,
  confidence_score,
  created_at
)
SELECT 
  transaction_id,
  CASE match_type
    WHEN 'entry' THEN 'entry'
    WHEN 'invoice' THEN 'invoice_received'
    WHEN 'daily_closure' THEN 'daily_closure'
    ELSE 'manual'
  END,
  match_id,
  status,
  confidence_score,
  created_at
FROM reconciliation_matches
WHERE NOT EXISTS (
  SELECT 1 FROM bank_reconciliations br
  WHERE br.bank_transaction_id = reconciliation_matches.transaction_id
);

-- 1.2. Añadir constraint FK (si no existe)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_bank_transactions_reconciliation'
  ) THEN
    ALTER TABLE bank_transactions
    ADD CONSTRAINT fk_bank_transactions_reconciliation
    FOREIGN KEY (reconciliation_id) 
    REFERENCES bank_reconciliations(id) 
    ON DELETE SET NULL;
  END IF;
END $$;

-- 1.3. Añadir índices de performance
CREATE INDEX IF NOT EXISTS idx_bank_transactions_status 
ON bank_transactions(status);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_account_date 
ON bank_transactions(bank_account_id, transaction_date);

CREATE INDEX IF NOT EXISTS idx_bank_reconciliations_transaction 
ON bank_reconciliations(bank_transaction_id);

CREATE INDEX IF NOT EXISTS idx_bank_reconciliations_status 
ON bank_reconciliations(reconciliation_status);

-- 1.4. Añadir CHECK constraint para status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'bank_transactions_status_check'
  ) THEN
    ALTER TABLE bank_transactions
    ADD CONSTRAINT bank_transactions_status_check
    CHECK (status IN ('pending', 'reconciled', 'ignored'));
  END IF;
END $$;

-- ============================================================================
-- FASE 2: CREAR RPC PARA AUTO-MATCHING
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_match_with_rules(
  p_bank_account_id UUID,
  p_centro_code TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 100
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_matches_count INTEGER := 0;
  v_rule RECORD;
  v_transaction RECORD;
  v_centro_code TEXT;
BEGIN
  -- Obtener centro_code del bank_account si no se proporciona
  IF p_centro_code IS NULL THEN
    SELECT centro_code INTO v_centro_code
    FROM bank_accounts
    WHERE id = p_bank_account_id;
  ELSE
    v_centro_code := p_centro_code;
  END IF;

  -- Iterar sobre transacciones pendientes
  FOR v_transaction IN
    SELECT * FROM bank_transactions
    WHERE bank_account_id = p_bank_account_id
    AND status = 'pending'
    AND reconciliation_id IS NULL
    ORDER BY transaction_date DESC
    LIMIT p_limit
  LOOP
    -- Buscar regla aplicable
    FOR v_rule IN
      SELECT * FROM bank_reconciliation_rules
      WHERE (bank_account_id = p_bank_account_id OR bank_account_id IS NULL)
      AND (centro_code = v_centro_code OR centro_code IS NULL)
      AND active = true
      AND (
        -- Coincidir patrón de descripción
        (description_pattern IS NULL OR 
         v_transaction.description ~* description_pattern)
        AND
        -- Coincidir tipo de transacción
        (transaction_type IS NULL OR
         (transaction_type = 'debit' AND v_transaction.amount < 0) OR
         (transaction_type = 'credit' AND v_transaction.amount > 0))
        AND
        -- Coincidir rango de importe
        (amount_min IS NULL OR ABS(v_transaction.amount) >= amount_min)
        AND
        (amount_max IS NULL OR ABS(v_transaction.amount) <= amount_max)
      )
      ORDER BY priority DESC
      LIMIT 1
    LOOP
      -- Crear sugerencia de conciliación
      INSERT INTO bank_reconciliations (
        bank_transaction_id,
        matched_type,
        reconciliation_status,
        confidence_score,
        rule_id,
        metadata
      ) VALUES (
        v_transaction.id,
        v_rule.auto_match_type,
        CASE 
          WHEN v_rule.confidence_threshold >= 90 THEN 'matched'
          ELSE 'suggested'
        END,
        v_rule.confidence_threshold,
        v_rule.id,
        jsonb_build_object(
          'rule_name', v_rule.rule_name,
          'auto_matched', true,
          'matched_at', NOW()
        )
      )
      ON CONFLICT (bank_transaction_id) DO NOTHING;
      
      IF FOUND THEN
        v_matches_count := v_matches_count + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'matches_count', v_matches_count,
    'message', format('Se crearon %s sugerencias de conciliación', v_matches_count)
  );
END;
$$;

-- ============================================================================
-- FASE 4: CONECTAR MOTOR DE SUGERENCIAS
-- ============================================================================

CREATE OR REPLACE FUNCTION suggest_reconciliation_matches(
  p_transaction_id UUID,
  p_centro_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction RECORD;
  v_invoice RECORD;
  v_entry RECORD;
  v_closure RECORD;
  v_confidence INTEGER;
  v_suggestions JSONB := '[]'::JSONB;
BEGIN
  -- Obtener transacción
  SELECT * INTO v_transaction
  FROM bank_transactions
  WHERE id = p_transaction_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Transaction not found'
    );
  END IF;

  -- 1. Buscar facturas recibidas (para débitos)
  IF v_transaction.amount < 0 THEN
    FOR v_invoice IN
      SELECT 
        ir.*,
        -- Calcular score de confianza
        CASE
          -- Match exacto de importe
          WHEN ABS(ir.total_amount - ABS(v_transaction.amount)) < 0.01 THEN 100
          -- Match aproximado ±2€
          WHEN ABS(ir.total_amount - ABS(v_transaction.amount)) <= 2 THEN 85
          -- Match aproximado ±5€
          WHEN ABS(ir.total_amount - ABS(v_transaction.amount)) <= 5 THEN 70
          ELSE 50
        END AS confidence
      FROM invoices_received ir
      WHERE ir.centro_code = p_centro_code
      AND ir.invoice_date BETWEEN (v_transaction.transaction_date - INTERVAL '30 days')
                               AND (v_transaction.transaction_date + INTERVAL '7 days')
      AND ABS(ir.total_amount - ABS(v_transaction.amount)) <= 10
      AND ir.status IN ('approved', 'paid')
      ORDER BY confidence DESC, ABS(ir.invoice_date - v_transaction.transaction_date)
      LIMIT 5
    LOOP
      v_suggestions := v_suggestions || jsonb_build_object(
        'matched_id', v_invoice.id,
        'matched_type', 'invoice_received',
        'invoice_number', v_invoice.invoice_number,
        'supplier_name', v_invoice.supplier_name,
        'amount', v_invoice.total_amount,
        'document_date', v_invoice.invoice_date,
        'confidence_score', v_invoice.confidence,
        'match_reason', format('Factura recibida - Diferencia: €%.2f', 
                               ABS(v_invoice.total_amount - ABS(v_transaction.amount)))
      );
    END LOOP;
  END IF;

  -- 2. Buscar facturas emitidas (para créditos)
  IF v_transaction.amount > 0 THEN
    FOR v_invoice IN
      SELECT 
        ii.*,
        CASE
          WHEN ABS(ii.total_amount - v_transaction.amount) < 0.01 THEN 100
          WHEN ABS(ii.total_amount - v_transaction.amount) <= 2 THEN 85
          WHEN ABS(ii.total_amount - v_transaction.amount) <= 5 THEN 70
          ELSE 50
        END AS confidence
      FROM invoices_issued ii
      WHERE ii.centro_code = p_centro_code
      AND ii.invoice_date BETWEEN (v_transaction.transaction_date - INTERVAL '30 days')
                               AND (v_transaction.transaction_date + INTERVAL '7 days')
      AND ABS(ii.total_amount - v_transaction.amount) <= 10
      AND ii.status IN ('sent', 'paid')
      ORDER BY confidence DESC, ABS(ii.invoice_date - v_transaction.transaction_date)
      LIMIT 5
    LOOP
      v_suggestions := v_suggestions || jsonb_build_object(
        'matched_id', v_invoice.id,
        'matched_type', 'invoice_issued',
        'invoice_number', v_invoice.invoice_number,
        'customer_name', v_invoice.customer_name,
        'amount', v_invoice.total_amount,
        'document_date', v_invoice.invoice_date,
        'confidence_score', v_invoice.confidence,
        'match_reason', format('Factura emitida - Diferencia: €%.2f',
                               ABS(v_invoice.total_amount - v_transaction.amount))
      );
    END LOOP;
  END IF;

  -- 3. Buscar cierres diarios (para créditos - TPV/tarjetas)
  IF v_transaction.amount > 0 THEN
    FOR v_closure IN
      SELECT 
        dc.*,
        CASE
          WHEN ABS(dc.card_amount - v_transaction.amount) < 0.01 THEN 95
          WHEN ABS(dc.total_sales - v_transaction.amount) < 0.01 THEN 90
          WHEN ABS(dc.card_amount - v_transaction.amount) <= 5 THEN 75
          ELSE 50
        END AS confidence
      FROM daily_closures dc
      WHERE dc.centro_code = p_centro_code
      AND dc.closure_date BETWEEN (v_transaction.transaction_date - INTERVAL '5 days')
                               AND (v_transaction.transaction_date + INTERVAL '5 days')
      AND (
        ABS(dc.card_amount - v_transaction.amount) <= 10
        OR ABS(dc.total_sales - v_transaction.amount) <= 10
      )
      ORDER BY confidence DESC, ABS(dc.closure_date - v_transaction.transaction_date)
      LIMIT 3
    LOOP
      v_suggestions := v_suggestions || jsonb_build_object(
        'matched_id', v_closure.id,
        'matched_type', 'daily_closure',
        'document_number', format('Cierre %s', v_closure.closure_date),
        'amount', v_closure.card_amount,
        'document_date', v_closure.closure_date,
        'confidence_score', v_closure.confidence,
        'match_reason', format('Cierre diario TPV - Diferencia: €%.2f',
                               ABS(v_closure.card_amount - v_transaction.amount))
      );
    END LOOP;
  END IF;

  -- 4. Buscar apuntes contables
  FOR v_entry IN
    SELECT 
      ae.*,
      CASE
        WHEN ABS(ae.total_debit - ABS(v_transaction.amount)) < 0.01 THEN 80
        WHEN ABS(ae.total_credit - ABS(v_transaction.amount)) < 0.01 THEN 80
        WHEN ABS(ae.total_debit - ABS(v_transaction.amount)) <= 5 THEN 65
        WHEN ABS(ae.total_credit - ABS(v_transaction.amount)) <= 5 THEN 65
        ELSE 50
      END AS confidence
    FROM accounting_entries ae
    WHERE ae.centro_code = p_centro_code
    AND ae.entry_date BETWEEN (v_transaction.transaction_date - INTERVAL '30 days')
                           AND (v_transaction.transaction_date + INTERVAL '7 days')
    AND ae.status = 'posted'
    AND (
      ABS(ae.total_debit - ABS(v_transaction.amount)) <= 10
      OR ABS(ae.total_credit - ABS(v_transaction.amount)) <= 10
    )
    ORDER BY confidence DESC, ABS(ae.entry_date - v_transaction.transaction_date)
    LIMIT 5
  LOOP
    v_suggestions := v_suggestions || jsonb_build_object(
      'matched_id', v_entry.id,
      'matched_type', 'entry',
      'document_number', format('Asiento %s', v_entry.entry_number),
      'description', v_entry.description,
      'amount', GREATEST(v_entry.total_debit, v_entry.total_credit),
      'document_date', v_entry.entry_date,
      'confidence_score', v_entry.confidence,
      'match_reason', 'Apunte contable manual'
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'suggestions', v_suggestions,
    'total', jsonb_array_length(v_suggestions)
  );
END;
$$;

-- ============================================================================
-- FASE 5: PREVENIR DUPLICADOS EN NORMA 43
-- ============================================================================

-- Crear índice UNIQUE para prevenir duplicados
-- Usa COALESCE para manejar NULL en reference
CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_transactions_unique_import
ON bank_transactions (
  bank_account_id, 
  transaction_date, 
  amount, 
  COALESCE(reference, ''), 
  COALESCE(description, '')
);

-- ============================================================================
-- FASE 6: AÑADIR "UNDO RECONCILIATION"
-- ============================================================================

CREATE OR REPLACE FUNCTION undo_reconciliation(
  p_transaction_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reconciliation_id UUID;
  v_reconciliation RECORD;
BEGIN
  -- Obtener reconciliation_id de la transacción
  SELECT reconciliation_id INTO v_reconciliation_id
  FROM bank_transactions
  WHERE id = p_transaction_id;

  IF v_reconciliation_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'No se encontró conciliación activa'
    );
  END IF;

  -- Obtener datos completos de la conciliación
  SELECT * INTO v_reconciliation
  FROM bank_reconciliations
  WHERE id = v_reconciliation_id;

  -- Actualizar bank_reconciliation como rejected
  UPDATE bank_reconciliations
  SET reconciliation_status = 'rejected',
      notes = COALESCE(notes || E'\n', '') || 
              format('Deshecho por usuario %s el %s', p_user_id, NOW()),
      metadata = COALESCE(metadata, '{}'::jsonb) || 
                 jsonb_build_object(
                   'undone_by', p_user_id,
                   'undone_at', NOW(),
                   'previous_status', reconciliation_status
                 ),
      updated_at = NOW()
  WHERE id = v_reconciliation_id;

  -- Actualizar bank_transaction como pending
  UPDATE bank_transactions
  SET status = 'pending',
      reconciliation_id = NULL,
      matched_entry_id = NULL,
      matched_invoice_id = NULL
  WHERE id = p_transaction_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Conciliación deshecha correctamente'
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION auto_match_with_rules(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION suggest_reconciliation_matches(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION undo_reconciliation(UUID, UUID) TO authenticated;