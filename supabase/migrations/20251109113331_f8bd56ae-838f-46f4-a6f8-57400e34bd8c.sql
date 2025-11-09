-- Create imports framework tables and functions

-- Import runs tracking table
CREATE TABLE IF NOT EXISTS import_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL CHECK (module IN ('diario', 'sumas_saldos', 'iva_emitidas', 'iva_recibidas', 'norma43')),
  source TEXT NOT NULL CHECK (source IN ('csv', 'xlsx', 'norma43', 'api')),
  filename TEXT,
  centro_code TEXT REFERENCES centres(codigo) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'staging', 'posting', 'completed', 'error')),
  stats JSONB DEFAULT '{}',
  error_log JSONB,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Journal source for idempotency
CREATE TABLE IF NOT EXISTS journal_source (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  import_run_id UUID REFERENCES import_runs(id) ON DELETE CASCADE,
  id_externo TEXT NOT NULL,
  entry_id UUID NOT NULL REFERENCES accounting_entries(id) ON DELETE CASCADE,
  hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_source_id_externo_hash UNIQUE(source, id_externo, hash)
);

-- Staging table for diario imports
CREATE TABLE IF NOT EXISTS stg_diario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_run_id UUID NOT NULL REFERENCES import_runs(id) ON DELETE CASCADE,
  id_externo TEXT NOT NULL,
  fecha DATE NOT NULL,
  cuenta TEXT NOT NULL,
  concepto TEXT,
  debe NUMERIC(12,2) DEFAULT 0,
  haber NUMERIC(12,2) DEFAULT 0,
  centro_code TEXT,
  documento TEXT,
  hash TEXT,
  validation_errors JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'posted', 'error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_import_runs_module_status ON import_runs(module, status);
CREATE INDEX IF NOT EXISTS idx_import_runs_centro_code ON import_runs(centro_code);
CREATE INDEX IF NOT EXISTS idx_import_runs_created_by ON import_runs(created_by);
CREATE INDEX IF NOT EXISTS idx_journal_source_entry_id ON journal_source(entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_source_import_run_id ON journal_source(import_run_id);
CREATE INDEX IF NOT EXISTS idx_stg_diario_import_run_id ON stg_diario(import_run_id);
CREATE INDEX IF NOT EXISTS idx_stg_diario_status ON stg_diario(status);

-- Trigger to update updated_at on import_runs
CREATE OR REPLACE FUNCTION update_import_runs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_import_runs_updated_at ON import_runs;
CREATE TRIGGER trigger_update_import_runs_updated_at
  BEFORE UPDATE ON import_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_import_runs_updated_at();

-- RPC: Start import
CREATE OR REPLACE FUNCTION start_import(
  p_module TEXT,
  p_source TEXT,
  p_filename TEXT,
  p_centro_code TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_import_run_id UUID;
BEGIN
  -- Validate centro_code if provided
  IF p_centro_code IS NOT NULL AND NOT EXISTS (SELECT 1 FROM centres WHERE codigo = p_centro_code) THEN
    RAISE EXCEPTION 'Invalid centro_code: %', p_centro_code;
  END IF;

  -- Create import run
  INSERT INTO import_runs (module, source, filename, centro_code, created_by, status)
  VALUES (p_module, p_source, p_filename, p_centro_code, auth.uid(), 'pending')
  RETURNING id INTO v_import_run_id;

  RETURN v_import_run_id;
END;
$$;

-- RPC: Stage rows for diario
CREATE OR REPLACE FUNCTION stage_diario_rows(
  p_import_run_id UUID,
  p_rows JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row JSONB;
  v_rows_inserted INTEGER := 0;
  v_validation_errors JSONB := '[]'::JSONB;
  v_error JSONB;
  v_hash TEXT;
  v_account_exists BOOLEAN;
BEGIN
  -- Update import run status
  UPDATE import_runs 
  SET status = 'staging', stats = jsonb_set(stats, '{rows_total}', to_jsonb((p_rows->>'length')::INTEGER))
  WHERE id = p_import_run_id;

  -- Process each row
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    v_error := NULL;
    
    -- Validate required fields
    IF v_row->>'fecha' IS NULL THEN
      v_error := jsonb_build_object('row', v_row, 'error', 'Missing fecha');
    ELSIF v_row->>'cuenta' IS NULL THEN
      v_error := jsonb_build_object('row', v_row, 'error', 'Missing cuenta');
    ELSE
      -- Validate account exists
      SELECT EXISTS(SELECT 1 FROM accounts WHERE code = v_row->>'cuenta') INTO v_account_exists;
      IF NOT v_account_exists THEN
        v_error := jsonb_build_object('row', v_row, 'error', 'Account does not exist: ' || (v_row->>'cuenta'));
      END IF;
    END IF;

    -- Generate hash for idempotency
    v_hash := md5(v_row::TEXT);

    IF v_error IS NOT NULL THEN
      v_validation_errors := v_validation_errors || v_error;
    ELSE
      -- Insert into staging
      INSERT INTO stg_diario (
        import_run_id, id_externo, fecha, cuenta, concepto, 
        debe, haber, centro_code, documento, hash, status
      ) VALUES (
        p_import_run_id,
        COALESCE(v_row->>'id_externo', v_hash),
        (v_row->>'fecha')::DATE,
        v_row->>'cuenta',
        v_row->>'concepto',
        COALESCE((v_row->>'debe')::NUMERIC, 0),
        COALESCE((v_row->>'haber')::NUMERIC, 0),
        v_row->>'centro_code',
        v_row->>'documento',
        v_hash,
        'validated'
      )
      ON CONFLICT DO NOTHING; -- Skip duplicates
      
      IF FOUND THEN
        v_rows_inserted := v_rows_inserted + 1;
      END IF;
    END IF;
  END LOOP;

  -- Update stats
  UPDATE import_runs 
  SET stats = jsonb_build_object(
    'rows_total', jsonb_array_length(p_rows),
    'rows_inserted', v_rows_inserted,
    'rows_error', jsonb_array_length(v_validation_errors)
  ),
  error_log = v_validation_errors
  WHERE id = p_import_run_id;

  RETURN jsonb_build_object(
    'rows_inserted', v_rows_inserted,
    'validation_errors', v_validation_errors
  );
END;
$$;

-- RPC: Post diario import
CREATE OR REPLACE FUNCTION post_diario_import(
  p_import_run_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group RECORD;
  v_entry_id UUID;
  v_entries_created INTEGER := 0;
  v_entries_updated INTEGER := 0;
  v_errors JSONB := '[]'::JSONB;
  v_centro_code TEXT;
  v_line_number INTEGER;
BEGIN
  -- Update status
  UPDATE import_runs SET status = 'posting' WHERE id = p_import_run_id;

  -- Get centro_code from import run
  SELECT centro_code INTO v_centro_code FROM import_runs WHERE id = p_import_run_id;

  -- Group by fecha + documento and create entries
  FOR v_group IN 
    SELECT fecha, documento, centro_code, 
           SUM(debe) as total_debit, 
           SUM(haber) as total_credit,
           array_agg(json_build_object(
             'id', id,
             'cuenta', cuenta,
             'concepto', concepto,
             'debe', debe,
             'haber', haber
           ) ORDER BY id) as lines
    FROM stg_diario
    WHERE import_run_id = p_import_run_id 
      AND status = 'validated'
    GROUP BY fecha, documento, centro_code
    HAVING ABS(SUM(debe) - SUM(haber)) < 0.01 -- Balanced check
  LOOP
    -- Check if entry already exists
    SELECT entry_id INTO v_entry_id
    FROM journal_source
    WHERE source = 'diario'
      AND import_run_id = p_import_run_id
      AND id_externo = v_group.documento;

    IF v_entry_id IS NOT NULL THEN
      v_entries_updated := v_entries_updated + 1;
      CONTINUE;
    END IF;

    -- Create accounting entry
    INSERT INTO accounting_entries (
      centro_code, entry_date, description, status,
      total_debit, total_credit, created_by
    ) VALUES (
      COALESCE(v_group.centro_code, v_centro_code),
      v_group.fecha,
      'Imported: ' || COALESCE(v_group.documento, 'No doc'),
      'posted',
      v_group.total_debit,
      v_group.total_credit,
      auth.uid()
    ) RETURNING id INTO v_entry_id;

    -- Create transactions
    v_line_number := 1;
    FOR i IN 0..jsonb_array_length(to_jsonb(v_group.lines)) - 1
    LOOP
      INSERT INTO accounting_transactions (
        entry_id, account_code, movement_type, amount, description, line_number
      ) VALUES (
        v_entry_id,
        (v_group.lines[i]->>'cuenta'),
        CASE WHEN (v_group.lines[i]->>'debe')::NUMERIC > 0 THEN 'debit'::movement_type ELSE 'credit'::movement_type END,
        GREATEST((v_group.lines[i]->>'debe')::NUMERIC, (v_group.lines[i]->>'haber')::NUMERIC),
        (v_group.lines[i]->>'concepto'),
        v_line_number
      );
      v_line_number := v_line_number + 1;
    END LOOP;

    -- Create journal source record
    INSERT INTO journal_source (source, import_run_id, id_externo, entry_id)
    VALUES ('diario', p_import_run_id, v_group.documento, v_entry_id);

    -- Mark staged rows as posted
    UPDATE stg_diario 
    SET status = 'posted'
    WHERE import_run_id = p_import_run_id 
      AND documento = v_group.documento;

    v_entries_created := v_entries_created + 1;
  END LOOP;

  -- Update import run
  UPDATE import_runs 
  SET status = 'completed',
      finished_at = NOW(),
      stats = stats || jsonb_build_object(
        'entries_created', v_entries_created,
        'entries_updated', v_entries_updated
      )
  WHERE id = p_import_run_id;

  RETURN jsonb_build_object(
    'entries_created', v_entries_created,
    'entries_updated', v_entries_updated,
    'errors', v_errors
  );
END;
$$;

-- Enable RLS
ALTER TABLE import_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_source ENABLE ROW LEVEL SECURITY;
ALTER TABLE stg_diario ENABLE ROW LEVEL SECURITY;

-- RLS Policies for import_runs
CREATE POLICY "Users can view their own import runs"
  ON import_runs FOR SELECT
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create import runs for accessible centres"
  ON import_runs FOR INSERT
  WITH CHECK (
    centro_code IS NULL OR 
    centro_code IN (SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their own import runs"
  ON import_runs FOR UPDATE
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for journal_source
CREATE POLICY "Users can view journal sources"
  ON journal_source FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM import_runs ir 
      WHERE ir.id = journal_source.import_run_id 
        AND (ir.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- RLS Policies for stg_diario
CREATE POLICY "Users can view staging data"
  ON stg_diario FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM import_runs ir 
      WHERE ir.id = stg_diario.import_run_id 
        AND (ir.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

CREATE POLICY "System can manage staging data"
  ON stg_diario FOR ALL
  USING (true)
  WITH CHECK (true);