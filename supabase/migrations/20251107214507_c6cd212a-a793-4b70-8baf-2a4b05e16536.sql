-- Insertar permisos para el rol CONTABLE
INSERT INTO role_permissions (role, permission, granted, description)
VALUES 
  ('contable', 'centres.view', true, 'Ver información de centros'),
  ('contable', 'reports.view', true, 'Ver reportes contables'),
  ('contable', 'reports.export', true, 'Exportar reportes contables'),
  ('contable', 'settings.view', true, 'Ver configuración contable')
ON CONFLICT (role, permission) DO UPDATE SET granted = EXCLUDED.granted;