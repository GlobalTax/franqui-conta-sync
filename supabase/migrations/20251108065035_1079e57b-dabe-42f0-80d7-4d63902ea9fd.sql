-- 1) Crear índice único en centres.codigo (requerido para FK desde user_roles)
CREATE UNIQUE INDEX IF NOT EXISTS ux_centres_codigo ON public.centres(codigo);

-- 2) Añadir Foreign Keys
-- FK: centres.franchisee_id -> franchisees.id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_centres_franchisee' 
    AND table_name = 'centres'
  ) THEN
    -- Primero normalizar: centros sin franchisee_id los asignamos a un franquiciado por defecto
    -- Usamos el primer franquiciado activo que exista, o creamos uno genérico
    UPDATE public.centres 
    SET franchisee_id = (SELECT id FROM public.franchisees LIMIT 1)
    WHERE franchisee_id IS NULL;
    
    ALTER TABLE public.centres 
    ADD CONSTRAINT fk_centres_franchisee 
    FOREIGN KEY (franchisee_id) REFERENCES public.franchisees(id) ON DELETE SET NULL;
  END IF;
END $$;

-- FK: user_roles.franchisee_id -> franchisees.id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_user_roles_franchisee' 
    AND table_name = 'user_roles'
  ) THEN
    ALTER TABLE public.user_roles 
    ADD CONSTRAINT fk_user_roles_franchisee 
    FOREIGN KEY (franchisee_id) REFERENCES public.franchisees(id) ON DELETE CASCADE;
  END IF;
END $$;

-- FK: user_roles.centro -> centres.codigo
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_user_roles_centro' 
    AND table_name = 'user_roles'
  ) THEN
    ALTER TABLE public.user_roles 
    ADD CONSTRAINT fk_user_roles_centro 
    FOREIGN KEY (centro) REFERENCES public.centres(codigo) ON DELETE CASCADE;
  END IF;
END $$;

-- 3) Crear tabla memberships
CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.franchisees(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES public.centres(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'contable', 'gerente_restaurante')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id, restaurant_id, role)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON public.memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_organization_id ON public.memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_memberships_restaurant_id ON public.memberships(restaurant_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_memberships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_memberships_updated_at ON public.memberships;
CREATE TRIGGER trigger_memberships_updated_at
  BEFORE UPDATE ON public.memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_memberships_updated_at();

-- 4) RLS en memberships
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- Policy: Los usuarios pueden ver sus propios memberships
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.memberships;
CREATE POLICY "Users can view their own memberships"
  ON public.memberships
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy: Admins pueden ver y gestionar todos los memberships
DROP POLICY IF EXISTS "Admins can manage all memberships" ON public.memberships;
CREATE POLICY "Admins can manage all memberships"
  ON public.memberships
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Policy: Sistema puede insertar (para triggers automáticos)
DROP POLICY IF EXISTS "System can insert memberships" ON public.memberships;
CREATE POLICY "System can insert memberships"
  ON public.memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 5) Poblar memberships desde user_roles existentes
INSERT INTO public.memberships (user_id, organization_id, restaurant_id, role, active)
SELECT DISTINCT
  ur.user_id,
  CASE 
    WHEN ur.role = 'admin'::app_role THEN ur.franchisee_id
    ELSE c.franchisee_id
  END as organization_id,
  CASE 
    WHEN ur.role = 'admin'::app_role THEN NULL
    ELSE c.id
  END as restaurant_id,
  CASE 
    WHEN ur.role = 'admin'::app_role THEN 'admin'
    WHEN ur.role = 'gestor'::app_role THEN 'contable'
    WHEN ur.role = 'franquiciado'::app_role THEN 'gerente_restaurante'
    WHEN ur.role = 'contable'::app_role THEN 'contable'
    ELSE 'gerente_restaurante'
  END as role,
  true as active
FROM public.user_roles ur
LEFT JOIN public.centres c ON c.codigo = ur.centro
WHERE 
  -- Admins: solo si tienen franchisee_id (memberships a nivel org)
  (ur.role = 'admin'::app_role AND ur.franchisee_id IS NOT NULL)
  -- Otros roles: solo si tienen centro válido
  OR (ur.role != 'admin'::app_role AND ur.centro IS NOT NULL AND c.id IS NOT NULL)
ON CONFLICT (user_id, organization_id, restaurant_id, role) DO NOTHING;