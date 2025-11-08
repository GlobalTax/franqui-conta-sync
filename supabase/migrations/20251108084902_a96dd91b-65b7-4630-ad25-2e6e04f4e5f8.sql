-- FASE 1: Crear tabla companies
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franchisee_id UUID NOT NULL REFERENCES franchisees(id) ON DELETE CASCADE,
  razon_social TEXT NOT NULL,
  cif TEXT NOT NULL UNIQUE,
  tipo_sociedad TEXT DEFAULT 'SL',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_companies_franchisee_id ON companies(franchisee_id);
CREATE INDEX idx_companies_cif ON companies(cif);

-- RLS policies para companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all companies"
ON companies FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view companies of their franchisee"
ON companies FOR SELECT
TO authenticated
USING (
  franchisee_id IN (
    SELECT DISTINCT franchisee_id 
    FROM centres 
    WHERE codigo IN (
      SELECT centro_code 
      FROM v_user_centres 
      WHERE user_id = auth.uid()
    )
  )
);

-- Trigger para updated_at
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON companies
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- FASE 2: Migrar datos de centre_companies a companies
INSERT INTO companies (franchisee_id, razon_social, cif, tipo_sociedad, activo)
SELECT DISTINCT
  c.franchisee_id,
  cc.razon_social,
  cc.cif,
  cc.tipo_sociedad,
  cc.activo
FROM centre_companies cc
JOIN centres c ON cc.centre_id = c.id
WHERE cc.es_principal = true
  AND c.franchisee_id IS NOT NULL
ON CONFLICT (cif) DO NOTHING;

-- FASE 3: Añadir company_id a centres
ALTER TABLE centres
ADD COLUMN company_id UUID REFERENCES companies(id);

CREATE INDEX idx_centres_company_id ON centres(company_id);

-- FASE 4: Migrar referencias de centres a companies
UPDATE centres c
SET company_id = (
  SELECT co.id
  FROM companies co
  JOIN centre_companies cc ON cc.cif = co.cif
  WHERE cc.centre_id = c.id 
    AND cc.es_principal = true
  LIMIT 1
);

-- FASE 5: Hacer company_id NOT NULL (después de verificar)
-- Verificar primero que todos tienen valor
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM centres WHERE company_id IS NULL) THEN
    ALTER TABLE centres ALTER COLUMN company_id SET NOT NULL;
  ELSE
    RAISE NOTICE 'Algunos centros no tienen company_id asignado. Revisar manualmente.';
  END IF;
END $$;

-- FASE 6: Marcar centre_companies como deprecated
COMMENT ON TABLE centre_companies IS 'DEPRECATED - datos migrados a companies. No usar para nuevos desarrollos.';