-- Create bank_reconciliation_rules table
CREATE TABLE IF NOT EXISTS bank_reconciliation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_code TEXT REFERENCES centres(codigo) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE CASCADE,
  
  -- Match conditions
  transaction_type TEXT CHECK (transaction_type IN ('debit', 'credit')),
  description_pattern TEXT,
  amount_min NUMERIC,
  amount_max NUMERIC,
  
  -- Match action
  auto_match_type TEXT NOT NULL CHECK (auto_match_type IN ('daily_closure', 'invoice', 'royalty', 'commission', 'manual')),
  suggested_account TEXT,
  confidence_threshold NUMERIC DEFAULT 80 CHECK (confidence_threshold >= 0 AND confidence_threshold <= 100),
  
  active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create bank_reconciliations table
CREATE TABLE IF NOT EXISTS bank_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_transaction_id UUID NOT NULL UNIQUE REFERENCES bank_transactions(id) ON DELETE CASCADE,
  
  matched_type TEXT CHECK (matched_type IN ('daily_closure', 'invoice_received', 'invoice_issued', 'entry', 'manual')),
  matched_id UUID,
  
  reconciliation_status TEXT DEFAULT 'pending' CHECK (reconciliation_status IN ('pending', 'suggested', 'matched', 'reviewed', 'confirmed', 'rejected')),
  confidence_score NUMERIC CHECK (confidence_score >= 0 AND confidence_score <= 100),
  
  rule_id UUID REFERENCES bank_reconciliation_rules(id) ON DELETE SET NULL,
  reconciled_by UUID REFERENCES profiles(id),
  reconciled_at TIMESTAMPTZ,
  
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE bank_reconciliation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_reconciliations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bank_reconciliation_rules
CREATE POLICY "Users can view rules for accessible centres"
  ON bank_reconciliation_rules FOR SELECT
  USING (
    centro_code IN (
      SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
    ) OR
    has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can create rules for accessible centres"
  ON bank_reconciliation_rules FOR INSERT
  WITH CHECK (
    centro_code IN (
      SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update rules for accessible centres"
  ON bank_reconciliation_rules FOR UPDATE
  USING (
    centro_code IN (
      SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all rules"
  ON bank_reconciliation_rules FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for bank_reconciliations
CREATE POLICY "Users can view reconciliations for accessible accounts"
  ON bank_reconciliations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bank_transactions bt
      JOIN bank_accounts ba ON ba.id = bt.bank_account_id
      WHERE bt.id = bank_reconciliations.bank_transaction_id
        AND ba.centro_code IN (
          SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
        )
    ) OR
    has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can create reconciliations for accessible accounts"
  ON bank_reconciliations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bank_transactions bt
      JOIN bank_accounts ba ON ba.id = bt.bank_account_id
      WHERE bt.id = bank_reconciliations.bank_transaction_id
        AND ba.centro_code IN (
          SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
        )
    )
  );

CREATE POLICY "Users can update reconciliations for accessible accounts"
  ON bank_reconciliations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM bank_transactions bt
      JOIN bank_accounts ba ON ba.id = bt.bank_account_id
      WHERE bt.id = bank_reconciliations.bank_transaction_id
        AND ba.centro_code IN (
          SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
        )
    )
  );

CREATE POLICY "Admins can manage all reconciliations"
  ON bank_reconciliations FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_bank_reconciliations_transaction ON bank_reconciliations(bank_transaction_id);
CREATE INDEX idx_bank_reconciliations_status ON bank_reconciliations(reconciliation_status);
CREATE INDEX idx_bank_reconciliation_rules_centro ON bank_reconciliation_rules(centro_code);
CREATE INDEX idx_bank_reconciliation_rules_active ON bank_reconciliation_rules(active) WHERE active = true;

-- Function to auto-match bank transactions
CREATE OR REPLACE FUNCTION auto_match_bank_transactions(p_bank_account_id UUID, p_limit INTEGER DEFAULT 100)
RETURNS TABLE(
  transaction_id UUID,
  matched_type TEXT,
  matched_id UUID,
  confidence_score NUMERIC,
  rule_id UUID
) AS $$
DECLARE
  v_transaction RECORD;
  v_rule RECORD;
  v_match RECORD;
  v_confidence NUMERIC;
BEGIN
  -- Get unreconciled transactions
  FOR v_transaction IN
    SELECT bt.* 
    FROM bank_transactions bt
    LEFT JOIN bank_reconciliations br ON br.bank_transaction_id = bt.id
    WHERE bt.bank_account_id = p_bank_account_id
      AND bt.status = 'pending'
      AND br.id IS NULL
    ORDER BY bt.transaction_date DESC
    LIMIT p_limit
  LOOP
    -- Try to match with active rules in priority order
    FOR v_rule IN
      SELECT * FROM bank_reconciliation_rules
      WHERE bank_account_id = p_bank_account_id
        AND active = true
      ORDER BY priority DESC, created_at ASC
    LOOP
      v_confidence := 0;
      
      -- Check transaction type
      IF v_rule.transaction_type IS NOT NULL THEN
        IF (v_rule.transaction_type = 'credit' AND v_transaction.amount > 0) OR
           (v_rule.transaction_type = 'debit' AND v_transaction.amount < 0) THEN
          v_confidence := v_confidence + 20;
        ELSE
          CONTINUE;
        END IF;
      END IF;
      
      -- Check amount range
      IF v_rule.amount_min IS NOT NULL OR v_rule.amount_max IS NOT NULL THEN
        IF ABS(v_transaction.amount) >= COALESCE(v_rule.amount_min, 0) AND
           ABS(v_transaction.amount) <= COALESCE(v_rule.amount_max, 999999999) THEN
          v_confidence := v_confidence + 20;
        ELSE
          CONTINUE;
        END IF;
      END IF;
      
      -- Check description pattern
      IF v_rule.description_pattern IS NOT NULL THEN
        IF v_transaction.description ~* v_rule.description_pattern THEN
          v_confidence := v_confidence + 40;
        ELSE
          CONTINUE;
        END IF;
      END IF;
      
      -- Try to find specific match based on type
      IF v_rule.auto_match_type = 'daily_closure' THEN
        -- Match with daily closures (card amounts)
        SELECT dc.id, 85 as score INTO v_match
        FROM daily_closures dc
        WHERE dc.centro_code = (
          SELECT centro_code FROM bank_accounts WHERE id = p_bank_account_id
        )
        AND ABS(dc.card_amount - ABS(v_transaction.amount)) < 1
        AND dc.closure_date BETWEEN v_transaction.transaction_date - INTERVAL '3 days' 
                                 AND v_transaction.transaction_date + INTERVAL '3 days'
        ORDER BY ABS(dc.card_amount - ABS(v_transaction.amount)) ASC
        LIMIT 1;
        
        IF FOUND THEN
          v_confidence := v_confidence + v_match.score;
        END IF;
        
      ELSIF v_rule.auto_match_type = 'invoice' THEN
        -- Match with invoices
        IF v_transaction.amount < 0 THEN
          -- Debit: match with invoices_received (payments)
          SELECT ir.id, 80 as score INTO v_match
          FROM invoices_received ir
          WHERE ir.centro_code = (
            SELECT centro_code FROM bank_accounts WHERE id = p_bank_account_id
          )
          AND ABS(ir.total_amount - ABS(v_transaction.amount)) < 1
          AND ir.status = 'approved'
          ORDER BY ABS(ir.total_amount - ABS(v_transaction.amount)) ASC
          LIMIT 1;
        ELSE
          -- Credit: match with invoices_issued (collections)
          SELECT ii.id, 80 as score INTO v_match
          FROM invoices_issued ii
          WHERE ii.centro_code = (
            SELECT centro_code FROM bank_accounts WHERE id = p_bank_account_id
          )
          AND ABS(ii.total_amount - ABS(v_transaction.amount)) < 1
          AND ii.status = 'sent'
          ORDER BY ABS(ii.total_amount - ABS(v_transaction.amount)) ASC
          LIMIT 1;
        END IF;
        
        IF FOUND THEN
          v_confidence := v_confidence + v_match.score;
        END IF;
      END IF;
      
      -- If confidence is above threshold, create suggested reconciliation
      IF v_confidence >= v_rule.confidence_threshold THEN
        INSERT INTO bank_reconciliations (
          bank_transaction_id,
          matched_type,
          matched_id,
          reconciliation_status,
          confidence_score,
          rule_id
        ) VALUES (
          v_transaction.id,
          v_rule.auto_match_type,
          v_match.id,
          CASE WHEN v_confidence >= 90 THEN 'matched' ELSE 'suggested' END,
          v_confidence,
          v_rule.id
        )
        ON CONFLICT (bank_transaction_id) DO NOTHING;
        
        RETURN QUERY SELECT 
          v_transaction.id,
          v_rule.auto_match_type,
          v_match.id,
          v_confidence,
          v_rule.id;
        
        EXIT; -- Stop checking rules for this transaction
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at
CREATE TRIGGER update_bank_reconciliation_rules_updated_at
  BEFORE UPDATE ON bank_reconciliation_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_reconciliations_updated_at
  BEFORE UPDATE ON bank_reconciliations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();