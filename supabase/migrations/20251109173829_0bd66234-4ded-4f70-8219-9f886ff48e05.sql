-- ============================================================================
-- FASE 1: FUNCIONES RPC PARA INFORMES PGC OFICIALES
-- ============================================================================
-- Purpose: Crear funciones para Balance de Situación, PyG, Sumas y Saldos
--          con estructura PGC completa (incluye cuentas sin movimientos)
-- ============================================================================

-- ============================================================================
-- 1. BALANCE DE SITUACIÓN COMPLETO (calculate_balance_sheet_full)
-- ============================================================================
-- Purpose: Calcula Balance de Situación con estructura PGC completa
-- Inputs:
--   p_centro_code TEXT - Código del centro
--   p_fecha_corte DATE - Fecha de corte del balance
--   p_nivel INTEGER - Nivel de agregación (1=Grupo, 2=Subgrupo, 3=Cuenta completa)
--   p_show_zero_balance BOOLEAN - Mostrar cuentas sin saldo (default TRUE)
-- Output: Tabla con estructura jerárquica del balance
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_balance_sheet_full(
  p_centro_code TEXT,
  p_fecha_corte DATE,
  p_nivel INTEGER DEFAULT 1,
  p_show_zero_balance BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
  codigo TEXT,
  nombre TEXT,
  nivel INTEGER,
  parent_code TEXT,
  balance NUMERIC,
  account_type TEXT
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH account_prefix AS (
    -- Generar prefijo según nivel solicitado
    SELECT 
      a.code,
      a.name,
      a.account_type,
      CASE 
        WHEN p_nivel = 1 THEN LEFT(a.code, 1)
        WHEN p_nivel = 2 THEN LEFT(a.code, 2)
        ELSE a.code
      END AS prefix_code,
      CASE 
        WHEN p_nivel = 1 THEN LEFT(a.code, 1)
        WHEN p_nivel = 2 THEN LEFT(a.code, 1)
        WHEN p_nivel = 3 AND LENGTH(a.code) > 2 THEN LEFT(a.code, 2)
        ELSE NULL
      END AS parent_prefix
    FROM accounts a
    WHERE a.centro_code = p_centro_code
      AND a.active = TRUE
      AND a.account_type IN ('asset', 'liability', 'equity')
  ),
  balances AS (
    -- Calcular balances agregados por prefijo
    SELECT 
      ap.prefix_code AS codigo,
      MAX(ap.name) AS nombre,
      p_nivel AS nivel,
      MAX(ap.parent_prefix) AS parent_code,
      COALESCE(SUM(
        CASE 
          WHEN at.movement_type = 'debit' THEN at.amount
          WHEN at.movement_type = 'credit' THEN -at.amount
          ELSE 0
        END
      ), 0) AS balance,
      MAX(ap.account_type) AS account_type
    FROM account_prefix ap
    LEFT JOIN accounting_transactions at ON at.account_code = ap.code
    LEFT JOIN accounting_entries ae ON ae.id = at.entry_id
      AND ae.entry_date <= p_fecha_corte
      AND ae.status = 'posted'
      AND ae.centro_code = p_centro_code
    GROUP BY ap.prefix_code
  )
  SELECT 
    b.codigo,
    b.nombre,
    b.nivel,
    b.parent_code,
    b.balance,
    b.account_type
  FROM balances b
  WHERE p_show_zero_balance OR b.balance != 0
  ORDER BY b.codigo;
END;
$$;

COMMENT ON FUNCTION calculate_balance_sheet_full IS 'Balance de Situación con estructura PGC completa (incluye cuentas sin saldo)';


-- ============================================================================
-- 2. SUMAS Y SALDOS COMPLETO (calculate_trial_balance_full)
-- ============================================================================
-- Purpose: Calcula Sumas y Saldos con todas las cuentas del PGC
-- Inputs:
--   p_centro_code TEXT - Código del centro
--   p_company_id UUID - ID de la empresa (opcional)
--   p_start_date DATE - Fecha inicio (opcional)
--   p_end_date DATE - Fecha fin (opcional)
--   p_nivel INTEGER - Nivel de agregación (1-3)
--   p_show_zero_balance BOOLEAN - Mostrar cuentas sin saldo
-- Output: Tabla con debe, haber y saldo de todas las cuentas
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_trial_balance_full(
  p_centro_code TEXT,
  p_company_id UUID DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_nivel INTEGER DEFAULT 3,
  p_show_zero_balance BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
  account_code TEXT,
  account_name TEXT,
  account_type TEXT,
  level INTEGER,
  parent_code TEXT,
  debit_total NUMERIC,
  credit_total NUMERIC,
  balance NUMERIC
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH account_prefix AS (
    SELECT 
      a.code,
      a.name,
      a.account_type,
      a.level,
      CASE 
        WHEN p_nivel = 1 THEN LEFT(a.code, 1)
        WHEN p_nivel = 2 THEN LEFT(a.code, 2)
        ELSE a.code
      END AS prefix_code,
      CASE 
        WHEN p_nivel = 1 THEN NULL
        WHEN p_nivel = 2 THEN LEFT(a.code, 1)
        WHEN LENGTH(a.code) > 2 THEN LEFT(a.code, 2)
        ELSE NULL
      END AS parent_prefix
    FROM accounts a
    WHERE a.centro_code = p_centro_code
      AND a.active = TRUE
      AND (p_company_id IS NULL OR a.company_id = p_company_id)
  ),
  movements AS (
    SELECT 
      ap.prefix_code,
      MAX(ap.name) AS nombre,
      MAX(ap.account_type) AS tipo,
      p_nivel AS nivel,
      MAX(ap.parent_prefix) AS parent,
      COALESCE(SUM(
        CASE WHEN at.movement_type = 'debit' THEN at.amount ELSE 0 END
      ), 0) AS debe,
      COALESCE(SUM(
        CASE WHEN at.movement_type = 'credit' THEN at.amount ELSE 0 END
      ), 0) AS haber
    FROM account_prefix ap
    LEFT JOIN accounting_transactions at ON at.account_code = ap.code
    LEFT JOIN accounting_entries ae ON ae.id = at.entry_id
      AND ae.status = 'posted'
      AND ae.centro_code = p_centro_code
      AND (p_start_date IS NULL OR ae.entry_date >= p_start_date)
      AND (p_end_date IS NULL OR ae.entry_date <= p_end_date)
    GROUP BY ap.prefix_code
  )
  SELECT 
    m.prefix_code AS account_code,
    m.nombre AS account_name,
    m.tipo AS account_type,
    m.nivel AS level,
    m.parent AS parent_code,
    m.debe AS debit_total,
    m.haber AS credit_total,
    (m.debe - m.haber) AS balance
  FROM movements m
  WHERE p_show_zero_balance OR (m.debe != 0 OR m.haber != 0)
  ORDER BY m.prefix_code;
END;
$$;

COMMENT ON FUNCTION calculate_trial_balance_full IS 'Sumas y Saldos con estructura PGC completa';


-- ============================================================================
-- 3. PÉRDIDAS Y GANANCIAS PGC (calculate_pyg_pgc)
-- ============================================================================
-- Purpose: Calcula PyG según estructura PGC español (grupos 6 y 7)
-- Inputs:
--   p_centro_code TEXT - Código del centro
--   p_fecha_inicio DATE - Fecha inicio del periodo
--   p_fecha_fin DATE - Fecha fin del periodo
--   p_nivel INTEGER - Nivel de agregación (1=Grupo, 2=Subgrupo, 3=Cuenta)
--   p_show_zero_balance BOOLEAN - Mostrar cuentas sin movimientos
-- Output: Tabla con debe, haber, saldo y % sobre ventas
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_pyg_pgc(
  p_centro_code TEXT,
  p_fecha_inicio DATE,
  p_fecha_fin DATE,
  p_nivel INTEGER DEFAULT 2,
  p_show_zero_balance BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
  cuenta TEXT,
  nombre TEXT,
  nivel INTEGER,
  parent_code TEXT,
  debe NUMERIC,
  haber NUMERIC,
  saldo NUMERIC,
  porcentaje NUMERIC
) 
LANGUAGE plpgsql
AS $$
DECLARE
  v_ventas_total NUMERIC;
BEGIN
  -- Calcular total de ventas (grupo 70) para porcentajes
  SELECT COALESCE(SUM(
    CASE 
      WHEN at.movement_type = 'credit' THEN at.amount
      WHEN at.movement_type = 'debit' THEN -at.amount
      ELSE 0
    END
  ), 0) INTO v_ventas_total
  FROM accounting_transactions at
  JOIN accounting_entries ae ON ae.id = at.entry_id
  WHERE ae.centro_code = p_centro_code
    AND ae.entry_date BETWEEN p_fecha_inicio AND p_fecha_fin
    AND ae.status = 'posted'
    AND at.account_code LIKE '70%';

  -- Si no hay ventas, evitar división por cero
  IF v_ventas_total = 0 THEN
    v_ventas_total := 1;
  END IF;

  RETURN QUERY
  WITH account_prefix AS (
    SELECT 
      a.code,
      a.name,
      a.account_type,
      CASE 
        WHEN p_nivel = 1 THEN LEFT(a.code, 1)
        WHEN p_nivel = 2 THEN LEFT(a.code, 2)
        ELSE a.code
      END AS prefix_code,
      CASE 
        WHEN p_nivel = 1 THEN NULL
        WHEN p_nivel = 2 THEN LEFT(a.code, 1)
        WHEN LENGTH(a.code) > 2 THEN LEFT(a.code, 2)
        ELSE NULL
      END AS parent_prefix
    FROM accounts a
    WHERE a.centro_code = p_centro_code
      AND a.active = TRUE
      AND (a.code LIKE '6%' OR a.code LIKE '7%')
  ),
  pyg_movements AS (
    SELECT 
      ap.prefix_code AS cuenta,
      MAX(ap.name) AS nombre,
      p_nivel AS nivel,
      MAX(ap.parent_prefix) AS parent_code,
      COALESCE(SUM(
        CASE WHEN at.movement_type = 'debit' THEN at.amount ELSE 0 END
      ), 0) AS debe,
      COALESCE(SUM(
        CASE WHEN at.movement_type = 'credit' THEN at.amount ELSE 0 END
      ), 0) AS haber
    FROM account_prefix ap
    LEFT JOIN accounting_transactions at ON at.account_code = ap.code
    LEFT JOIN accounting_entries ae ON ae.id = at.entry_id
      AND ae.centro_code = p_centro_code
      AND ae.entry_date BETWEEN p_fecha_inicio AND p_fecha_fin
      AND ae.status = 'posted'
    GROUP BY ap.prefix_code
  )
  SELECT 
    pm.cuenta,
    pm.nombre,
    pm.nivel,
    pm.parent_code,
    pm.debe,
    pm.haber,
    (pm.haber - pm.debe) AS saldo,
    ROUND(((pm.haber - pm.debe) / v_ventas_total * 100), 2) AS porcentaje
  FROM pyg_movements pm
  WHERE p_show_zero_balance OR (pm.debe != 0 OR pm.haber != 0)
  ORDER BY pm.cuenta;
END;
$$;

COMMENT ON FUNCTION calculate_pyg_pgc IS 'Pérdidas y Ganancias según PGC español (grupos 6 y 7)';


-- ============================================================================
-- 4. LIBRO MAYOR COMPLETO (get_general_ledger_full)
-- ============================================================================
-- Purpose: Obtiene Libro Mayor con opción de incluir cuentas sin movimientos
-- Inputs:
--   p_centro_code TEXT - Código del centro
--   p_start_date DATE - Fecha inicio
--   p_end_date DATE - Fecha fin
--   p_account_code TEXT - Filtro por cuenta específica (opcional)
--   p_include_zero_balance BOOLEAN - Incluir cuentas sin movimientos
-- Output: Detalle de movimientos por cuenta con saldo acumulado
-- ============================================================================

CREATE OR REPLACE FUNCTION get_general_ledger_full(
  p_centro_code TEXT,
  p_start_date DATE,
  p_end_date DATE,
  p_account_code TEXT DEFAULT NULL,
  p_include_zero_balance BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  account_code TEXT,
  account_name TEXT,
  entry_date DATE,
  entry_number INTEGER,
  description TEXT,
  debit NUMERIC,
  credit NUMERIC,
  balance NUMERIC
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH eligible_accounts AS (
    -- Cuentas que cumplen filtros
    SELECT DISTINCT
      a.code,
      a.name
    FROM accounts a
    WHERE a.centro_code = p_centro_code
      AND a.active = TRUE
      AND (p_account_code IS NULL OR a.code LIKE p_account_code || '%')
  ),
  account_movements AS (
    -- Movimientos de las cuentas
    SELECT 
      ea.code AS account_code,
      ea.name AS account_name,
      ae.entry_date,
      ae.entry_number,
      COALESCE(at.description, ae.description) AS description,
      CASE WHEN at.movement_type = 'debit' THEN at.amount ELSE 0 END AS debit,
      CASE WHEN at.movement_type = 'credit' THEN at.amount ELSE 0 END AS credit
    FROM eligible_accounts ea
    LEFT JOIN accounting_transactions at ON at.account_code = ea.code
    LEFT JOIN accounting_entries ae ON ae.id = at.entry_id
      AND ae.centro_code = p_centro_code
      AND ae.entry_date BETWEEN p_start_date AND p_end_date
      AND ae.status = 'posted'
  ),
  with_running_balance AS (
    -- Calcular saldo acumulado
    SELECT 
      am.account_code,
      am.account_name,
      am.entry_date,
      am.entry_number,
      am.description,
      am.debit,
      am.credit,
      SUM(am.debit - am.credit) OVER (
        PARTITION BY am.account_code 
        ORDER BY am.entry_date, am.entry_number
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
      ) AS balance
    FROM account_movements am
    WHERE am.entry_date IS NOT NULL -- Solo movimientos reales
  )
  SELECT 
    wrb.account_code,
    wrb.account_name,
    wrb.entry_date,
    wrb.entry_number,
    wrb.description,
    wrb.debit,
    wrb.credit,
    wrb.balance
  FROM with_running_balance wrb
  WHERE p_include_zero_balance OR wrb.debit != 0 OR wrb.credit != 0
  ORDER BY wrb.account_code, wrb.entry_date, wrb.entry_number;
END;
$$;

COMMENT ON FUNCTION get_general_ledger_full IS 'Libro Mayor con opción de incluir cuentas sin movimientos';


-- ============================================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- ============================================================================

-- Índice compuesto para consultas de balance por centro y fecha
CREATE INDEX IF NOT EXISTS idx_accounting_entries_centro_date_status 
ON accounting_entries(centro_code, entry_date, status);

-- Índice para transacciones por cuenta (usado en todos los informes)
CREATE INDEX IF NOT EXISTS idx_accounting_transactions_account_entry 
ON accounting_transactions(account_code, entry_id);

-- Índice para cuentas activas por centro
CREATE INDEX IF NOT EXISTS idx_accounts_centro_active_type 
ON accounts(centro_code, active, account_type);

-- ============================================================================
-- FIN MIGRACIÓN FASE 1
-- ============================================================================