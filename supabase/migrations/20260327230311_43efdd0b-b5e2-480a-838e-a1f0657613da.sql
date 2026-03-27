
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_old_data JSONB;
  v_new_data JSONB;
  v_diff JSONB;
  v_ip TEXT;
BEGIN
  v_user_id := auth.uid();
  v_user_email := (SELECT email FROM auth.users WHERE id = v_user_id);
  
  IF (TG_OP = 'DELETE') THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;
  ELSIF (TG_OP = 'INSERT') THEN
    v_old_data := NULL;
    v_new_data := to_jsonb(NEW);
  ELSE
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    v_diff := jsonb_object_agg(
      key,
      jsonb_build_object('old', v_old_data->key, 'new', v_new_data->key)
    )
    FROM jsonb_each(v_new_data)
    WHERE v_old_data->key IS DISTINCT FROM v_new_data->key;
  END IF;

  v_ip := current_setting('request.headers', true)::json->>'x-real-ip';
  
  INSERT INTO audit_logs (
    table_name, row_id, action, old_data, new_data, diff,
    user_id, user_email, ip_address, user_agent
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id)::uuid,
    TG_OP::audit_action,
    v_old_data, v_new_data, v_diff,
    v_user_id, v_user_email,
    CASE WHEN v_ip IS NOT NULL AND v_ip != '' THEN v_ip::inet ELSE NULL END,
    current_setting('request.headers', true)::json->>'user-agent'
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;
