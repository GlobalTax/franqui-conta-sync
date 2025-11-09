-- =====================================================
-- MIGRATION: Create RPC functions for company configuration
-- =====================================================

-- Function to search locations (postal codes, municipalities, provinces)
CREATE OR REPLACE FUNCTION search_locations(
  search_query TEXT,
  limit_results INTEGER DEFAULT 10
)
RETURNS TABLE(
  postal_code TEXT,
  municipality_name TEXT,
  province_name TEXT,
  province_id INTEGER,
  municipality_id INTEGER,
  match_type TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  -- Search by postal code
  SELECT 
    pc.code as postal_code,
    m.name as municipality_name,
    p.name as province_name,
    p.id as province_id,
    m.id as municipality_id,
    'postal_code'::TEXT as match_type
  FROM postal_codes pc
  LEFT JOIN municipalities m ON m.id = pc.municipality_id
  LEFT JOIN provinces p ON p.id = pc.province_id
  WHERE pc.code ILIKE search_query || '%'
  
  UNION ALL
  
  -- Search by municipality name
  SELECT 
    pc.code as postal_code,
    m.name as municipality_name,
    p.name as province_name,
    p.id as province_id,
    m.id as municipality_id,
    'municipality'::TEXT as match_type
  FROM municipalities m
  LEFT JOIN provinces p ON p.id = m.province_id
  LEFT JOIN postal_codes pc ON pc.municipality_id = m.id
  WHERE m.name ILIKE '%' || search_query || '%'
  
  UNION ALL
  
  -- Search by province name
  SELECT 
    NULL::TEXT as postal_code,
    NULL::TEXT as municipality_name,
    p.name as province_name,
    p.id as province_id,
    NULL::INTEGER as municipality_id,
    'province'::TEXT as match_type
  FROM provinces p
  WHERE p.name ILIKE '%' || search_query || '%'
  
  ORDER BY match_type, postal_code
  LIMIT limit_results;
END;
$$;

-- Function to upsert company with addresses
CREATE OR REPLACE FUNCTION upsert_company_with_addresses(
  p_company_id UUID,
  p_company_data JSONB,
  p_fiscal_address JSONB,
  p_social_address JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fiscal_address_id UUID;
  v_social_address_id UUID;
  v_result JSONB;
  v_existing_fiscal_id UUID;
  v_existing_social_id UUID;
BEGIN
  -- Get existing address IDs if any
  SELECT address_fiscal_id, address_social_id 
  INTO v_existing_fiscal_id, v_existing_social_id
  FROM companies 
  WHERE id = p_company_id;

  -- Upsert fiscal address
  IF p_fiscal_address IS NOT NULL AND p_fiscal_address::TEXT != 'null' THEN
    IF v_existing_fiscal_id IS NOT NULL THEN
      -- Update existing address
      UPDATE addresses SET
        street_type = COALESCE((p_fiscal_address->>'street_type')::TEXT, street_type),
        street_name = COALESCE((p_fiscal_address->>'street_name')::TEXT, street_name),
        number = COALESCE((p_fiscal_address->>'number')::TEXT, number),
        staircase = (p_fiscal_address->>'staircase')::TEXT,
        floor = (p_fiscal_address->>'floor')::TEXT,
        door = (p_fiscal_address->>'door')::TEXT,
        postal_code = COALESCE((p_fiscal_address->>'postal_code')::TEXT, postal_code),
        municipality_id = (p_fiscal_address->>'municipality_id')::INTEGER,
        province_id = (p_fiscal_address->>'province_id')::INTEGER,
        country_code = COALESCE((p_fiscal_address->>'country_code')::TEXT, 'ES'),
        updated_at = NOW()
      WHERE id = v_existing_fiscal_id;
      v_fiscal_address_id := v_existing_fiscal_id;
    ELSE
      -- Insert new address
      INSERT INTO addresses (
        street_type, street_name, number, staircase, floor, door,
        postal_code, municipality_id, province_id, country_code
      ) VALUES (
        (p_fiscal_address->>'street_type')::TEXT,
        (p_fiscal_address->>'street_name')::TEXT,
        (p_fiscal_address->>'number')::TEXT,
        (p_fiscal_address->>'staircase')::TEXT,
        (p_fiscal_address->>'floor')::TEXT,
        (p_fiscal_address->>'door')::TEXT,
        (p_fiscal_address->>'postal_code')::TEXT,
        (p_fiscal_address->>'municipality_id')::INTEGER,
        (p_fiscal_address->>'province_id')::INTEGER,
        COALESCE((p_fiscal_address->>'country_code')::TEXT, 'ES')
      )
      RETURNING id INTO v_fiscal_address_id;
    END IF;
  END IF;

  -- Upsert social address
  IF p_social_address IS NOT NULL AND p_social_address::TEXT != 'null' THEN
    IF v_existing_social_id IS NOT NULL THEN
      -- Update existing address
      UPDATE addresses SET
        street_type = COALESCE((p_social_address->>'street_type')::TEXT, street_type),
        street_name = COALESCE((p_social_address->>'street_name')::TEXT, street_name),
        number = COALESCE((p_social_address->>'number')::TEXT, number),
        staircase = (p_social_address->>'staircase')::TEXT,
        floor = (p_social_address->>'floor')::TEXT,
        door = (p_social_address->>'door')::TEXT,
        postal_code = COALESCE((p_social_address->>'postal_code')::TEXT, postal_code),
        municipality_id = (p_social_address->>'municipality_id')::INTEGER,
        province_id = (p_social_address->>'province_id')::INTEGER,
        country_code = COALESCE((p_social_address->>'country_code')::TEXT, 'ES'),
        updated_at = NOW()
      WHERE id = v_existing_social_id;
      v_social_address_id := v_existing_social_id;
    ELSE
      -- Insert new address
      INSERT INTO addresses (
        street_type, street_name, number, staircase, floor, door,
        postal_code, municipality_id, province_id, country_code
      ) VALUES (
        (p_social_address->>'street_type')::TEXT,
        (p_social_address->>'street_name')::TEXT,
        (p_social_address->>'number')::TEXT,
        (p_social_address->>'staircase')::TEXT,
        (p_social_address->>'floor')::TEXT,
        (p_social_address->>'door')::TEXT,
        (p_social_address->>'postal_code')::TEXT,
        (p_social_address->>'municipality_id')::INTEGER,
        (p_social_address->>'province_id')::INTEGER,
        COALESCE((p_social_address->>'country_code')::TEXT, 'ES')
      )
      RETURNING id INTO v_social_address_id;
    END IF;
  END IF;

  -- Update company
  UPDATE companies SET
    razon_social = COALESCE((p_company_data->>'razon_social')::TEXT, razon_social),
    cif = COALESCE((p_company_data->>'cif')::TEXT, cif),
    tipo_sociedad = COALESCE((p_company_data->>'tipo_sociedad')::TEXT, tipo_sociedad),
    code = (p_company_data->>'code')::TEXT,
    legal_type = COALESCE((p_company_data->>'legal_type')::TEXT, legal_type),
    nif_prefix = (p_company_data->>'nif_prefix')::TEXT,
    nif_number = (p_company_data->>'nif_number')::TEXT,
    country_fiscal_code = COALESCE((p_company_data->>'country_fiscal_code')::TEXT, country_fiscal_code),
    phone1 = (p_company_data->>'phone1')::TEXT,
    phone2 = (p_company_data->>'phone2')::TEXT,
    phone3 = (p_company_data->>'phone3')::TEXT,
    phone4 = (p_company_data->>'phone4')::TEXT,
    contact_name = (p_company_data->>'contact_name')::TEXT,
    email = (p_company_data->>'email')::TEXT,
    address_fiscal_id = COALESCE(v_fiscal_address_id, address_fiscal_id),
    address_social_id = COALESCE(v_social_address_id, address_social_id),
    updated_at = NOW()
  WHERE id = p_company_id
  RETURNING to_jsonb(companies.*) INTO v_result;

  RETURN v_result;
END;
$$;