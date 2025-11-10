-- ============================================================================
-- MIGRATION: Tablas staging para TPV y Nóminas
-- Purpose: Importadores de ventas por canal (TPV) y gastos de personal (Nóminas)
-- Fecha: 2025-01-11
-- Ejecutar manualmente en Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- TABLA: stg_tpv (Ventas por canal - McDonald's)
-- ============================================================================
CREATE TABLE IF NOT EXISTS stg_tpv (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_run_id UUID NOT NULL REFERENCES import_runs(id) ON DELETE CASCADE,
  row_num INTEGER NOT NULL,
  
  -- Dimensiones
  fecha DATE NOT NULL,
  centro_code TEXT NOT NULL,
  canal TEXT NOT NULL CHECK (canal IN ('dine_in', 'drive_thru', 'delivery', 'takeaway', 'mccafe', 'kiosk')),
  turno TEXT CHECK (turno IN ('breakfast', 'lunch', 'dinner', 'late_night')),
  
  -- Importes
  ventas_netas NUMERIC(15,2) NOT NULL,
  iva_repercutido NUMERIC(15,2) DEFAULT 0,
  propinas NUMERIC(15,2) DEFAULT 0,
  descuentos NUMERIC(15,2) DEFAULT 0,
  
  -- Desglose productos (opcional)
  food_sales NUMERIC(15,2),
  beverage_sales NUMERIC(15,2),
  dessert_sales NUMERIC(15,2),
  
  -- Métricas operativas
  num_transacciones INTEGER,
  ticket_medio NUMERIC(10,2),
  
  -- Control
  hash TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'valid', 'error', 'posted')),
  error_detail TEXT,
  posted_entry_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(import_run_id, hash)
);

CREATE INDEX idx_stg_tpv_import_run ON stg_tpv(import_run_id);
CREATE INDEX idx_stg_tpv_hash ON stg_tpv(hash);
CREATE INDEX idx_stg_tpv_status ON stg_tpv(status);
CREATE INDEX idx_stg_tpv_fecha ON stg_tpv(fecha);
CREATE INDEX idx_stg_tpv_centro ON stg_tpv(centro_code);

-- RLS
ALTER TABLE stg_tpv ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage stg_tpv"
  ON stg_tpv FOR ALL
  USING (auth.jwt()->>'role' = 'admin');

CREATE POLICY "Users can view own imports stg_tpv"
  ON stg_tpv FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM import_runs ir 
      WHERE ir.id = stg_tpv.import_run_id 
        AND ir.created_by = auth.uid()::text
    )
  );

-- ============================================================================
-- TABLA: stg_nominas (Gastos de personal - Grupo 64 PGC)
-- ============================================================================
CREATE TABLE IF NOT EXISTS stg_nominas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_run_id UUID NOT NULL REFERENCES import_runs(id) ON DELETE CASCADE,
  row_num INTEGER NOT NULL,
  
  -- Identificación
  fecha DATE NOT NULL,
  centro_code TEXT NOT NULL,
  empleado_nif TEXT,
  empleado_nombre TEXT,
  
  -- Conceptos retributivos (grupo 64)
  sueldos_salarios NUMERIC(15,2) DEFAULT 0, -- 640
  seguridad_social_cargo NUMERIC(15,2) DEFAULT 0, -- 642
  otros_gastos_sociales NUMERIC(15,2) DEFAULT 0, -- 649
  indemnizaciones NUMERIC(15,2) DEFAULT 0, -- 641
  
  -- Retenciones
  retencion_irpf NUMERIC(15,2) DEFAULT 0,
  seguridad_social_empleado NUMERIC(15,2) DEFAULT 0,
  
  -- Totales
  importe_bruto NUMERIC(15,2) NOT NULL,
  importe_neto NUMERIC(15,2) NOT NULL,
  
  -- Metadata
  periodo_liquidacion TEXT, -- "2025-01"
  tipo_nomina TEXT CHECK (tipo_nomina IN ('mensual', 'extraordinaria', 'finiquito')),
  
  -- Control
  hash TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'valid', 'error', 'posted')),
  error_detail TEXT,
  posted_entry_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(import_run_id, hash)
);

CREATE INDEX idx_stg_nominas_import_run ON stg_nominas(import_run_id);
CREATE INDEX idx_stg_nominas_hash ON stg_nominas(hash);
CREATE INDEX idx_stg_nominas_status ON stg_nominas(status);
CREATE INDEX idx_stg_nominas_fecha ON stg_nominas(fecha);
CREATE INDEX idx_stg_nominas_centro ON stg_nominas(centro_code);

-- RLS
ALTER TABLE stg_nominas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage stg_nominas"
  ON stg_nominas FOR ALL
  USING (auth.jwt()->>'role' = 'admin');

CREATE POLICY "Users can view own imports stg_nominas"
  ON stg_nominas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM import_runs ir 
      WHERE ir.id = stg_nominas.import_run_id 
        AND ir.created_by = auth.uid()::text
    )
  );

-- ============================================================================
-- RPC: stage_tpv_rows
-- Purpose: Validar y cargar filas TPV en staging
-- ============================================================================
CREATE OR REPLACE FUNCTION stage_tpv_rows(
  p_import_run_id UUID,
  p_rows JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row JSONB;
  v_row_num INTEGER := 0;
  v_inserted INTEGER := 0;
  v_errors INTEGER := 0;
  v_hash TEXT;
  v_fecha DATE;
  v_centro_code TEXT;
  v_canal TEXT;
  v_ventas_netas NUMERIC;
BEGIN
  -- Validar import_run_id
  IF NOT EXISTS (SELECT 1 FROM import_runs WHERE id = p_import_run_id) THEN
    RAISE EXCEPTION 'Import run % no existe', p_import_run_id;
  END IF;

  -- Procesar cada fila
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    v_row_num := v_row_num + 1;
    
    BEGIN
      -- Extraer y validar campos obligatorios
      v_fecha := (v_row->>'fecha')::DATE;
      v_centro_code := v_row->>'centro_code';
      v_canal := LOWER(v_row->>'canal');
      v_ventas_netas := (v_row->>'ventas_netas')::NUMERIC;
      
      -- Validar canal
      IF v_canal NOT IN ('dine_in', 'drive_thru', 'delivery', 'takeaway', 'mccafe', 'kiosk') THEN
        RAISE EXCEPTION 'Canal inválido: %', v_canal;
      END IF;
      
      -- Validar importe positivo
      IF v_ventas_netas <= 0 THEN
        RAISE EXCEPTION 'Ventas netas deben ser positivas';
      END IF;
      
      -- Generar hash para deduplicación
      v_hash := MD5(
        COALESCE(v_fecha::TEXT, '') || 
        COALESCE(v_centro_code, '') || 
        COALESCE(v_canal, '') || 
        COALESCE(v_ventas_netas::TEXT, '')
      );
      
      -- Verificar duplicados
      IF EXISTS (
        SELECT 1 FROM stg_tpv 
        WHERE import_run_id = p_import_run_id AND hash = v_hash
      ) THEN
        CONTINUE; -- Skip duplicados
      END IF;
      
      -- Insertar en staging
      INSERT INTO stg_tpv (
        import_run_id, row_num, fecha, centro_code, canal,
        turno, ventas_netas, iva_repercutido, propinas, descuentos,
        food_sales, beverage_sales, dessert_sales,
        num_transacciones, ticket_medio, hash, status
      ) VALUES (
        p_import_run_id, v_row_num, v_fecha, v_centro_code, v_canal,
        v_row->>'turno',
        v_ventas_netas,
        COALESCE((v_row->>'iva_repercutido')::NUMERIC, 0),
        COALESCE((v_row->>'propinas')::NUMERIC, 0),
        COALESCE((v_row->>'descuentos')::NUMERIC, 0),
        COALESCE((v_row->>'food_sales')::NUMERIC, 0),
        COALESCE((v_row->>'beverage_sales')::NUMERIC, 0),
        COALESCE((v_row->>'dessert_sales')::NUMERIC, 0),
        COALESCE((v_row->>'num_transacciones')::INTEGER, 0),
        COALESCE((v_row->>'ticket_medio')::NUMERIC, 0),
        v_hash,
        'valid'
      );
      
      v_inserted := v_inserted + 1;
      
    EXCEPTION WHEN OTHERS THEN
      -- Insertar fila con error
      INSERT INTO stg_tpv (
        import_run_id, row_num, status, error_detail, hash
      ) VALUES (
        p_import_run_id, v_row_num, 'error', SQLERRM, 
        MD5(v_row_num::TEXT || NOW()::TEXT)
      );
      v_errors := v_errors + 1;
    END;
  END LOOP;
  
  -- Actualizar stats en import_run
  UPDATE import_runs
  SET 
    stats = jsonb_set(
      COALESCE(stats, '{}'::jsonb),
      '{rows_total}', to_jsonb(v_row_num)
    ) ||
    jsonb_set(
      COALESCE(stats, '{}'::jsonb),
      '{rows_inserted}', to_jsonb(v_inserted)
    ) ||
    jsonb_set(
      COALESCE(stats, '{}'::jsonb),
      '{rows_error}', to_jsonb(v_errors)
    ),
    status = 'staging',
    updated_at = NOW()
  WHERE id = p_import_run_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'rows_total', v_row_num,
    'rows_inserted', v_inserted,
    'rows_error', v_errors
  );
END;
$$;

-- ============================================================================
-- RPC: stage_nominas_rows
-- Purpose: Validar y cargar filas de nóminas en staging
-- ============================================================================
CREATE OR REPLACE FUNCTION stage_nominas_rows(
  p_import_run_id UUID,
  p_rows JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row JSONB;
  v_row_num INTEGER := 0;
  v_inserted INTEGER := 0;
  v_errors INTEGER := 0;
  v_hash TEXT;
  v_fecha DATE;
  v_centro_code TEXT;
  v_importe_bruto NUMERIC;
  v_importe_neto NUMERIC;
BEGIN
  -- Validar import_run_id
  IF NOT EXISTS (SELECT 1 FROM import_runs WHERE id = p_import_run_id) THEN
    RAISE EXCEPTION 'Import run % no existe', p_import_run_id;
  END IF;

  -- Procesar cada fila
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    v_row_num := v_row_num + 1;
    
    BEGIN
      -- Extraer y validar campos obligatorios
      v_fecha := (v_row->>'fecha')::DATE;
      v_centro_code := v_row->>'centro_code';
      v_importe_bruto := (v_row->>'importe_bruto')::NUMERIC;
      v_importe_neto := (v_row->>'importe_neto')::NUMERIC;
      
      -- Validar importes positivos
      IF v_importe_bruto <= 0 OR v_importe_neto <= 0 THEN
        RAISE EXCEPTION 'Importes deben ser positivos';
      END IF;
      
      -- Validar coherencia bruto >= neto
      IF v_importe_bruto < v_importe_neto THEN
        RAISE EXCEPTION 'Importe bruto debe ser >= neto';
      END IF;
      
      -- Generar hash para deduplicación
      v_hash := MD5(
        COALESCE(v_fecha::TEXT, '') || 
        COALESCE(v_centro_code, '') || 
        COALESCE(v_row->>'empleado_nif', '') ||
        COALESCE(v_importe_bruto::TEXT, '')
      );
      
      -- Verificar duplicados
      IF EXISTS (
        SELECT 1 FROM stg_nominas 
        WHERE import_run_id = p_import_run_id AND hash = v_hash
      ) THEN
        CONTINUE; -- Skip duplicados
      END IF;
      
      -- Insertar en staging
      INSERT INTO stg_nominas (
        import_run_id, row_num, fecha, centro_code,
        empleado_nif, empleado_nombre,
        sueldos_salarios, seguridad_social_cargo, otros_gastos_sociales,
        indemnizaciones, retencion_irpf, seguridad_social_empleado,
        importe_bruto, importe_neto, periodo_liquidacion, tipo_nomina,
        hash, status
      ) VALUES (
        p_import_run_id, v_row_num, v_fecha, v_centro_code,
        v_row->>'empleado_nif', v_row->>'empleado_nombre',
        COALESCE((v_row->>'sueldos_salarios')::NUMERIC, 0),
        COALESCE((v_row->>'seguridad_social_cargo')::NUMERIC, 0),
        COALESCE((v_row->>'otros_gastos_sociales')::NUMERIC, 0),
        COALESCE((v_row->>'indemnizaciones')::NUMERIC, 0),
        COALESCE((v_row->>'retencion_irpf')::NUMERIC, 0),
        COALESCE((v_row->>'seguridad_social_empleado')::NUMERIC, 0),
        v_importe_bruto, v_importe_neto,
        v_row->>'periodo_liquidacion',
        v_row->>'tipo_nomina',
        v_hash,
        'valid'
      );
      
      v_inserted := v_inserted + 1;
      
    EXCEPTION WHEN OTHERS THEN
      -- Insertar fila con error
      INSERT INTO stg_nominas (
        import_run_id, row_num, status, error_detail, hash
      ) VALUES (
        p_import_run_id, v_row_num, 'error', SQLERRM, 
        MD5(v_row_num::TEXT || NOW()::TEXT)
      );
      v_errors := v_errors + 1;
    END;
  END LOOP;
  
  -- Actualizar stats en import_run
  UPDATE import_runs
  SET 
    stats = jsonb_set(
      COALESCE(stats, '{}'::jsonb),
      '{rows_total}', to_jsonb(v_row_num)
    ) ||
    jsonb_set(
      COALESCE(stats, '{}'::jsonb),
      '{rows_inserted}', to_jsonb(v_inserted)
    ) ||
    jsonb_set(
      COALESCE(stats, '{}'::jsonb),
      '{rows_error}', to_jsonb(v_errors)
    ),
    status = 'staging',
    updated_at = NOW()
  WHERE id = p_import_run_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'rows_total', v_row_num,
    'rows_inserted', v_inserted,
    'rows_error', v_errors
  );
END;
$$;

-- ============================================================================
-- RPC: post_tpv_import
-- Purpose: Crear asientos contables desde stg_tpv
-- ============================================================================
CREATE OR REPLACE FUNCTION post_tpv_import(p_import_run_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry_id UUID;
  v_entries_created INTEGER := 0;
  v_row RECORD;
  v_fiscal_year_id UUID;
  v_entry_number INTEGER;
  v_cuenta_ventas TEXT := '7000000'; -- Ventas mercaderías
  v_cuenta_caja TEXT := '5700000'; -- Caja
  v_cuenta_iva_repercutido TEXT := '4770000'; -- IVA repercutido
BEGIN
  -- Validar import_run
  IF NOT EXISTS (SELECT 1 FROM import_runs WHERE id = p_import_run_id AND module = 'tpv') THEN
    RAISE EXCEPTION 'Import run % no existe o no es TPV', p_import_run_id;
  END IF;

  -- Procesar filas válidas agrupadas por fecha y centro
  FOR v_row IN 
    SELECT 
      fecha, centro_code, canal,
      SUM(ventas_netas) as total_ventas,
      SUM(iva_repercutido) as total_iva,
      COUNT(*) as num_rows,
      ARRAY_AGG(id) as row_ids
    FROM stg_tpv
    WHERE import_run_id = p_import_run_id AND status = 'valid'
    GROUP BY fecha, centro_code, canal
  LOOP
    -- Obtener fiscal_year_id
    SELECT id INTO v_fiscal_year_id
    FROM fiscal_years
    WHERE centro_code = v_row.centro_code
      AND v_row.fecha BETWEEN start_date AND end_date
    LIMIT 1;
    
    IF v_fiscal_year_id IS NULL THEN
      RAISE EXCEPTION 'No hay ejercicio fiscal para centro % en fecha %', v_row.centro_code, v_row.fecha;
    END IF;
    
    -- Obtener próximo número de asiento
    SELECT COALESCE(MAX(entry_number), 0) + 1 INTO v_entry_number
    FROM journal_entries
    WHERE fiscal_year_id = v_fiscal_year_id;
    
    -- Crear journal_entry
    INSERT INTO journal_entries (
      fiscal_year_id, entry_number, entry_date, description,
      centro_code, total_debit, total_credit, status, entry_type
    ) VALUES (
      v_fiscal_year_id, v_entry_number, v_row.fecha,
      'Ventas TPV - Canal ' || v_row.canal,
      v_row.centro_code,
      v_row.total_ventas + v_row.total_iva,
      v_row.total_ventas + v_row.total_iva,
      'posted',
      'tpv_import'
    ) RETURNING id INTO v_entry_id;
    
    -- Línea 1: Caja (DEBE)
    INSERT INTO journal_transactions (
      journal_entry_id, line_number, account_code, movement_type,
      amount, description
    ) VALUES (
      v_entry_id, 1, v_cuenta_caja, 'debit',
      v_row.total_ventas + v_row.total_iva,
      'Ventas ' || v_row.canal
    );
    
    -- Línea 2: Ventas (HABER)
    INSERT INTO journal_transactions (
      journal_entry_id, line_number, account_code, movement_type,
      amount, description
    ) VALUES (
      v_entry_id, 2, v_cuenta_ventas, 'credit',
      v_row.total_ventas,
      'Ventas ' || v_row.canal
    );
    
    -- Línea 3: IVA Repercutido (HABER)
    IF v_row.total_iva > 0 THEN
      INSERT INTO journal_transactions (
        journal_entry_id, line_number, account_code, movement_type,
        amount, description
      ) VALUES (
        v_entry_id, 3, v_cuenta_iva_repercutido, 'credit',
        v_row.total_iva,
        'IVA repercutido ' || v_row.canal
      );
    END IF;
    
    -- Marcar filas como contabilizadas
    UPDATE stg_tpv
    SET status = 'posted', posted_entry_id = v_entry_id
    WHERE id = ANY(v_row.row_ids);
    
    v_entries_created := v_entries_created + 1;
  END LOOP;
  
  -- Actualizar import_run
  UPDATE import_runs
  SET 
    status = 'completed',
    finished_at = NOW(),
    stats = stats || jsonb_build_object('entries_created', v_entries_created)
  WHERE id = p_import_run_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'entries_created', v_entries_created
  );
END;
$$;

-- ============================================================================
-- RPC: post_nominas_import
-- Purpose: Crear asientos contables desde stg_nominas
-- ============================================================================
CREATE OR REPLACE FUNCTION post_nominas_import(p_import_run_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry_id UUID;
  v_entries_created INTEGER := 0;
  v_row RECORD;
  v_fiscal_year_id UUID;
  v_entry_number INTEGER;
  v_cuenta_sueldos TEXT := '6400000'; -- Sueldos y salarios
  v_cuenta_ss_empresa TEXT := '6420000'; -- Seguridad Social a cargo empresa
  v_cuenta_hacienda TEXT := '4751000'; -- H.P. acreedora retenciones
  v_cuenta_ss_acreedora TEXT := '4760000'; -- Org. S.S. acreedores
  v_cuenta_remuneraciones TEXT := '4650000'; -- Remuneraciones pendientes
BEGIN
  -- Validar import_run
  IF NOT EXISTS (SELECT 1 FROM import_runs WHERE id = p_import_run_id AND module = 'nominas') THEN
    RAISE EXCEPTION 'Import run % no existe o no es Nóminas', p_import_run_id;
  END IF;

  -- Procesar filas válidas agrupadas por periodo y centro
  FOR v_row IN 
    SELECT 
      fecha, centro_code, periodo_liquidacion,
      SUM(sueldos_salarios) as total_sueldos,
      SUM(seguridad_social_cargo) as total_ss_empresa,
      SUM(retencion_irpf) as total_irpf,
      SUM(seguridad_social_empleado) as total_ss_empleado,
      SUM(importe_neto) as total_neto,
      COUNT(*) as num_rows,
      ARRAY_AGG(id) as row_ids
    FROM stg_nominas
    WHERE import_run_id = p_import_run_id AND status = 'valid'
    GROUP BY fecha, centro_code, periodo_liquidacion
  LOOP
    -- Obtener fiscal_year_id
    SELECT id INTO v_fiscal_year_id
    FROM fiscal_years
    WHERE centro_code = v_row.centro_code
      AND v_row.fecha BETWEEN start_date AND end_date
    LIMIT 1;
    
    IF v_fiscal_year_id IS NULL THEN
      RAISE EXCEPTION 'No hay ejercicio fiscal para centro % en fecha %', v_row.centro_code, v_row.fecha;
    END IF;
    
    -- Obtener próximo número de asiento
    SELECT COALESCE(MAX(entry_number), 0) + 1 INTO v_entry_number
    FROM journal_entries
    WHERE fiscal_year_id = v_fiscal_year_id;
    
    -- Crear journal_entry
    INSERT INTO journal_entries (
      fiscal_year_id, entry_number, entry_date, description,
      centro_code, 
      total_debit, total_credit, 
      status, entry_type
    ) VALUES (
      v_fiscal_year_id, v_entry_number, v_row.fecha,
      'Nóminas - ' || COALESCE(v_row.periodo_liquidacion, TO_CHAR(v_row.fecha, 'YYYY-MM')),
      v_row.centro_code,
      v_row.total_sueldos + v_row.total_ss_empresa,
      v_row.total_sueldos + v_row.total_ss_empresa,
      'posted',
      'payroll_import'
    ) RETURNING id INTO v_entry_id;
    
    -- Línea 1: Sueldos y salarios (DEBE - Grupo 64)
    INSERT INTO journal_transactions (
      journal_entry_id, line_number, account_code, movement_type,
      amount, description
    ) VALUES (
      v_entry_id, 1, v_cuenta_sueldos, 'debit',
      v_row.total_sueldos,
      'Sueldos y salarios'
    );
    
    -- Línea 2: Seguridad Social cargo empresa (DEBE - Grupo 64)
    IF v_row.total_ss_empresa > 0 THEN
      INSERT INTO journal_transactions (
        journal_entry_id, line_number, account_code, movement_type,
        amount, description
      ) VALUES (
        v_entry_id, 2, v_cuenta_ss_empresa, 'debit',
        v_row.total_ss_empresa,
        'Seg. Social cargo empresa'
      );
    END IF;
    
    -- Línea 3: Hacienda Pública retenciones IRPF (HABER - Grupo 47)
    IF v_row.total_irpf > 0 THEN
      INSERT INTO journal_transactions (
        journal_entry_id, line_number, account_code, movement_type,
        amount, description
      ) VALUES (
        v_entry_id, 3, v_cuenta_hacienda, 'credit',
        v_row.total_irpf,
        'Retenciones IRPF'
      );
    END IF;
    
    -- Línea 4: Seguridad Social acreedores (HABER - Grupo 47)
    INSERT INTO journal_transactions (
      journal_entry_id, line_number, account_code, movement_type,
      amount, description
    ) VALUES (
      v_entry_id, 4, v_cuenta_ss_acreedora, 'credit',
      v_row.total_ss_empleado + v_row.total_ss_empresa,
      'Seg. Social total'
    );
    
    -- Línea 5: Remuneraciones pendientes (HABER - Grupo 46)
    INSERT INTO journal_transactions (
      journal_entry_id, line_number, account_code, movement_type,
      amount, description
    ) VALUES (
      v_entry_id, 5, v_cuenta_remuneraciones, 'credit',
      v_row.total_neto,
      'Nóminas a pagar'
    );
    
    -- Marcar filas como contabilizadas
    UPDATE stg_nominas
    SET status = 'posted', posted_entry_id = v_entry_id
    WHERE id = ANY(v_row.row_ids);
    
    v_entries_created := v_entries_created + 1;
  END LOOP;
  
  -- Actualizar import_run
  UPDATE import_runs
  SET 
    status = 'completed',
    finished_at = NOW(),
    stats = stats || jsonb_build_object('entries_created', v_entries_created)
  WHERE id = p_import_run_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'entries_created', v_entries_created
  );
END;
$$;

-- ============================================================================
-- Comentarios y documentación
-- ============================================================================
COMMENT ON TABLE stg_tpv IS 'Staging para importación de ventas por canal (TPV McDonald''s)';
COMMENT ON TABLE stg_nominas IS 'Staging para importación de nóminas (Grupo 64 PGC)';
COMMENT ON FUNCTION stage_tpv_rows IS 'Valida y carga filas TPV en staging con deduplicación';
COMMENT ON FUNCTION stage_nominas_rows IS 'Valida y carga filas de nóminas en staging';
COMMENT ON FUNCTION post_tpv_import IS 'Crea asientos contables de ventas TPV (700 + 477 vs 570)';
COMMENT ON FUNCTION post_nominas_import IS 'Crea asientos contables de nóminas (640 + 642 vs 475 + 476 + 465)';
