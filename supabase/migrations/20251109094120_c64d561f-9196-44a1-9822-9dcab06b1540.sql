-- Desasociar todos los centros de sus sociedades
UPDATE centres 
SET company_id = NULL 
WHERE company_id IS NOT NULL;

-- Eliminar todas las sociedades
DELETE FROM companies;

-- Verificación: Confirmar tabla vacía
DO $$
DECLARE
  companies_count INTEGER;
  centres_with_company INTEGER;
BEGIN
  SELECT COUNT(*) INTO companies_count FROM companies;
  SELECT COUNT(*) INTO centres_with_company FROM centres WHERE company_id IS NOT NULL;
  
  RAISE NOTICE 'Sociedades restantes: %', companies_count;
  RAISE NOTICE 'Centros con company_id: %', centres_with_company;
  
  IF companies_count > 0 THEN
    RAISE EXCEPTION 'Error: Aún quedan % sociedades en la tabla', companies_count;
  END IF;
  
  IF centres_with_company > 0 THEN
    RAISE EXCEPTION 'Error: Aún quedan % centros con company_id', centres_with_company;
  END IF;
END $$;