-- Seed Demo Data: Plan General Contable Español (PGC) for demo centres
-- This populates the accounts table with the Spanish General Accounting Plan
-- for centres 1050 (Islazul) and 457 (Loranca)

-- Helper function to insert accounts for a centre
CREATE OR REPLACE FUNCTION insert_pgc_for_centre(p_centro_code TEXT, p_company_id UUID DEFAULT NULL)
RETURNS void AS $$
BEGIN
  -- GRUPO 1: FINANCIACIÓN BÁSICA
  INSERT INTO accounts (centro_code, company_id, code, name, account_type, parent_code, level, is_detail) VALUES
  (p_centro_code, p_company_id, '1', 'FINANCIACIÓN BÁSICA', 'PN', NULL, 0, false),
  (p_centro_code, p_company_id, '10', 'Capital', 'PN', '1', 1, false),
  (p_centro_code, p_company_id, '100', 'Capital social', 'PN', '10', 2, true),
  (p_centro_code, p_company_id, '101', 'Fondo social', 'PN', '10', 2, true),
  (p_centro_code, p_company_id, '11', 'Reservas', 'PN', '1', 1, false),
  (p_centro_code, p_company_id, '110', 'Prima de emisión o asunción', 'PN', '11', 2, true),
  (p_centro_code, p_company_id, '112', 'Reserva legal', 'PN', '11', 2, true),
  (p_centro_code, p_company_id, '113', 'Reservas voluntarias', 'PN', '11', 2, true),
  (p_centro_code, p_company_id, '12', 'Resultados pendientes de aplicación', 'PN', '1', 1, false),
  (p_centro_code, p_company_id, '120', 'Remanente', 'PN', '12', 2, true),
  (p_centro_code, p_company_id, '121', 'Resultados negativos de ejercicios anteriores', 'PN', '12', 2, true),
  (p_centro_code, p_company_id, '129', 'Resultado del ejercicio', 'PN', '12', 2, true),
  (p_centro_code, p_company_id, '13', 'Subvenciones, donaciones y legados', 'PN', '1', 1, false),
  (p_centro_code, p_company_id, '130', 'Subvenciones oficiales de capital', 'PN', '13', 2, true),
  (p_centro_code, p_company_id, '17', 'Deudas a largo plazo por préstamos', 'P', '1', 1, false),
  (p_centro_code, p_company_id, '170', 'Deudas a largo plazo con entidades de crédito', 'P', '17', 2, true),
  (p_centro_code, p_company_id, '171', 'Deudas a largo plazo', 'P', '17', 2, true);

  -- GRUPO 2: ACTIVO NO CORRIENTE
  INSERT INTO accounts (centro_code, company_id, code, name, account_type, parent_code, level, is_detail) VALUES
  (p_centro_code, p_company_id, '2', 'ACTIVO NO CORRIENTE', 'A', NULL, 0, false),
  (p_centro_code, p_company_id, '20', 'Inmovilizaciones intangibles', 'A', '2', 1, false),
  (p_centro_code, p_company_id, '200', 'Investigación', 'A', '20', 2, true),
  (p_centro_code, p_company_id, '201', 'Desarrollo', 'A', '20', 2, true),
  (p_centro_code, p_company_id, '203', 'Propiedad industrial', 'A', '20', 2, true),
  (p_centro_code, p_company_id, '206', 'Aplicaciones informáticas', 'A', '20', 2, true),
  (p_centro_code, p_company_id, '21', 'Inmovilizaciones materiales', 'A', '2', 1, false),
  (p_centro_code, p_company_id, '210', 'Terrenos y bienes naturales', 'A', '21', 2, true),
  (p_centro_code, p_company_id, '211', 'Construcciones', 'A', '21', 2, true),
  (p_centro_code, p_company_id, '212', 'Instalaciones técnicas', 'A', '21', 2, true),
  (p_centro_code, p_company_id, '213', 'Maquinaria', 'A', '21', 2, true),
  (p_centro_code, p_company_id, '216', 'Mobiliario', 'A', '21', 2, true),
  (p_centro_code, p_company_id, '217', 'Equipos para procesos de información', 'A', '21', 2, true),
  (p_centro_code, p_company_id, '218', 'Elementos de transporte', 'A', '21', 2, true),
  (p_centro_code, p_company_id, '28', 'Amortización acumulada del inmovilizado', 'A', '2', 1, false),
  (p_centro_code, p_company_id, '280', 'Amortización acumulada del inmovilizado intangible', 'A', '28', 2, true),
  (p_centro_code, p_company_id, '281', 'Amortización acumulada del inmovilizado material', 'A', '28', 2, true);

  -- GRUPO 4: ACREEDORES Y DEUDORES POR OPERACIONES COMERCIALES
  INSERT INTO accounts (centro_code, company_id, code, name, account_type, parent_code, level, is_detail) VALUES
  (p_centro_code, p_company_id, '4', 'ACREEDORES Y DEUDORES', 'A', NULL, 0, false),
  (p_centro_code, p_company_id, '40', 'Proveedores', 'P', '4', 1, false),
  (p_centro_code, p_company_id, '400', 'Proveedores', 'P', '40', 2, true),
  (p_centro_code, p_company_id, '401', 'Proveedores, efectos comerciales a pagar', 'P', '40', 2, true),
  (p_centro_code, p_company_id, '41', 'Acreedores varios', 'P', '4', 1, false),
  (p_centro_code, p_company_id, '410', 'Acreedores por prestaciones de servicios', 'P', '41', 2, true),
  (p_centro_code, p_company_id, '411', 'Acreedores, efectos comerciales a pagar', 'P', '41', 2, true),
  (p_centro_code, p_company_id, '43', 'Clientes', 'A', '4', 1, false),
  (p_centro_code, p_company_id, '430', 'Clientes', 'A', '43', 2, true),
  (p_centro_code, p_company_id, '431', 'Clientes, efectos comerciales a cobrar', 'A', '43', 2, true),
  (p_centro_code, p_company_id, '44', 'Deudores varios', 'A', '4', 1, false),
  (p_centro_code, p_company_id, '440', 'Deudores', 'A', '44', 2, true),
  (p_centro_code, p_company_id, '47', 'Administraciones Públicas', 'A', '4', 1, false),
  (p_centro_code, p_company_id, '470', 'Hacienda Pública, deudor por diversos conceptos', 'A', '47', 2, true),
  (p_centro_code, p_company_id, '472', 'Hacienda Pública, IVA soportado', 'A', '47', 2, true),
  (p_centro_code, p_company_id, '473', 'Hacienda Pública, retenciones y pagos a cuenta', 'A', '47', 2, true),
  (p_centro_code, p_company_id, '475', 'Hacienda Pública, acreedor por conceptos fiscales', 'P', '47', 2, true),
  (p_centro_code, p_company_id, '476', 'Organismos de la Seguridad Social, acreedores', 'P', '47', 2, true),
  (p_centro_code, p_company_id, '477', 'Hacienda Pública, IVA repercutido', 'P', '47', 2, true);

  -- GRUPO 5: CUENTAS FINANCIERAS
  INSERT INTO accounts (centro_code, company_id, code, name, account_type, parent_code, level, is_detail) VALUES
  (p_centro_code, p_company_id, '5', 'CUENTAS FINANCIERAS', 'A', NULL, 0, false),
  (p_centro_code, p_company_id, '52', 'Deudas a corto plazo por préstamos', 'P', '5', 1, false),
  (p_centro_code, p_company_id, '520', 'Deudas a corto plazo con entidades de crédito', 'P', '52', 2, true),
  (p_centro_code, p_company_id, '521', 'Deudas a corto plazo', 'P', '52', 2, true),
  (p_centro_code, p_company_id, '57', 'Tesorería', 'A', '5', 1, false),
  (p_centro_code, p_company_id, '570', 'Caja, euros', 'A', '57', 2, true),
  (p_centro_code, p_company_id, '572', 'Bancos e instituciones de crédito c/c vista, euros', 'A', '57', 2, true);

  -- GRUPO 6: COMPRAS Y GASTOS
  INSERT INTO accounts (centro_code, company_id, code, name, account_type, parent_code, level, is_detail) VALUES
  (p_centro_code, p_company_id, '6', 'COMPRAS Y GASTOS', 'GAS', NULL, 0, false),
  (p_centro_code, p_company_id, '60', 'Compras', 'GAS', '6', 1, false),
  (p_centro_code, p_company_id, '600', 'Compras de mercaderías', 'GAS', '60', 2, true),
  (p_centro_code, p_company_id, '601', 'Compras de materias primas', 'GAS', '60', 2, true),
  (p_centro_code, p_company_id, '602', 'Compras de otros aprovisionamientos', 'GAS', '60', 2, true),
  (p_centro_code, p_company_id, '62', 'Servicios exteriores', 'GAS', '6', 1, false),
  (p_centro_code, p_company_id, '621', 'Arrendamientos y cánones', 'GAS', '62', 2, true),
  (p_centro_code, p_company_id, '622', 'Reparaciones y conservación', 'GAS', '62', 2, true),
  (p_centro_code, p_company_id, '623', 'Servicios de profesionales independientes', 'GAS', '62', 2, true),
  (p_centro_code, p_company_id, '624', 'Transportes', 'GAS', '62', 2, true),
  (p_centro_code, p_company_id, '625', 'Primas de seguros', 'GAS', '62', 2, true),
  (p_centro_code, p_company_id, '626', 'Servicios bancarios y similares', 'GAS', '62', 2, true),
  (p_centro_code, p_company_id, '627', 'Publicidad, propaganda y relaciones públicas', 'GAS', '62', 2, true),
  (p_centro_code, p_company_id, '628', 'Suministros', 'GAS', '62', 2, true),
  (p_centro_code, p_company_id, '629', 'Otros servicios', 'GAS', '62', 2, true),
  (p_centro_code, p_company_id, '63', 'Tributos', 'GAS', '6', 1, false),
  (p_centro_code, p_company_id, '631', 'Otros tributos', 'GAS', '63', 2, true),
  (p_centro_code, p_company_id, '64', 'Gastos de personal', 'GAS', '6', 1, false),
  (p_centro_code, p_company_id, '640', 'Sueldos y salarios', 'GAS', '64', 2, true),
  (p_centro_code, p_company_id, '642', 'Seguridad Social a cargo de la empresa', 'GAS', '64', 2, true),
  (p_centro_code, p_company_id, '649', 'Otros gastos sociales', 'GAS', '64', 2, true),
  (p_centro_code, p_company_id, '65', 'Otros gastos de gestión', 'GAS', '6', 1, false),
  (p_centro_code, p_company_id, '650', 'Pérdidas de créditos comerciales incobrables', 'GAS', '65', 2, true),
  (p_centro_code, p_company_id, '68', 'Dotaciones para amortizaciones', 'GAS', '6', 1, false),
  (p_centro_code, p_company_id, '680', 'Amortización del inmovilizado intangible', 'GAS', '68', 2, true),
  (p_centro_code, p_company_id, '681', 'Amortización del inmovilizado material', 'GAS', '68', 2, true);

  -- GRUPO 7: VENTAS E INGRESOS
  INSERT INTO accounts (centro_code, company_id, code, name, account_type, parent_code, level, is_detail) VALUES
  (p_centro_code, p_company_id, '7', 'VENTAS E INGRESOS', 'ING', NULL, 0, false),
  (p_centro_code, p_company_id, '70', 'Ventas de mercaderías, de producción propia', 'ING', '7', 1, false),
  (p_centro_code, p_company_id, '700', 'Ventas de mercaderías', 'ING', '70', 2, true),
  (p_centro_code, p_company_id, '701', 'Ventas de productos terminados', 'ING', '70', 2, true),
  (p_centro_code, p_company_id, '705', 'Prestaciones de servicios', 'ING', '70', 2, true),
  (p_centro_code, p_company_id, '75', 'Otros ingresos de gestión', 'ING', '7', 1, false),
  (p_centro_code, p_company_id, '752', 'Ingresos por arrendamientos', 'ING', '75', 2, true),
  (p_centro_code, p_company_id, '759', 'Ingresos por servicios diversos', 'ING', '75', 2, true),
  (p_centro_code, p_company_id, '76', 'Ingresos financieros', 'ING', '7', 1, false),
  (p_centro_code, p_company_id, '760', 'Ingresos de participaciones en instrumentos de patrimonio', 'ING', '76', 2, true),
  (p_centro_code, p_company_id, '769', 'Otros ingresos financieros', 'ING', '76', 2, true);

END;
$$ LANGUAGE plpgsql;

-- Insert PGC for Centro 1050 - Islazul
DO $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Get the company_id for centro 1050 if exists
  SELECT company_id INTO v_company_id 
  FROM centres 
  WHERE codigo = '1050' 
  LIMIT 1;
  
  -- Insert accounts for centro 1050
  PERFORM insert_pgc_for_centre('1050', v_company_id);
  
  RAISE NOTICE 'PGC inserted for centro 1050 - Islazul';
END $$;

-- Insert PGC for Centro 457 - Loranca
DO $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Get the company_id for centro 457 if exists
  SELECT company_id INTO v_company_id 
  FROM centres 
  WHERE codigo = '457' 
  LIMIT 1;
  
  -- Insert accounts for centro 457
  PERFORM insert_pgc_for_centre('457', v_company_id);
  
  RAISE NOTICE 'PGC inserted for centro 457 - Loranca';
END $$;

-- Clean up helper function
DROP FUNCTION IF EXISTS insert_pgc_for_centre(TEXT, UUID);

-- Verify insertion
DO $$
DECLARE
  v_count_1050 INTEGER;
  v_count_457 INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count_1050 FROM accounts WHERE centro_code = '1050';
  SELECT COUNT(*) INTO v_count_457 FROM accounts WHERE centro_code = '457';
  
  RAISE NOTICE 'Accounts created for centro 1050: %', v_count_1050;
  RAISE NOTICE 'Accounts created for centro 457: %', v_count_457;
END $$;
