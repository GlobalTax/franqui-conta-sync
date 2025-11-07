-- Solo agregar 'contable' al enum app_role
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'app_role' 
    AND e.enumlabel = 'contable'
  ) THEN
    ALTER TYPE app_role ADD VALUE 'contable';
  END IF;
END $$;