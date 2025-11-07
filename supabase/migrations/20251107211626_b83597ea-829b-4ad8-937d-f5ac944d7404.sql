-- Create centre_companies table for managing multiple CIFs per centre
CREATE TABLE centre_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id UUID NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
  cif TEXT NOT NULL,
  razon_social TEXT NOT NULL,
  tipo_sociedad TEXT NOT NULL DEFAULT 'SL',
  es_principal BOOLEAN NOT NULL DEFAULT false,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(centre_id, cif)
);

-- Create indices
CREATE INDEX idx_centre_companies_centre ON centre_companies(centre_id);
CREATE INDEX idx_centre_companies_cif ON centre_companies(cif);
CREATE INDEX idx_centre_companies_activo ON centre_companies(activo);

-- Enable RLS
ALTER TABLE centre_companies ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage centre_companies"
ON centre_companies FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'::app_role
  )
);

CREATE POLICY "Users can view companies for their accessible centres"
ON centre_companies FOR SELECT
TO authenticated
USING (
  centre_id IN (
    SELECT c.id 
    FROM centres c
    WHERE c.codigo IN (
      SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
    )
  )
);

-- Function to set primary company (ensures only one per centre)
CREATE OR REPLACE FUNCTION set_primary_company(
  _centre_id UUID,
  _company_id UUID
) RETURNS VOID AS $$
BEGIN
  -- Unmark all as principal
  UPDATE centre_companies
  SET es_principal = false
  WHERE centre_id = _centre_id;
  
  -- Mark the selected one as principal
  UPDATE centre_companies
  SET es_principal = true
  WHERE id = _company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for updated_at
CREATE TRIGGER update_centre_companies_updated_at
BEFORE UPDATE ON centre_companies
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Migrate existing company_tax_id data if present
INSERT INTO centre_companies (centre_id, cif, razon_social, tipo_sociedad, es_principal, activo)
SELECT 
  id,
  company_tax_id,
  COALESCE(franchisee_name, nombre) || ' SL',
  'SL',
  true,
  true
FROM centres
WHERE company_tax_id IS NOT NULL 
  AND company_tax_id != ''
  AND NOT EXISTS (
    SELECT 1 FROM centre_companies cc WHERE cc.centre_id = centres.id
  );