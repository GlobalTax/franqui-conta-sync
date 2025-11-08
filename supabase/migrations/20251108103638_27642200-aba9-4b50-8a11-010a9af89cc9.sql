-- Create daily_closures table for daily sales closures
CREATE TABLE IF NOT EXISTS daily_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_code TEXT NOT NULL REFERENCES centres(codigo) ON DELETE CASCADE,
  closure_date DATE NOT NULL,
  
  -- Sales by channel
  sales_in_store NUMERIC DEFAULT 0,
  sales_drive_thru NUMERIC DEFAULT 0,
  sales_delivery NUMERIC DEFAULT 0,
  sales_kiosk NUMERIC DEFAULT 0,
  total_sales NUMERIC GENERATED ALWAYS AS (
    sales_in_store + sales_drive_thru + sales_delivery + sales_kiosk
  ) STORED,
  
  -- VAT/IVA
  tax_10_base NUMERIC DEFAULT 0,
  tax_10_amount NUMERIC DEFAULT 0,
  tax_21_base NUMERIC DEFAULT 0,
  tax_21_amount NUMERIC DEFAULT 0,
  total_tax NUMERIC DEFAULT 0,
  
  -- Payment methods
  cash_amount NUMERIC DEFAULT 0,
  card_amount NUMERIC DEFAULT 0,
  delivery_amount NUMERIC DEFAULT 0,
  
  -- Commissions and royalties
  delivery_commission NUMERIC DEFAULT 0,
  royalty_amount NUMERIC DEFAULT 0,
  marketing_fee NUMERIC DEFAULT 0,
  
  -- Cash reconciliation (arqueo)
  expected_cash NUMERIC DEFAULT 0,
  actual_cash NUMERIC DEFAULT 0,
  cash_difference NUMERIC GENERATED ALWAYS AS (actual_cash - expected_cash) STORED,
  
  -- Status control
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'validated_manager', 'posted', 'closed')),
  validated_by UUID REFERENCES profiles(id),
  validated_at TIMESTAMPTZ,
  posted_by UUID REFERENCES profiles(id),
  posted_at TIMESTAMPTZ,
  accounting_entry_id UUID REFERENCES accounting_entries(id),
  
  -- POS data
  pos_data JSONB,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(centro_code, closure_date)
);

-- Enable RLS
ALTER TABLE daily_closures ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view closures for accessible centres"
  ON daily_closures FOR SELECT
  USING (
    centro_code IN (
      SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create closures for accessible centres"
  ON daily_closures FOR INSERT
  WITH CHECK (
    centro_code IN (
      SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update draft closures"
  ON daily_closures FOR UPDATE
  USING (
    status = 'draft' AND
    centro_code IN (
      SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all closures"
  ON daily_closures FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Function to generate accounting entry from daily closure
CREATE OR REPLACE FUNCTION generate_daily_closure_entry(closure_id UUID)
RETURNS UUID AS $$
DECLARE
  v_closure daily_closures%ROWTYPE;
  v_entry_id UUID;
  v_line_number INT := 1;
BEGIN
  -- Get closure data
  SELECT * INTO v_closure FROM daily_closures WHERE id = closure_id;
  
  IF v_closure.id IS NULL THEN
    RAISE EXCEPTION 'Closure not found';
  END IF;
  
  IF v_closure.accounting_entry_id IS NOT NULL THEN
    RAISE EXCEPTION 'Entry already exists for this closure';
  END IF;
  
  -- Create accounting entry
  INSERT INTO accounting_entries (
    centro_code,
    entry_date,
    description,
    status,
    total_debit,
    total_credit,
    created_by
  ) VALUES (
    v_closure.centro_code,
    v_closure.closure_date,
    'Cierre diario ventas ' || v_closure.closure_date::TEXT,
    'posted',
    v_closure.total_sales,
    v_closure.total_sales,
    auth.uid()
  ) RETURNING id INTO v_entry_id;
  
  -- Debit: Cash (570)
  IF v_closure.cash_amount > 0 THEN
    INSERT INTO accounting_transactions (
      entry_id, account_code, movement_type, amount, description, line_number
    ) VALUES (
      v_entry_id, '570', 'debit', v_closure.cash_amount, 'Efectivo', v_line_number
    );
    v_line_number := v_line_number + 1;
  END IF;
  
  -- Debit: Bank/TPV (572)
  IF v_closure.card_amount > 0 THEN
    INSERT INTO accounting_transactions (
      entry_id, account_code, movement_type, amount, description, line_number
    ) VALUES (
      v_entry_id, '572', 'debit', v_closure.card_amount, 'TPV/Tarjetas', v_line_number
    );
    v_line_number := v_line_number + 1;
  END IF;
  
  -- Debit: Delivery platforms (431)
  IF v_closure.delivery_amount > 0 THEN
    INSERT INTO accounting_transactions (
      entry_id, account_code, movement_type, amount, description, line_number
    ) VALUES (
      v_entry_id, '431', 'debit', v_closure.delivery_amount - v_closure.delivery_commission, 'Delivery neto', v_line_number
    );
    v_line_number := v_line_number + 1;
  END IF;
  
  -- Credit: Sales 10% VAT (700)
  IF v_closure.tax_10_base > 0 THEN
    INSERT INTO accounting_transactions (
      entry_id, account_code, movement_type, amount, description, line_number
    ) VALUES (
      v_entry_id, '700', 'credit', v_closure.tax_10_base, 'Ventas base 10%', v_line_number
    );
    v_line_number := v_line_number + 1;
  END IF;
  
  -- Credit: Sales 21% VAT (700)
  IF v_closure.tax_21_base > 0 THEN
    INSERT INTO accounting_transactions (
      entry_id, account_code, movement_type, amount, description, line_number
    ) VALUES (
      v_entry_id, '700', 'credit', v_closure.tax_21_base, 'Ventas base 21%', v_line_number
    );
    v_line_number := v_line_number + 1;
  END IF;
  
  -- Credit: VAT collected (477)
  IF v_closure.total_tax > 0 THEN
    INSERT INTO accounting_transactions (
      entry_id, account_code, movement_type, amount, description, line_number
    ) VALUES (
      v_entry_id, '477', 'credit', v_closure.total_tax, 'IVA repercutido', v_line_number
    );
    v_line_number := v_line_number + 1;
  END IF;
  
  -- Debit: Delivery commission (629)
  IF v_closure.delivery_commission > 0 THEN
    INSERT INTO accounting_transactions (
      entry_id, account_code, movement_type, amount, description, line_number
    ) VALUES (
      v_entry_id, '629', 'debit', v_closure.delivery_commission, 'Comisión delivery', v_line_number
    );
    v_line_number := v_line_number + 1;
    
    -- Credit: Delivery commission payable (410)
    INSERT INTO accounting_transactions (
      entry_id, account_code, movement_type, amount, description, line_number
    ) VALUES (
      v_entry_id, '410', 'credit', v_closure.delivery_commission, 'Comisión delivery a pagar', v_line_number
    );
    v_line_number := v_line_number + 1;
  END IF;
  
  -- Update closure with entry_id
  UPDATE daily_closures 
  SET accounting_entry_id = v_entry_id,
      status = 'posted',
      posted_by = auth.uid(),
      posted_at = NOW()
  WHERE id = closure_id;
  
  RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at
CREATE TRIGGER update_daily_closures_updated_at
  BEFORE UPDATE ON daily_closures
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();