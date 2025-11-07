-- Crear foreign key entre user_roles.centro y centres.codigo
ALTER TABLE user_roles
ADD CONSTRAINT fk_user_roles_centro
FOREIGN KEY (centro)
REFERENCES centres(codigo)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Crear índice en centres.codigo para optimizar JOINs
CREATE INDEX IF NOT EXISTS idx_centres_codigo 
ON centres(codigo);

-- Crear índice en user_roles.centro para optimizar JOINs
CREATE INDEX IF NOT EXISTS idx_user_roles_centro 
ON user_roles(centro);

-- Verificar la integridad
DO $$
DECLARE
  v_orphaned_count INT;
BEGIN
  SELECT COUNT(*) INTO v_orphaned_count
  FROM user_roles ur
  WHERE ur.centro IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM centres c WHERE c.codigo = ur.centro);
  
  IF v_orphaned_count > 0 THEN
    RAISE EXCEPTION 'Hay % registros en user_roles con centros que no existen', v_orphaned_count;
  END IF;
  
  RAISE NOTICE 'Integridad verificada: todos los centros en user_roles existen en centres';
END $$;