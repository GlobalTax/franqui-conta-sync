-- ============================================
-- FASE 4: RECONSTRUCCIÓN AUTOMÁTICA DE RELACIONES
-- ============================================

-- Función para reconstruir relaciones rotas entre franquiciados, sociedades y centros
CREATE OR REPLACE FUNCTION reconstruct_franchisee_relationships()
RETURNS TABLE(
  action_type TEXT,
  franchisee_id UUID,
  franchisee_name TEXT,
  related_id UUID,
  related_name TEXT,
  match_reason TEXT
) AS $$
DECLARE
  v_franchisee RECORD;
  v_company RECORD;
  v_centre RECORD;
  v_actions_count INTEGER := 0;
BEGIN
  -- 1. Asociar sociedades a franquiciados por CIF coincidente
  FOR v_company IN
    SELECT c.* 
    FROM companies c
    WHERE c.franchisee_id IS NULL
      AND c.cif IS NOT NULL
      AND c.cif != ''
  LOOP
    -- Buscar franquiciado con mismo CIF
    SELECT f.* INTO v_franchisee
    FROM franchisees f
    WHERE f.company_tax_id = v_company.cif
    LIMIT 1;
    
    IF FOUND THEN
      UPDATE companies
      SET franchisee_id = v_franchisee.id
      WHERE id = v_company.id;
      
      RETURN QUERY SELECT
        'COMPANY_TO_FRANCHISEE_BY_CIF'::TEXT,
        v_franchisee.id,
        v_franchisee.name,
        v_company.id,
        v_company.razon_social,
        'CIF coincidente: ' || v_company.cif;
      
      v_actions_count := v_actions_count + 1;
    END IF;
  END LOOP;
  
  -- 2. Asociar centros a franquiciados usando company_tax_id
  FOR v_centre IN
    SELECT c.*
    FROM centres c
    WHERE c.franchisee_id IS NULL
      AND c.company_tax_id IS NOT NULL
      AND c.company_tax_id != ''
  LOOP
    -- Buscar franquiciado con mismo CIF
    SELECT f.* INTO v_franchisee
    FROM franchisees f
    WHERE f.company_tax_id = v_centre.company_tax_id
    LIMIT 1;
    
    IF FOUND THEN
      UPDATE centres
      SET franchisee_id = v_franchisee.id
      WHERE id = v_centre.id;
      
      RETURN QUERY SELECT
        'CENTRE_TO_FRANCHISEE_BY_CIF'::TEXT,
        v_franchisee.id,
        v_franchisee.name,
        v_centre.id,
        v_centre.nombre,
        'Company Tax ID: ' || v_centre.company_tax_id;
      
      v_actions_count := v_actions_count + 1;
    END IF;
  END LOOP;
  
  -- 3. Asociar centros a franquiciados por nombre similar (fuzzy matching)
  FOR v_centre IN
    SELECT c.*
    FROM centres c
    WHERE c.franchisee_id IS NULL
      AND c.franchisee_name IS NOT NULL
      AND c.franchisee_name != ''
      AND c.franchisee_name != '#N/D'
  LOOP
    -- Buscar franquiciado con nombre similar (normalizado)
    SELECT f.* INTO v_franchisee
    FROM franchisees f
    WHERE LOWER(TRIM(f.name)) = LOWER(TRIM(v_centre.franchisee_name))
    LIMIT 1;
    
    IF FOUND THEN
      UPDATE centres
      SET franchisee_id = v_franchisee.id
      WHERE id = v_centre.id;
      
      RETURN QUERY SELECT
        'CENTRE_TO_FRANCHISEE_BY_NAME'::TEXT,
        v_franchisee.id,
        v_franchisee.name,
        v_centre.id,
        v_centre.nombre,
        'Nombre coincidente: ' || v_centre.franchisee_name;
      
      v_actions_count := v_actions_count + 1;
    END IF;
  END LOOP;
  
  -- 4. Crear franquiciados faltantes para centros huérfanos con información completa
  FOR v_centre IN
    SELECT c.*
    FROM centres c
    WHERE c.franchisee_id IS NULL
      AND c.franchisee_name IS NOT NULL
      AND c.franchisee_name != ''
      AND c.franchisee_name != '#N/D'
      AND c.franchisee_email IS NOT NULL
      AND c.franchisee_email != ''
      AND c.franchisee_email != '#N/D'
      AND c.franchisee_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    LIMIT 10 -- Limitar para evitar crear demasiados
  LOOP
    -- Crear franquiciado nuevo
    INSERT INTO franchisees (name, email, company_tax_id)
    VALUES (
      v_centre.franchisee_name,
      LOWER(TRIM(v_centre.franchisee_email)),
      v_centre.company_tax_id
    )
    RETURNING id INTO v_franchisee;
    
    -- Asociar el centro al nuevo franquiciado
    UPDATE centres
    SET franchisee_id = v_franchisee.id
    WHERE id = v_centre.id;
    
    RETURN QUERY SELECT
      'FRANCHISEE_CREATED_FROM_CENTRE'::TEXT,
      v_franchisee.id,
      v_centre.franchisee_name,
      v_centre.id,
      v_centre.nombre,
      'Franquiciado creado desde datos del centro';
    
    v_actions_count := v_actions_count + 1;
  END LOOP;
  
  -- Log final
  RAISE NOTICE 'Reconstrucción completada: % acciones realizadas', v_actions_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FASE 4: ALERTAS AUTOMÁTICAS DE CALIDAD DE DATOS
-- ============================================

-- Trigger para detectar nuevos problemas de calidad al insertar/actualizar franquiciados
CREATE OR REPLACE FUNCTION check_franchisee_data_quality()
RETURNS TRIGGER AS $$
DECLARE
  v_alert_type TEXT;
  v_alert_message TEXT;
  v_severity TEXT := 'media';
BEGIN
  -- Validar email
  IF NEW.email IS NULL OR NEW.email = '' OR NEW.email = '#N/D' THEN
    v_alert_type := 'franchisee_invalid_email';
    v_alert_message := format('Franquiciado "%s" tiene email vacío o inválido', NEW.name);
    v_severity := 'alta';
  ELSIF NEW.email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    v_alert_type := 'franchisee_invalid_email_format';
    v_alert_message := format('Franquiciado "%s" tiene formato de email inválido: %s', NEW.name, NEW.email);
    v_severity := 'alta';
  END IF;
  
  -- Validar CIF
  IF NEW.company_tax_id IS NOT NULL AND NEW.company_tax_id != '' THEN
    -- Email en campo CIF
    IF NEW.company_tax_id ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
      v_alert_type := 'franchisee_email_in_cif';
      v_alert_message := format('Franquiciado "%s" tiene un email en el campo CIF: %s', NEW.name, NEW.company_tax_id);
      v_severity := 'critica';
    -- CIF con formato inválido
    ELSIF NEW.company_tax_id !~ '^[A-Z]\d{8}$' AND NEW.company_tax_id !~ '^[A-Z]{2}[A-Z0-9]{1,13}$' THEN
      v_alert_type := 'franchisee_invalid_cif';
      v_alert_message := format('Franquiciado "%s" tiene CIF con formato inválido: %s', NEW.name, NEW.company_tax_id);
      v_severity := 'media';
    END IF;
  END IF;
  
  -- Validar nombre
  IF NEW.name = '#N/D' OR TRIM(NEW.name) = '' THEN
    v_alert_type := 'franchisee_invalid_name';
    v_alert_message := format('Franquiciado con ID %s tiene nombre inválido: %s', NEW.id, NEW.name);
    v_severity := 'alta';
  END IF;
  
  -- Crear alerta si se detectó problema
  IF v_alert_type IS NOT NULL THEN
    INSERT INTO alert_notifications (
      tipo,
      severidad,
      titulo,
      mensaje,
      detalles,
      destinatario_user_id
    )
    SELECT
      v_alert_type,
      v_severity,
      'Problema de calidad en franquiciado',
      v_alert_message,
      jsonb_build_object(
        'franchisee_id', NEW.id,
        'franchisee_name', NEW.name,
        'franchisee_email', NEW.email,
        'company_tax_id', NEW.company_tax_id,
        'alert_type', v_alert_type
      ),
      ur.user_id
    FROM user_roles ur
    WHERE ur.role = 'admin'::app_role;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar trigger a la tabla franchisees
DROP TRIGGER IF EXISTS trg_franchisee_data_quality ON franchisees;
CREATE TRIGGER trg_franchisee_data_quality
  AFTER INSERT OR UPDATE ON franchisees
  FOR EACH ROW
  EXECUTE FUNCTION check_franchisee_data_quality();

-- ============================================
-- FUNCIÓN AUXILIAR: Ejecutar reconstrucción manual
-- ============================================

-- Esta función puede ser llamada manualmente desde la UI
CREATE OR REPLACE FUNCTION run_franchisee_reconstruction()
RETURNS jsonb AS $$
DECLARE
  v_result RECORD;
  v_results jsonb := '[]'::jsonb;
  v_count INTEGER := 0;
BEGIN
  -- Ejecutar reconstrucción
  FOR v_result IN 
    SELECT * FROM reconstruct_franchisee_relationships()
  LOOP
    v_results := v_results || jsonb_build_object(
      'action_type', v_result.action_type,
      'franchisee_id', v_result.franchisee_id,
      'franchisee_name', v_result.franchisee_name,
      'related_id', v_result.related_id,
      'related_name', v_result.related_name,
      'match_reason', v_result.match_reason
    );
    v_count := v_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'actions_count', v_count,
    'actions', v_results,
    'message', format('Reconstrucción completada: %s relaciones restauradas', v_count)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;