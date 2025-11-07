-- =====================================================
-- SISTEMA DE PERMISOS GRANULARES
-- =====================================================

-- 1. Crear enum con todas las acciones del sistema
CREATE TYPE permission_action AS ENUM (
  -- Empleados
  'employees.view',
  'employees.create',
  'employees.edit',
  'employees.delete',
  'employees.export',
  
  -- Horarios
  'schedules.view',
  'schedules.create',
  'schedules.edit',
  'schedules.delete',
  'schedules.import',
  
  -- Nóminas
  'payrolls.view',
  'payrolls.create',
  'payrolls.edit',
  'payrolls.delete',
  'payrolls.import',
  'payrolls.export',
  
  -- Ausencias
  'absences.view',
  'absences.create',
  'absences.edit',
  'absences.delete',
  
  -- Centros
  'centres.view',
  'centres.edit',
  'centres.manage_users',
  'centres.manage_companies',
  
  -- Reportes
  'reports.view',
  'reports.export',
  
  -- Calidad de Datos
  'dq_issues.view',
  'dq_issues.resolve',
  
  -- Alertas
  'alerts.view',
  'alerts.create',
  'alerts.edit',
  'alerts.delete',
  
  -- Admin
  'users.manage',
  'roles.manage',
  'franchisees.manage',
  'settings.view',
  'settings.edit',
  'audit_logs.view',
  
  -- Importación
  'import.payrolls',
  'import.schedules',
  'import.employees',
  'import.absences'
);

-- 2. Tabla de permisos por rol (permisos base/plantilla)
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission permission_action NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(role, permission)
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission);

-- 3. Tabla de permisos customizados por usuario-centro
CREATE TABLE user_centre_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  centro TEXT NOT NULL,
  permission permission_action NOT NULL,
  granted BOOLEAN NOT NULL,
  notes TEXT,
  granted_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, centro, permission)
);

CREATE INDEX idx_ucp_user_centro ON user_centre_permissions(user_id, centro);
CREATE INDEX idx_ucp_permission ON user_centre_permissions(permission);

-- 4. Función central de verificación de permisos
CREATE OR REPLACE FUNCTION has_permission(
  _user_id UUID,
  _permission permission_action,
  _centro TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_has_role_permission BOOLEAN;
  v_custom_permission BOOLEAN;
BEGIN
  -- 1. Admin siempre tiene todos los permisos
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = 'admin'
  ) INTO v_is_admin;
  
  IF v_is_admin THEN
    RETURN true;
  END IF;
  
  -- 2. Si se especifica un centro, verificar permisos customizados primero
  IF _centro IS NOT NULL THEN
    SELECT granted INTO v_custom_permission
    FROM user_centre_permissions
    WHERE user_id = _user_id
      AND centro = _centro
      AND permission = _permission;
    
    -- Si hay permiso customizado, usarlo (puede ser grant o deny explícito)
    IF FOUND THEN
      RETURN v_custom_permission;
    END IF;
  END IF;
  
  -- 3. Verificar permisos por rol (permisos base)
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id
      AND rp.permission = _permission
      AND rp.granted = true
      AND (_centro IS NULL OR ur.centro = _centro OR ur.centro IS NULL)
  ) INTO v_has_role_permission;
  
  RETURN v_has_role_permission;
END;
$$;

-- 5. Función para obtener todos los permisos de un usuario
CREATE OR REPLACE FUNCTION get_user_permissions(
  _user_id UUID,
  _centro TEXT DEFAULT NULL
)
RETURNS TABLE (
  permission permission_action,
  source TEXT,
  role app_role,
  centro TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admin: todos los permisos
  IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = 'admin') THEN
    RETURN QUERY
    SELECT 
      unnest(enum_range(NULL::permission_action)),
      'admin'::TEXT,
      'admin'::app_role,
      NULL::TEXT;
    RETURN;
  END IF;
  
  -- Permisos por rol
  RETURN QUERY
  SELECT DISTINCT
    rp.permission,
    'role'::TEXT,
    ur.role,
    ur.centro
  FROM user_roles ur
  JOIN role_permissions rp ON rp.role = ur.role
  WHERE ur.user_id = _user_id
    AND rp.granted = true
    AND (_centro IS NULL OR ur.centro = _centro OR ur.centro IS NULL);
  
  -- Permisos customizados
  RETURN QUERY
  SELECT 
    ucp.permission,
    'custom'::TEXT,
    NULL::app_role,
    ucp.centro
  FROM user_centre_permissions ucp
  WHERE ucp.user_id = _user_id
    AND ucp.granted = true
    AND (_centro IS NULL OR ucp.centro = _centro);
END;
$$;

-- 6. Insertar permisos base por rol
-- Admin: todos los permisos
INSERT INTO role_permissions (role, permission, granted) 
SELECT 'admin'::app_role, unnest(enum_range(NULL::permission_action)), true;

-- Gestor: permisos de gestión en centros asignados
INSERT INTO role_permissions (role, permission, granted) VALUES
('gestor', 'employees.view', true),
('gestor', 'employees.create', true),
('gestor', 'employees.edit', true),
('gestor', 'employees.export', true),
('gestor', 'schedules.view', true),
('gestor', 'schedules.create', true),
('gestor', 'schedules.edit', true),
('gestor', 'schedules.import', true),
('gestor', 'payrolls.view', true),
('gestor', 'payrolls.import', true),
('gestor', 'payrolls.export', true),
('gestor', 'absences.view', true),
('gestor', 'absences.create', true),
('gestor', 'absences.edit', true),
('gestor', 'reports.view', true),
('gestor', 'reports.export', true),
('gestor', 'dq_issues.view', true),
('gestor', 'dq_issues.resolve', true),
('gestor', 'alerts.view', true),
('gestor', 'centres.view', true),
('gestor', 'import.payrolls', true),
('gestor', 'import.schedules', true),
('gestor', 'import.employees', true),
('gestor', 'import.absences', true);

-- Franquiciado: solo lectura
INSERT INTO role_permissions (role, permission, granted) VALUES
('franquiciado', 'employees.view', true),
('franquiciado', 'schedules.view', true),
('franquiciado', 'payrolls.view', true),
('franquiciado', 'absences.view', true),
('franquiciado', 'reports.view', true),
('franquiciado', 'reports.export', true),
('franquiciado', 'dq_issues.view', true),
('franquiciado', 'centres.view', true);

-- Asesoría: solo lectura global
INSERT INTO role_permissions (role, permission, granted) VALUES
('asesoria', 'employees.view', true),
('asesoria', 'schedules.view', true),
('asesoria', 'payrolls.view', true),
('asesoria', 'absences.view', true),
('asesoria', 'reports.view', true),
('asesoria', 'reports.export', true),
('asesoria', 'centres.view', true);

-- 7. RLS para nuevas tablas
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage role permissions"
ON role_permissions FOR ALL
TO authenticated
USING (has_permission(auth.uid(), 'roles.manage'::permission_action));

CREATE POLICY "Everyone can view role permissions"
ON role_permissions FOR SELECT
TO authenticated
USING (true);

ALTER TABLE user_centre_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage custom permissions"
ON user_centre_permissions FOR ALL
TO authenticated
USING (has_permission(auth.uid(), 'users.manage'::permission_action));

CREATE POLICY "Users can view their own custom permissions"
ON user_centre_permissions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 8. Actualizar políticas RLS de tablas existentes
-- EMPLOYEES
DROP POLICY IF EXISTS "Users can view employees in their accessible centres" ON employees;
DROP POLICY IF EXISTS "Admins can manage all employees" ON employees;

CREATE POLICY "Users can view employees with permission"
ON employees FOR SELECT
TO authenticated
USING (has_permission(auth.uid(), 'employees.view'::permission_action, centro));

CREATE POLICY "Users can create employees with permission"
ON employees FOR INSERT
TO authenticated
WITH CHECK (has_permission(auth.uid(), 'employees.create'::permission_action, centro));

CREATE POLICY "Users can update employees with permission"
ON employees FOR UPDATE
TO authenticated
USING (has_permission(auth.uid(), 'employees.edit'::permission_action, centro))
WITH CHECK (has_permission(auth.uid(), 'employees.edit'::permission_action, centro));

CREATE POLICY "Users can delete employees with permission"
ON employees FOR DELETE
TO authenticated
USING (has_permission(auth.uid(), 'employees.delete'::permission_action, centro));

-- PAYROLLS
DROP POLICY IF EXISTS "Users can view payrolls for their accessible centres" ON payrolls;
DROP POLICY IF EXISTS "Admins can manage all payrolls" ON payrolls;

CREATE POLICY "Users can view payrolls with permission"
ON payrolls FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = payrolls.employee_id
      AND has_permission(auth.uid(), 'payrolls.view'::permission_action, e.centro)
  )
);

CREATE POLICY "Users can insert payrolls with permission"
ON payrolls FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = payrolls.employee_id
      AND has_permission(auth.uid(), 'payrolls.create'::permission_action, e.centro)
  )
);

CREATE POLICY "Users can update payrolls with permission"
ON payrolls FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = payrolls.employee_id
      AND has_permission(auth.uid(), 'payrolls.edit'::permission_action, e.centro)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = payrolls.employee_id
      AND has_permission(auth.uid(), 'payrolls.edit'::permission_action, e.centro)
  )
);

CREATE POLICY "Users can delete payrolls with permission"
ON payrolls FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = payrolls.employee_id
      AND has_permission(auth.uid(), 'payrolls.delete'::permission_action, e.centro)
  )
);

-- SCHEDULES
DROP POLICY IF EXISTS "Users can view schedules for their accessible centres" ON schedules;
DROP POLICY IF EXISTS "Admins can manage all schedules" ON schedules;

CREATE POLICY "Users can view schedules with permission"
ON schedules FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = schedules.employee_id
      AND has_permission(auth.uid(), 'schedules.view'::permission_action, e.centro)
  )
);

CREATE POLICY "Users can insert schedules with permission"
ON schedules FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = schedules.employee_id
      AND has_permission(auth.uid(), 'schedules.create'::permission_action, e.centro)
  )
);

CREATE POLICY "Users can update schedules with permission"
ON schedules FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = schedules.employee_id
      AND has_permission(auth.uid(), 'schedules.edit'::permission_action, e.centro)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = schedules.employee_id
      AND has_permission(auth.uid(), 'schedules.edit'::permission_action, e.centro)
  )
);

CREATE POLICY "Users can delete schedules with permission"
ON schedules FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = schedules.employee_id
      AND has_permission(auth.uid(), 'schedules.delete'::permission_action, e.centro)
  )
);

-- ABSENCES
DROP POLICY IF EXISTS "Users can view absences for their accessible centres" ON absences;
DROP POLICY IF EXISTS "Admins can manage all absences" ON absences;

CREATE POLICY "Users can view absences with permission"
ON absences FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = absences.employee_id
      AND has_permission(auth.uid(), 'absences.view'::permission_action, e.centro)
  )
);

CREATE POLICY "Users can insert absences with permission"
ON absences FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = absences.employee_id
      AND has_permission(auth.uid(), 'absences.create'::permission_action, e.centro)
  )
);

CREATE POLICY "Users can update absences with permission"
ON absences FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = absences.employee_id
      AND has_permission(auth.uid(), 'absences.edit'::permission_action, e.centro)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = absences.employee_id
      AND has_permission(auth.uid(), 'absences.edit'::permission_action, e.centro)
  )
);

CREATE POLICY "Users can delete absences with permission"
ON absences FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = absences.employee_id
      AND has_permission(auth.uid(), 'absences.delete'::permission_action, e.centro)
  )
);

-- CENTRES
DROP POLICY IF EXISTS "Users can view centres they have access to" ON centres;

CREATE POLICY "Users can view centres with permission"
ON centres FOR SELECT
TO authenticated
USING (has_permission(auth.uid(), 'centres.view'::permission_action, codigo));

CREATE POLICY "Users can update centres with permission"
ON centres FOR UPDATE
TO authenticated
USING (has_permission(auth.uid(), 'centres.edit'::permission_action, codigo))
WITH CHECK (has_permission(auth.uid(), 'centres.edit'::permission_action, codigo));