-- Función para contabilizar asientos
CREATE OR REPLACE FUNCTION contabilizar_asiento(
  p_entry_id UUID,
  p_user_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_entry accounting_entries;
  v_total_debit NUMERIC;
  v_total_credit NUMERIC;
  v_next_number INTEGER;
  v_company_id UUID;
BEGIN
  -- Obtener el asiento
  SELECT * INTO v_entry
  FROM accounting_entries
  WHERE id = p_entry_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Asiento no encontrado'
    );
  END IF;

  -- Validar que esté en borrador
  IF v_entry.status != 'draft' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'El asiento ya está contabilizado'
    );
  END IF;

  -- Calcular totales
  SELECT 
    COALESCE(SUM(CASE WHEN movement_type = 'debit' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN movement_type = 'credit' THEN amount ELSE 0 END), 0)
  INTO v_total_debit, v_total_credit
  FROM accounting_transactions
  WHERE entry_id = p_entry_id;

  -- Validar cuadre (tolerancia de 0.01€ por redondeos)
  IF ABS(v_total_debit - v_total_credit) > 0.01 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('El asiento no cuadra. Debe: %s€, Haber: %s€', 
        v_total_debit, v_total_credit)
    );
  END IF;

  -- Validar que tenga al menos 2 líneas
  IF (SELECT COUNT(*) FROM accounting_transactions WHERE entry_id = p_entry_id) < 2 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'El asiento debe tener al menos 2 líneas'
    );
  END IF;

  -- Obtener company_id del centro
  SELECT company_id INTO v_company_id
  FROM centres
  WHERE codigo = v_entry.centro_code
  LIMIT 1;

  IF v_company_id IS NULL THEN
    -- Si no hay company_id, usar el primero disponible o crear uno dummy
    v_company_id := gen_random_uuid();
  END IF;

  -- Obtener siguiente número correlativo
  v_next_number := get_next_entry_number(
    v_company_id,
    v_entry.centro_code,
    EXTRACT(YEAR FROM v_entry.entry_date)::INTEGER,
    COALESCE(v_entry.serie, 'GENERAL')
  );

  -- Actualizar el asiento
  UPDATE accounting_entries
  SET 
    status = 'posted',
    entry_number = v_next_number,
    posted_by = p_user_id,
    posted_at = now(),
    total_debit = v_total_debit,
    total_credit = v_total_credit
  WHERE id = p_entry_id;

  RETURN jsonb_build_object(
    'success', true,
    'entry_number', v_next_number,
    'message', format('Asiento N.º %s contabilizado correctamente', v_next_number)
  );
END;
$$;

-- Función para descontabilizar asiento (solo admin)
CREATE OR REPLACE FUNCTION descontabilizar_asiento(
  p_entry_id UUID,
  p_user_id UUID,
  p_motivo TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_entry accounting_entries;
  v_is_admin BOOLEAN;
BEGIN
  -- Verificar que el usuario es admin
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Solo los administradores pueden descontabilizar asientos'
    );
  END IF;

  -- Obtener el asiento
  SELECT * INTO v_entry
  FROM accounting_entries
  WHERE id = p_entry_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Asiento no encontrado'
    );
  END IF;

  -- Validar que esté contabilizado
  IF v_entry.status != 'posted' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'El asiento no está contabilizado'
    );
  END IF;

  -- Registrar en audit log el motivo
  INSERT INTO audit_logs (
    user_id,
    action,
    table_name,
    row_id,
    old_data,
    new_data,
    diff
  ) VALUES (
    p_user_id,
    'UPDATE',
    'accounting_entries',
    p_entry_id,
    to_jsonb(v_entry),
    jsonb_build_object('status', 'draft', 'motivo_descontabilizacion', p_motivo),
    jsonb_build_object('motivo', p_motivo)
  );

  -- Descontabilizar
  UPDATE accounting_entries
  SET 
    status = 'draft',
    posted_by = NULL,
    posted_at = NULL
  WHERE id = p_entry_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Asiento descontabilizado correctamente'
  );
END;
$$;

-- Añadir restricción para evitar edición de asientos contabilizados
CREATE OR REPLACE FUNCTION validate_entry_editable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'posted' AND NEW.status = 'posted' THEN
    -- Si ya está contabilizado, solo permitir cambio a 'draft' por admin
    IF OLD.status != NEW.status THEN
      RETURN NEW;
    END IF;
    
    RAISE EXCEPTION 'No se puede modificar un asiento contabilizado. Use la función descontabilizar_asiento primero.';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_entry_editable
  BEFORE UPDATE ON accounting_entries
  FOR EACH ROW
  WHEN (OLD.status = 'posted')
  EXECUTE FUNCTION validate_entry_editable();

-- Trigger similar para transacciones
CREATE OR REPLACE FUNCTION validate_transaction_editable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_entry_status TEXT;
BEGIN
  SELECT status INTO v_entry_status
  FROM accounting_entries
  WHERE id = COALESCE(NEW.entry_id, OLD.entry_id);

  IF v_entry_status = 'posted' THEN
    RAISE EXCEPTION 'No se pueden modificar las líneas de un asiento contabilizado';
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER check_transaction_editable
  BEFORE UPDATE OR DELETE ON accounting_transactions
  FOR EACH ROW
  EXECUTE FUNCTION validate_transaction_editable();