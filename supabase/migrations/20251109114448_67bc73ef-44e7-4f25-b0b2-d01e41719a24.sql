-- FASE 2: Importadores Operativos - Sumas y Saldos + Libro IVA

-- =====================================================
-- 2.2: Staging table for Sumas y Saldos
-- =====================================================
CREATE TABLE IF NOT EXISTS stg_sumas_saldos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_run_id UUID NOT NULL REFERENCES import_runs(id) ON DELETE CASCADE,
  id_externo TEXT NOT NULL,
  periodo DATE NOT NULL,
  cuenta TEXT NOT NULL,
  debe_acum NUMERIC(12,2) DEFAULT 0,
  haber_acum NUMERIC(12,2) DEFAULT 0,
  saldo_deudor NUMERIC(12,2) DEFAULT 0,
  saldo_acreedor NUMERIC(12,2) DEFAULT 0,
  centro_code TEXT,
  hash TEXT,
  validation_errors JSONB,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stg_sumas_saldos_import_run ON stg_sumas_saldos(import_run_id);
CREATE INDEX idx_stg_sumas_saldos_hash ON stg_sumas_saldos(hash);
CREATE INDEX idx_stg_sumas_saldos_status ON stg_sumas_saldos(status);

-- RLS for stg_sumas_saldos
ALTER TABLE stg_sumas_saldos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage stg_sumas_saldos"
  ON stg_sumas_saldos FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their imports"
  ON stg_sumas_saldos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM import_runs ir
      WHERE ir.id = stg_sumas_saldos.import_run_id
      AND ir.created_by = auth.uid()
    )
  );

-- =====================================================
-- 2.3: Staging tables for Libro IVA
-- =====================================================
CREATE TABLE IF NOT EXISTS stg_iva_emitidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_run_id UUID NOT NULL REFERENCES import_runs(id) ON DELETE CASCADE,
  id_externo TEXT NOT NULL,
  fecha DATE NOT NULL,
  numero TEXT NOT NULL,
  nif_cliente TEXT,
  nombre_cliente TEXT NOT NULL,
  base NUMERIC(12,2) NOT NULL,
  tipo NUMERIC(5,2) NOT NULL,
  cuota NUMERIC(12,2) NOT NULL,
  total NUMERIC(12,2) NOT NULL,
  centro_code TEXT NOT NULL,
  hash TEXT,
  validation_errors JSONB,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stg_iva_recibidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_run_id UUID NOT NULL REFERENCES import_runs(id) ON DELETE CASCADE,
  id_externo TEXT NOT NULL,
  fecha DATE NOT NULL,
  numero TEXT NOT NULL,
  nif_proveedor TEXT,
  nombre_proveedor TEXT NOT NULL,
  base NUMERIC(12,2) NOT NULL,
  tipo NUMERIC(5,2) NOT NULL,
  cuota NUMERIC(12,2) NOT NULL,
  total NUMERIC(12,2) NOT NULL,
  centro_code TEXT NOT NULL,
  hash TEXT,
  validation_errors JSONB,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for IVA tables
CREATE INDEX idx_stg_iva_emitidas_import_run ON stg_iva_emitidas(import_run_id);
CREATE INDEX idx_stg_iva_emitidas_hash ON stg_iva_emitidas(hash);
CREATE INDEX idx_stg_iva_recibidas_import_run ON stg_iva_recibidas(import_run_id);
CREATE INDEX idx_stg_iva_recibidas_hash ON stg_iva_recibidas(hash);

-- RLS for IVA tables
ALTER TABLE stg_iva_emitidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE stg_iva_recibidas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage stg_iva_emitidas"
  ON stg_iva_emitidas FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their iva_emitidas imports"
  ON stg_iva_emitidas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM import_runs ir
      WHERE ir.id = stg_iva_emitidas.import_run_id
      AND ir.created_by = auth.uid()
    )
  );

CREATE POLICY "Admins can manage stg_iva_recibidas"
  ON stg_iva_recibidas FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their iva_recibidas imports"
  ON stg_iva_recibidas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM import_runs ir
      WHERE ir.id = stg_iva_recibidas.import_run_id
      AND ir.created_by = auth.uid()
    )
  );

-- =====================================================
-- RPC: Stage Sumas y Saldos rows
-- =====================================================
CREATE OR REPLACE FUNCTION stage_sumas_saldos_rows(
  p_import_run_id UUID,
  p_rows JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row JSONB;
  v_inserted INTEGER := 0;
  v_errors JSONB := '[]'::JSONB;
  v_hash TEXT;
  v_error_detail TEXT;
BEGIN
  -- Validate import_run exists and user has access
  IF NOT EXISTS (
    SELECT 1 FROM import_runs 
    WHERE id = p_import_run_id 
    AND (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  ) THEN
    RAISE EXCEPTION 'Import run not found or access denied';
  END IF;

  -- Update status to staging
  UPDATE import_runs 
  SET status = 'staging', 
      stats = jsonb_set(COALESCE(stats, '{}'::jsonb), '{rows_total}', to_jsonb(jsonb_array_length(p_rows)))
  WHERE id = p_import_run_id;

  -- Process each row
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    BEGIN
      -- Generate hash for idempotency
      v_hash := encode(digest(v_row::text, 'sha256'), 'hex');

      -- Skip if duplicate
      IF EXISTS (
        SELECT 1 FROM stg_sumas_saldos 
        WHERE import_run_id = p_import_run_id AND hash = v_hash
      ) THEN
        CONTINUE;
      END IF;

      -- Insert row
      INSERT INTO stg_sumas_saldos (
        import_run_id, id_externo, periodo, cuenta,
        debe_acum, haber_acum, saldo_deudor, saldo_acreedor,
        centro_code, hash, status
      ) VALUES (
        p_import_run_id,
        COALESCE(v_row->>'id_externo', gen_random_uuid()::text),
        (v_row->>'periodo')::DATE,
        v_row->>'cuenta',
        COALESCE((v_row->>'debe_acum')::NUMERIC, 0),
        COALESCE((v_row->>'haber_acum')::NUMERIC, 0),
        COALESCE((v_row->>'saldo_deudor')::NUMERIC, 0),
        COALESCE((v_row->>'saldo_acreedor')::NUMERIC, 0),
        v_row->>'centro_code',
        v_hash,
        'validated'
      );

      v_inserted := v_inserted + 1;

    EXCEPTION WHEN OTHERS THEN
      v_error_detail := SQLERRM;
      v_errors := v_errors || jsonb_build_object(
        'row', v_row,
        'error', v_error_detail
      );
    END;
  END LOOP;

  -- Update stats
  UPDATE import_runs
  SET stats = stats || jsonb_build_object(
    'rows_inserted', v_inserted,
    'rows_error', jsonb_array_length(v_errors)
  )
  WHERE id = p_import_run_id;

  RETURN jsonb_build_object(
    'rows_inserted', v_inserted,
    'validation_errors', v_errors
  );
END;
$$;

-- =====================================================
-- RPC: Post Sumas y Saldos
-- =====================================================
CREATE OR REPLACE FUNCTION post_sumas_saldos_import(
  p_import_run_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_centro_code TEXT;
  v_periodo DATE;
  v_entry_id UUID;
  v_entries_created INTEGER := 0;
  v_errors JSONB := '[]'::JSONB;
  v_row RECORD;
  v_entry_number INTEGER;
BEGIN
  -- Update status to posting
  UPDATE import_runs SET status = 'posting' WHERE id = p_import_run_id;

  -- Get centro_code from first row
  SELECT centro_code, periodo INTO v_centro_code, v_periodo
  FROM stg_sumas_saldos
  WHERE import_run_id = p_import_run_id AND status = 'validated'
  LIMIT 1;

  -- Create opening entry
  v_entry_number := COALESCE(
    (SELECT MAX(entry_number) FROM accounting_entries WHERE centro_code = v_centro_code) + 1,
    1
  );

  INSERT INTO accounting_entries (
    entry_number, entry_date, description, centro_code, status, serie
  ) VALUES (
    v_entry_number,
    v_periodo,
    'Asiento de apertura - Sumas y Saldos',
    v_centro_code,
    'posted',
    'APERTURA'
  ) RETURNING id INTO v_entry_id;

  -- Insert lines for debit balances
  FOR v_row IN 
    SELECT * FROM stg_sumas_saldos
    WHERE import_run_id = p_import_run_id 
    AND status = 'validated'
    AND saldo_deudor > 0
  LOOP
    INSERT INTO accounting_transactions (
      entry_id, account_code, movement_type, amount, line_number, description
    ) VALUES (
      v_entry_id,
      v_row.cuenta,
      'debit',
      v_row.saldo_deudor,
      (SELECT COUNT(*) + 1 FROM accounting_transactions WHERE entry_id = v_entry_id),
      'Saldo deudor inicial'
    );
  END LOOP;

  -- Insert lines for credit balances
  FOR v_row IN 
    SELECT * FROM stg_sumas_saldos
    WHERE import_run_id = p_import_run_id 
    AND status = 'validated'
    AND saldo_acreedor > 0
  LOOP
    INSERT INTO accounting_transactions (
      entry_id, account_code, movement_type, amount, line_number, description
    ) VALUES (
      v_entry_id,
      v_row.cuenta,
      'credit',
      v_row.saldo_acreedor,
      (SELECT COUNT(*) + 1 FROM accounting_transactions WHERE entry_id = v_entry_id),
      'Saldo acreedor inicial'
    );
  END LOOP;

  -- Update totals in entry
  UPDATE accounting_entries
  SET 
    total_debit = (SELECT COALESCE(SUM(amount), 0) FROM accounting_transactions WHERE entry_id = v_entry_id AND movement_type = 'debit'),
    total_credit = (SELECT COALESCE(SUM(amount), 0) FROM accounting_transactions WHERE entry_id = v_entry_id AND movement_type = 'credit')
  WHERE id = v_entry_id;

  -- Create journal_source records
  INSERT INTO journal_source (source, import_run_id, id_externo, entry_id, hash)
  SELECT 
    'sumas_saldos',
    p_import_run_id,
    id_externo,
    v_entry_id,
    hash
  FROM stg_sumas_saldos
  WHERE import_run_id = p_import_run_id AND status = 'validated'
  ON CONFLICT (source, id_externo, hash) DO NOTHING;

  v_entries_created := 1;

  -- Mark staging rows as posted
  UPDATE stg_sumas_saldos
  SET status = 'posted'
  WHERE import_run_id = p_import_run_id AND status = 'validated';

  -- Update import_run status
  UPDATE import_runs
  SET 
    status = 'completed',
    finished_at = NOW(),
    stats = stats || jsonb_build_object('entries_created', v_entries_created)
  WHERE id = p_import_run_id;

  RETURN jsonb_build_object(
    'entries_created', v_entries_created,
    'entries_updated', 0,
    'errors', v_errors
  );
END;
$$;

-- =====================================================
-- RPC: Stage IVA Emitidas rows
-- =====================================================
CREATE OR REPLACE FUNCTION stage_iva_emitidas_rows(
  p_import_run_id UUID,
  p_rows JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row JSONB;
  v_inserted INTEGER := 0;
  v_errors JSONB := '[]'::JSONB;
  v_hash TEXT;
  v_error_detail TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM import_runs 
    WHERE id = p_import_run_id 
    AND (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  ) THEN
    RAISE EXCEPTION 'Import run not found or access denied';
  END IF;

  UPDATE import_runs 
  SET status = 'staging', 
      stats = jsonb_set(COALESCE(stats, '{}'::jsonb), '{rows_total}', to_jsonb(jsonb_array_length(p_rows)))
  WHERE id = p_import_run_id;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    BEGIN
      v_hash := encode(digest(v_row::text, 'sha256'), 'hex');

      IF EXISTS (
        SELECT 1 FROM stg_iva_emitidas 
        WHERE import_run_id = p_import_run_id AND hash = v_hash
      ) THEN
        CONTINUE;
      END IF;

      INSERT INTO stg_iva_emitidas (
        import_run_id, id_externo, fecha, numero,
        nif_cliente, nombre_cliente, base, tipo, cuota, total,
        centro_code, hash, status
      ) VALUES (
        p_import_run_id,
        COALESCE(v_row->>'id_externo', gen_random_uuid()::text),
        (v_row->>'fecha')::DATE,
        v_row->>'numero',
        v_row->>'nif_cliente',
        v_row->>'nombre_cliente',
        (v_row->>'base')::NUMERIC,
        (v_row->>'tipo')::NUMERIC,
        (v_row->>'cuota')::NUMERIC,
        (v_row->>'total')::NUMERIC,
        v_row->>'centro_code',
        v_hash,
        'validated'
      );

      v_inserted := v_inserted + 1;

    EXCEPTION WHEN OTHERS THEN
      v_error_detail := SQLERRM;
      v_errors := v_errors || jsonb_build_object(
        'row', v_row,
        'error', v_error_detail
      );
    END;
  END LOOP;

  UPDATE import_runs
  SET stats = stats || jsonb_build_object(
    'rows_inserted', v_inserted,
    'rows_error', jsonb_array_length(v_errors)
  )
  WHERE id = p_import_run_id;

  RETURN jsonb_build_object(
    'rows_inserted', v_inserted,
    'validation_errors', v_errors
  );
END;
$$;

-- =====================================================
-- RPC: Stage IVA Recibidas rows
-- =====================================================
CREATE OR REPLACE FUNCTION stage_iva_recibidas_rows(
  p_import_run_id UUID,
  p_rows JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row JSONB;
  v_inserted INTEGER := 0;
  v_errors JSONB := '[]'::JSONB;
  v_hash TEXT;
  v_error_detail TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM import_runs 
    WHERE id = p_import_run_id 
    AND (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  ) THEN
    RAISE EXCEPTION 'Import run not found or access denied';
  END IF;

  UPDATE import_runs 
  SET status = 'staging', 
      stats = jsonb_set(COALESCE(stats, '{}'::jsonb), '{rows_total}', to_jsonb(jsonb_array_length(p_rows)))
  WHERE id = p_import_run_id;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    BEGIN
      v_hash := encode(digest(v_row::text, 'sha256'), 'hex');

      IF EXISTS (
        SELECT 1 FROM stg_iva_recibidas 
        WHERE import_run_id = p_import_run_id AND hash = v_hash
      ) THEN
        CONTINUE;
      END IF;

      INSERT INTO stg_iva_recibidas (
        import_run_id, id_externo, fecha, numero,
        nif_proveedor, nombre_proveedor, base, tipo, cuota, total,
        centro_code, hash, status
      ) VALUES (
        p_import_run_id,
        COALESCE(v_row->>'id_externo', gen_random_uuid()::text),
        (v_row->>'fecha')::DATE,
        v_row->>'numero',
        v_row->>'nif_proveedor',
        v_row->>'nombre_proveedor',
        (v_row->>'base')::NUMERIC,
        (v_row->>'tipo')::NUMERIC,
        (v_row->>'cuota')::NUMERIC,
        (v_row->>'total')::NUMERIC,
        v_row->>'centro_code',
        v_hash,
        'validated'
      );

      v_inserted := v_inserted + 1;

    EXCEPTION WHEN OTHERS THEN
      v_error_detail := SQLERRM;
      v_errors := v_errors || jsonb_build_object(
        'row', v_row,
        'error', v_error_detail
      );
    END;
  END LOOP;

  UPDATE import_runs
  SET stats = stats || jsonb_build_object(
    'rows_inserted', v_inserted,
    'rows_error', jsonb_array_length(v_errors)
  )
  WHERE id = p_import_run_id;

  RETURN jsonb_build_object(
    'rows_inserted', v_inserted,
    'validation_errors', v_errors
  );
END;
$$;

-- =====================================================
-- RPC: Post IVA Emitidas
-- =====================================================
CREATE OR REPLACE FUNCTION post_iva_emitidas_import(
  p_import_run_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row RECORD;
  v_entry_id UUID;
  v_entries_created INTEGER := 0;
  v_errors JSONB := '[]'::JSONB;
  v_entry_number INTEGER;
BEGIN
  UPDATE import_runs SET status = 'posting' WHERE id = p_import_run_id;

  FOR v_row IN 
    SELECT * FROM stg_iva_emitidas
    WHERE import_run_id = p_import_run_id AND status = 'validated'
  LOOP
    BEGIN
      -- Get next entry number
      v_entry_number := COALESCE(
        (SELECT MAX(entry_number) FROM accounting_entries WHERE centro_code = v_row.centro_code) + 1,
        1
      );

      -- Create entry
      INSERT INTO accounting_entries (
        entry_number, entry_date, description, centro_code, status, serie, total_debit, total_credit
      ) VALUES (
        v_entry_number,
        v_row.fecha,
        'Factura emitida ' || v_row.numero || ' - ' || v_row.nombre_cliente,
        v_row.centro_code,
        'posted',
        'IVEMD',
        v_row.total,
        v_row.total
      ) RETURNING id INTO v_entry_id;

      -- Line 1: Debit 430 (Cliente)
      INSERT INTO accounting_transactions (
        entry_id, account_code, movement_type, amount, line_number, description, document_ref
      ) VALUES (
        v_entry_id, '4300000', 'debit', v_row.total, 1,
        v_row.nombre_cliente, v_row.numero
      );

      -- Line 2: Credit 700 (Ventas)
      INSERT INTO accounting_transactions (
        entry_id, account_code, movement_type, amount, line_number, description, document_ref
      ) VALUES (
        v_entry_id, '7000000', 'credit', v_row.base, 2,
        'Venta mercancías', v_row.numero
      );

      -- Line 3: Credit 477 (IVA Repercutido)
      INSERT INTO accounting_transactions (
        entry_id, account_code, movement_type, amount, line_number, description, document_ref
      ) VALUES (
        v_entry_id, '4770000', 'credit', v_row.cuota, 3,
        'IVA ' || v_row.tipo || '%', v_row.numero
      );

      -- Create journal_source
      INSERT INTO journal_source (source, import_run_id, id_externo, entry_id, hash)
      VALUES ('iva_emitidas', p_import_run_id, v_row.id_externo, v_entry_id, v_row.hash)
      ON CONFLICT (source, id_externo, hash) DO NOTHING;

      v_entries_created := v_entries_created + 1;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || jsonb_build_object(
        'row', to_jsonb(v_row),
        'error', SQLERRM
      );
    END;
  END LOOP;

  UPDATE stg_iva_emitidas
  SET status = 'posted'
  WHERE import_run_id = p_import_run_id AND status = 'validated';

  UPDATE import_runs
  SET 
    status = 'completed',
    finished_at = NOW(),
    stats = stats || jsonb_build_object('entries_created', v_entries_created)
  WHERE id = p_import_run_id;

  RETURN jsonb_build_object(
    'entries_created', v_entries_created,
    'entries_updated', 0,
    'errors', v_errors
  );
END;
$$;

-- =====================================================
-- RPC: Post IVA Recibidas
-- =====================================================
CREATE OR REPLACE FUNCTION post_iva_recibidas_import(
  p_import_run_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row RECORD;
  v_entry_id UUID;
  v_entries_created INTEGER := 0;
  v_errors JSONB := '[]'::JSONB;
  v_entry_number INTEGER;
BEGIN
  UPDATE import_runs SET status = 'posting' WHERE id = p_import_run_id;

  FOR v_row IN 
    SELECT * FROM stg_iva_recibidas
    WHERE import_run_id = p_import_run_id AND status = 'validated'
  LOOP
    BEGIN
      v_entry_number := COALESCE(
        (SELECT MAX(entry_number) FROM accounting_entries WHERE centro_code = v_row.centro_code) + 1,
        1
      );

      INSERT INTO accounting_entries (
        entry_number, entry_date, description, centro_code, status, serie, total_debit, total_credit
      ) VALUES (
        v_entry_number,
        v_row.fecha,
        'Factura recibida ' || v_row.numero || ' - ' || v_row.nombre_proveedor,
        v_row.centro_code,
        'posted',
        'IVRCB',
        v_row.total,
        v_row.total
      ) RETURNING id INTO v_entry_id;

      -- Line 1: Debit 600 (Compras)
      INSERT INTO accounting_transactions (
        entry_id, account_code, movement_type, amount, line_number, description, document_ref
      ) VALUES (
        v_entry_id, '6000000', 'debit', v_row.base, 1,
        'Compra mercancías', v_row.numero
      );

      -- Line 2: Debit 472 (IVA Soportado)
      INSERT INTO accounting_transactions (
        entry_id, account_code, movement_type, amount, line_number, description, document_ref
      ) VALUES (
        v_entry_id, '4720000', 'debit', v_row.cuota, 2,
        'IVA ' || v_row.tipo || '%', v_row.numero
      );

      -- Line 3: Credit 410 (Proveedor)
      INSERT INTO accounting_transactions (
        entry_id, account_code, movement_type, amount, line_number, description, document_ref
      ) VALUES (
        v_entry_id, '4100000', 'credit', v_row.total, 3,
        v_row.nombre_proveedor, v_row.numero
      );

      INSERT INTO journal_source (source, import_run_id, id_externo, entry_id, hash)
      VALUES ('iva_recibidas', p_import_run_id, v_row.id_externo, v_entry_id, v_row.hash)
      ON CONFLICT (source, id_externo, hash) DO NOTHING;

      v_entries_created := v_entries_created + 1;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || jsonb_build_object(
        'row', to_jsonb(v_row),
        'error', SQLERRM
      );
    END;
  END LOOP;

  UPDATE stg_iva_recibidas
  SET status = 'posted'
  WHERE import_run_id = p_import_run_id AND status = 'validated';

  UPDATE import_runs
  SET 
    status = 'completed',
    finished_at = NOW(),
    stats = stats || jsonb_build_object('entries_created', v_entries_created)
  WHERE id = p_import_run_id;

  RETURN jsonb_build_object(
    'entries_created', v_entries_created,
    'entries_updated', 0,
    'errors', v_errors
  );
END;
$$;