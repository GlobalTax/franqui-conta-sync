-- ============================================================================
-- MIGRATION: API KEY MANAGEMENT SYSTEM
-- Purpose: Sistema completo de gestión de API keys para integraciones externas
-- ============================================================================

-- ========== TABLA: api_keys ==========
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- API Key fields
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  name TEXT NOT NULL,
  
  -- Status y permisos
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  scopes JSONB DEFAULT '[]'::jsonb,
  
  -- Restricciones de seguridad
  ip_whitelist TEXT[],
  rate_limit INTEGER DEFAULT 1000,
  
  -- Metadata
  last_used_at TIMESTAMPTZ,
  last_used_ip INET,
  request_count BIGINT DEFAULT 0,
  
  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id),
  revoked_reason TEXT,
  expires_at TIMESTAMPTZ,
  
  -- Centro/Franchisee scope
  centro_code TEXT REFERENCES centres(codigo),
  franchisee_id UUID REFERENCES franchisees(id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);
CREATE INDEX IF NOT EXISTS idx_api_keys_centro_code ON api_keys(centro_code);

-- ========== TABLA: api_key_usage_logs ==========
CREATE TABLE IF NOT EXISTS public.api_key_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  
  -- Request info
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  
  -- Client info
  ip_address INET,
  user_agent TEXT,
  
  -- Timing
  response_time_ms INTEGER,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Error tracking
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_api_key_usage_logs_api_key_id ON api_key_usage_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_logs_timestamp ON api_key_usage_logs(timestamp);

-- ========== RLS POLICIES ==========
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_key_usage_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own API keys or admins can view all
CREATE POLICY "Users can view their own API keys"
  ON api_keys FOR SELECT
  USING (
    user_id = auth.uid() 
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Policy: Users can create API keys
CREATE POLICY "Users can create API keys"
  ON api_keys FOR INSERT
  WITH CHECK (
    user_id = auth.uid() 
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Policy: Users can revoke their own API keys
CREATE POLICY "Users can revoke their own API keys"
  ON api_keys FOR UPDATE
  USING (
    user_id = auth.uid() 
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Policy: Admins can view all API key usage logs
CREATE POLICY "Admins can view all API key usage logs"
  ON api_key_usage_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy: Service role can insert usage logs
CREATE POLICY "Service role can insert usage logs"
  ON api_key_usage_logs FOR INSERT
  WITH CHECK (true);

-- ========== FUNCIÓN: generate_api_key ==========
CREATE OR REPLACE FUNCTION generate_api_key(
  p_name TEXT,
  p_scopes JSONB DEFAULT '[]'::jsonb,
  p_centro_code TEXT DEFAULT NULL,
  p_franchisee_id UUID DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  api_key TEXT,
  key_id UUID,
  key_prefix TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_raw_key TEXT;
  v_key_hash TEXT;
  v_key_prefix TEXT;
  v_key_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_raw_key := 'pk_live_' || encode(gen_random_bytes(24), 'base64');
  v_raw_key := replace(v_raw_key, '/', '_');
  v_raw_key := replace(v_raw_key, '+', '-');
  v_raw_key := replace(v_raw_key, '=', '');
  
  v_key_hash := encode(digest(v_raw_key, 'sha256'), 'hex');
  v_key_prefix := substring(v_raw_key, 1, 16);

  INSERT INTO api_keys (
    user_id,
    key_hash,
    key_prefix,
    name,
    scopes,
    centro_code,
    franchisee_id,
    expires_at,
    created_by,
    status
  ) VALUES (
    v_user_id,
    v_key_hash,
    v_key_prefix,
    p_name,
    p_scopes,
    p_centro_code,
    p_franchisee_id,
    p_expires_at,
    v_user_id,
    'active'
  )
  RETURNING id INTO v_key_id;

  INSERT INTO audit_logs (
    table_name,
    row_id,
    action,
    user_id,
    new_data
  ) VALUES (
    'api_keys',
    v_key_id,
    'INSERT',
    v_user_id,
    jsonb_build_object(
      'name', p_name,
      'key_prefix', v_key_prefix,
      'scopes', p_scopes
    )
  );

  RETURN QUERY SELECT v_raw_key, v_key_id, v_key_prefix;
END;
$$;

-- ========== FUNCIÓN: revoke_api_key ==========
CREATE OR REPLACE FUNCTION revoke_api_key(
  p_key_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_key_owner UUID;
  v_is_admin BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT user_id INTO v_key_owner
  FROM api_keys
  WHERE id = p_key_id;

  v_is_admin := has_role(v_user_id, 'admin');

  IF v_key_owner IS NULL THEN
    RAISE EXCEPTION 'API key not found';
  END IF;

  IF v_key_owner != v_user_id AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Unauthorized to revoke this API key';
  END IF;

  UPDATE api_keys
  SET 
    status = 'revoked',
    revoked_at = now(),
    revoked_by = v_user_id,
    revoked_reason = p_reason
  WHERE id = p_key_id;

  INSERT INTO audit_logs (
    table_name,
    row_id,
    action,
    user_id,
    new_data
  ) VALUES (
    'api_keys',
    p_key_id,
    'UPDATE',
    v_user_id,
    jsonb_build_object(
      'status', 'revoked',
      'reason', p_reason
    )
  );

  RETURN TRUE;
END;
$$;

-- ========== FUNCIÓN: validate_api_key ==========
CREATE OR REPLACE FUNCTION validate_api_key(
  p_key_hash TEXT,
  p_required_scope TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL
)
RETURNS TABLE (
  is_valid BOOLEAN,
  user_id UUID,
  key_id UUID,
  centro_code TEXT,
  franchisee_id UUID,
  scopes JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_key RECORD;
  v_recent_requests INTEGER;
BEGIN
  SELECT * INTO v_key
  FROM api_keys
  WHERE key_hash = p_key_hash
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > now());

  IF v_key IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, NULL::TEXT, NULL::UUID, NULL::JSONB;
    RETURN;
  END IF;

  IF v_key.ip_whitelist IS NOT NULL AND p_ip_address IS NOT NULL THEN
    IF NOT (p_ip_address = ANY(v_key.ip_whitelist)) THEN
      RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, NULL::TEXT, NULL::UUID, NULL::JSONB;
      RETURN;
    END IF;
  END IF;

  IF p_required_scope IS NOT NULL THEN
    IF NOT (v_key.scopes ? p_required_scope) THEN
      RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, NULL::TEXT, NULL::UUID, NULL::JSONB;
      RETURN;
    END IF;
  END IF;

  SELECT COUNT(*) INTO v_recent_requests
  FROM api_key_usage_logs
  WHERE api_key_id = v_key.id
    AND timestamp > now() - INTERVAL '1 hour';

  IF v_recent_requests >= v_key.rate_limit THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, NULL::TEXT, NULL::UUID, NULL::JSONB;
    RETURN;
  END IF;

  UPDATE api_keys
  SET 
    last_used_at = now(),
    last_used_ip = p_ip_address,
    request_count = request_count + 1
  WHERE id = v_key.id;

  RETURN QUERY SELECT 
    TRUE,
    v_key.user_id,
    v_key.id,
    v_key.centro_code,
    v_key.franchisee_id,
    v_key.scopes;
END;
$$;