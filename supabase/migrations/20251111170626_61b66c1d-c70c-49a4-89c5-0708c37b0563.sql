-- ============================================================================
-- PONTO INTEGRATION - Coexistencia con Salt Edge
-- ============================================================================

-- 1. Conexiones Ponto (vinculadas a centros)
CREATE TABLE IF NOT EXISTS public.ponto_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_code TEXT NOT NULL REFERENCES public.centres(codigo) ON DELETE CASCADE,
  institution_id TEXT NOT NULL,
  institution_name TEXT,
  consent_reference TEXT,
  scope TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'disabled', 'consent_expired')),
  access_token_enc TEXT NOT NULL,
  refresh_token_enc TEXT,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Cuentas bancarias Ponto
CREATE TABLE IF NOT EXISTS public.ponto_accounts (
  id TEXT PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES public.ponto_connections(id) ON DELETE CASCADE,
  iban TEXT,
  name TEXT,
  currency TEXT DEFAULT 'EUR',
  account_type TEXT,
  holder TEXT,
  status TEXT,
  raw_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Balances de cuentas
CREATE TABLE IF NOT EXISTS public.ponto_account_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id TEXT NOT NULL REFERENCES public.ponto_accounts(id) ON DELETE CASCADE,
  balance_date DATE NOT NULL,
  available NUMERIC(18,2),
  current_balance NUMERIC(18,2),
  raw_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id, balance_date)
);

-- 4. Transacciones bancarias Ponto
CREATE TABLE IF NOT EXISTS public.ponto_transactions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES public.ponto_accounts(id) ON DELETE CASCADE,
  booking_date DATE,
  value_date DATE,
  amount NUMERIC(18,2) NOT NULL,
  currency TEXT,
  counterparty TEXT,
  remittance_info TEXT,
  category TEXT,
  raw_json JSONB,
  hash_dedup TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Log de sincronizaciones
CREATE TABLE IF NOT EXISTS public.ponto_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.ponto_connections(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('accounts', 'transactions', 'balances', 'full')),
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'partial')),
  accounts_synced INTEGER DEFAULT 0,
  transactions_synced INTEGER DEFAULT 0,
  error_message TEXT,
  details JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_ponto_accounts_connection ON public.ponto_accounts(connection_id);
CREATE INDEX IF NOT EXISTS idx_ponto_tx_account_date ON public.ponto_transactions(account_id, booking_date DESC);
CREATE INDEX IF NOT EXISTS idx_ponto_tx_hash ON public.ponto_transactions(hash_dedup);
CREATE INDEX IF NOT EXISTS idx_ponto_balances_account ON public.ponto_account_balances(account_id, balance_date DESC);
CREATE INDEX IF NOT EXISTS idx_ponto_sync_connection ON public.ponto_sync_log(connection_id, started_at DESC);

-- RLS Policies (usando modelo existente user_roles + centres)
ALTER TABLE public.ponto_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ponto_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ponto_account_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ponto_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ponto_sync_log ENABLE ROW LEVEL SECURITY;

-- SELECT: usuarios con acceso al centro
CREATE POLICY ponto_select_connections ON public.ponto_connections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.v_user_centres vc
      WHERE vc.user_id = auth.uid() 
        AND vc.centro_code = ponto_connections.centro_code
    )
  );

CREATE POLICY ponto_select_accounts ON public.ponto_accounts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.ponto_connections pc
      JOIN public.v_user_centres vc ON vc.centro_code = pc.centro_code
      WHERE pc.id = ponto_accounts.connection_id 
        AND vc.user_id = auth.uid()
    )
  );

CREATE POLICY ponto_select_balances ON public.ponto_account_balances
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.ponto_accounts pa
      JOIN public.ponto_connections pc ON pc.id = pa.connection_id
      JOIN public.v_user_centres vc ON vc.centro_code = pc.centro_code
      WHERE pa.id = ponto_account_balances.account_id 
        AND vc.user_id = auth.uid()
    )
  );

CREATE POLICY ponto_select_transactions ON public.ponto_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.ponto_accounts pa
      JOIN public.ponto_connections pc ON pc.id = pa.connection_id
      JOIN public.v_user_centres vc ON vc.centro_code = pc.centro_code
      WHERE pa.id = ponto_transactions.account_id 
        AND vc.user_id = auth.uid()
    )
  );

CREATE POLICY ponto_select_sync_log ON public.ponto_sync_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.ponto_connections pc
      JOIN public.v_user_centres vc ON vc.centro_code = pc.centro_code
      WHERE pc.id = ponto_sync_log.connection_id 
        AND vc.user_id = auth.uid()
    )
  );

-- Backend-only writes (service_role key)
CREATE POLICY ponto_backend_write_connections ON public.ponto_connections FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY ponto_backend_write_accounts ON public.ponto_accounts FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY ponto_backend_write_balances ON public.ponto_account_balances FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY ponto_backend_write_transactions ON public.ponto_transactions FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY ponto_backend_write_sync_log ON public.ponto_sync_log FOR ALL USING (false) WITH CHECK (false);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_ponto_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ponto_connections_updated_at
  BEFORE UPDATE ON public.ponto_connections
  FOR EACH ROW EXECUTE FUNCTION update_ponto_updated_at();

CREATE TRIGGER update_ponto_accounts_updated_at
  BEFORE UPDATE ON public.ponto_accounts
  FOR EACH ROW EXECUTE FUNCTION update_ponto_updated_at();