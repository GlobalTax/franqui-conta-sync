-- =====================================================
-- PLAN COMPLETO: LIMPIEZA Y RECONSTRUCCIÓN DE SOCIEDADES
-- =====================================================

-- FASE 1: BACKUP Y SEGURIDAD
-- =====================================================

-- Backup completo de companies
CREATE TABLE IF NOT EXISTS companies_backup_20241109 AS 
SELECT * FROM companies;

-- Backup de relaciones actuales centres-companies
CREATE TABLE IF NOT EXISTS centres_companies_snapshot_20241109 AS
SELECT 
  c.id as centre_id,
  c.codigo as centre_code,
  c.nombre as centre_name,
  c.company_id as old_company_id,
  co.cif as old_cif,
  co.razon_social as old_razon_social,
  co.tipo_sociedad as old_tipo_sociedad,
  co.franchisee_id as franchisee_id,
  now() as snapshot_date
FROM centres c
LEFT JOIN companies co ON co.id = c.company_id
WHERE c.company_id IS NOT NULL;

-- FASE 2: LIMPIEZA DE FOREIGN KEYS
-- =====================================================

-- Limpiar company_id de todos los centros
UPDATE centres 
SET company_id = NULL 
WHERE company_id IS NOT NULL;

-- FASE 3: ELIMINACIÓN TOTAL
-- =====================================================

-- Eliminar todas las sociedades
DELETE FROM companies;

-- FASE 4 y 5: RECONSTRUCCIÓN AUTOMÁTICA DESDE centre_companies
-- =====================================================

-- Reconstruir sociedades con datos limpios desde centre_companies
-- Solo tomamos CIFs válidos y datos completos
INSERT INTO companies (cif, razon_social, tipo_sociedad, franchisee_id, activo, created_at, updated_at)
SELECT DISTINCT ON (UPPER(TRIM(cc.cif)))
  UPPER(TRIM(cc.cif)) as cif,
  TRIM(cc.razon_social) as razon_social,
  COALESCE(cc.tipo_sociedad, 'SL') as tipo_sociedad,
  c.franchisee_id,
  true as activo,
  now() as created_at,
  now() as updated_at
FROM centre_companies cc
JOIN centres c ON c.id = cc.centre_id
WHERE cc.activo = true
  AND cc.cif IS NOT NULL
  AND TRIM(cc.cif) != ''
  AND cc.cif NOT ILIKE '%#N/D%'
  AND cc.cif NOT ILIKE '%N/D%'
  AND cc.cif NOT ILIKE '%pendiente%'
  AND LENGTH(TRIM(cc.cif)) >= 9
  AND LENGTH(TRIM(cc.cif)) <= 14
  AND cc.razon_social IS NOT NULL
  AND TRIM(cc.razon_social) != ''
ORDER BY UPPER(TRIM(cc.cif)), cc.es_principal DESC, cc.created_at ASC;

-- Re-asociar centros a sus sociedades reconstruidas
UPDATE centres c
SET company_id = co.id
FROM companies co
JOIN centre_companies cc ON UPPER(TRIM(cc.cif)) = UPPER(TRIM(co.cif))
WHERE cc.centre_id = c.id
  AND cc.activo = true;

-- FASE 6: REPORTES DE VALIDACIÓN
-- =====================================================

-- Crear vista temporal para validación (se puede consultar después)
CREATE OR REPLACE VIEW v_companies_reconstruction_report AS
SELECT 
  'Total Backup Original' as metric,
  COUNT(*)::text as value
FROM companies_backup_20241109

UNION ALL

SELECT 
  'Sociedades Reconstruidas' as metric,
  COUNT(*)::text as value
FROM companies

UNION ALL

SELECT 
  'Centros Re-asociados' as metric,
  COUNT(*)::text as value
FROM centres 
WHERE company_id IS NOT NULL

UNION ALL

SELECT 
  'Centros Sin Sociedad' as metric,
  COUNT(*)::text as value
FROM centres 
WHERE company_id IS NULL 
  AND franchisee_id IS NOT NULL

UNION ALL

SELECT 
  'CIFs Válidos (formato)' as metric,
  COUNT(*) FILTER (WHERE cif ~ '^[A-Z][0-9]{7,8}[A-Z0-9]?$')::text as value
FROM companies

UNION ALL

SELECT 
  'Sociedades con Razón Social' as metric,
  COUNT(*) FILTER (WHERE razon_social IS NOT NULL AND razon_social != '')::text as value
FROM companies;