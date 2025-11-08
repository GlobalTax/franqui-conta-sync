-- =====================================================
-- Script de Datos Demo: Facturas Emitidas
-- Centros: Islazul (1050) y Loranca (457)
-- Periodo: Enero 2025
-- =====================================================

-- Variables de usuario (REEMPLAZAR CON ID REAL)
DO $$
DECLARE
  v_user_id uuid := '00000000-0000-0000-0000-000000000000'; -- REEMPLAZAR con SELECT id FROM auth.users LIMIT 1;
  v_fiscal_year_id_1050 uuid;
  v_fiscal_year_id_457 uuid;
  
  -- IDs de facturas
  v_invoice_1 uuid;
  v_invoice_2 uuid;
  v_invoice_3 uuid;
  v_invoice_4 uuid;
  v_invoice_5 uuid;
  v_invoice_6 uuid;
  v_invoice_7 uuid;
  v_invoice_8 uuid;
  v_invoice_9 uuid;
  v_invoice_10 uuid;
  
BEGIN

-- =====================================================
-- PREPARACIÓN: Años fiscales y secuencias
-- =====================================================

-- Crear año fiscal 2025 para Islazul (1050)
INSERT INTO fiscal_years (year, start_date, end_date, centro_code, status)
VALUES (2025, '2025-01-01', '2025-12-31', '1050', 'open')
ON CONFLICT DO NOTHING
RETURNING id INTO v_fiscal_year_id_1050;

IF v_fiscal_year_id_1050 IS NULL THEN
  SELECT id INTO v_fiscal_year_id_1050 FROM fiscal_years WHERE centro_code = '1050' AND year = 2025;
END IF;

-- Crear año fiscal 2025 para Loranca (457)
INSERT INTO fiscal_years (year, start_date, end_date, centro_code, status)
VALUES (2025, '2025-01-01', '2025-12-31', '457', 'open')
ON CONFLICT DO NOTHING
RETURNING id INTO v_fiscal_year_id_457;

IF v_fiscal_year_id_457 IS NULL THEN
  SELECT id INTO v_fiscal_year_id_457 FROM fiscal_years WHERE centro_code = '457' AND year = 2025;
END IF;

-- Crear secuencias de facturación si no existen
INSERT INTO invoice_sequences (centro_code, series, year, last_number)
VALUES 
  ('1050', 'A', 2025, 0),
  ('457', 'A', 2025, 0)
ON CONFLICT (centro_code, series, year) DO NOTHING;

-- =====================================================
-- FACTURAS ISLAZUL (1050) - 5 FACTURAS
-- =====================================================

-- Factura 1: Catering Evento Empresarial - PAGADA
v_invoice_1 := gen_random_uuid();
UPDATE invoice_sequences SET last_number = last_number + 1 
WHERE centro_code = '1050' AND series = 'A' AND year = 2025;

INSERT INTO invoices_issued (
  id, centro_code, invoice_series, invoice_number, invoice_date, due_date,
  customer_name, customer_tax_id, customer_email, customer_address,
  subtotal, tax_total, total, status, payment_method, payment_status,
  notes, created_by, fiscal_year_id
) VALUES (
  v_invoice_1, '1050', 'A', 1, '2025-01-05', '2025-02-05',
  'Iberdrola SA', 'A12345678', 'compras@iberdrola.es', 'Pza. Euskadi 5, Bilbao',
  1500.00, 150.00, 1650.00, 'paid', 'bank_transfer', 'paid',
  'Catering para evento corporativo - 50 asistentes',
  v_user_id, v_fiscal_year_id_1050
);

INSERT INTO invoice_lines (invoice_id, invoice_type, line_number, description, quantity, unit_price, tax_rate, tax_amount, total)
VALUES
  (v_invoice_1, 'issued', 1, 'Menús Grandes McCombo', 50, 18.00, 10.00, 90.00, 990.00),
  (v_invoice_1, 'issued', 2, 'Bebidas 500ml variadas', 100, 2.50, 10.00, 25.00, 275.00),
  (v_invoice_1, 'issued', 3, 'Servicio catering y entrega', 1, 250.00, 10.00, 25.00, 275.00);

-- Factura 2: Pedido Corporativo - ENVIADA
v_invoice_2 := gen_random_uuid();
UPDATE invoice_sequences SET last_number = last_number + 1 
WHERE centro_code = '1050' AND series = 'A' AND year = 2025;

INSERT INTO invoices_issued (
  id, centro_code, invoice_series, invoice_number, invoice_date, due_date,
  customer_name, customer_tax_id, customer_email, customer_address,
  subtotal, tax_total, total, status, payment_method, payment_status,
  notes, created_by, fiscal_year_id
) VALUES (
  v_invoice_2, '1050', 'A', 2, '2025-01-12', '2025-02-12',
  'Telefónica España SAU', 'A87654321', 'administracion@telefonica.es', 'Gran Vía 28, Madrid',
  450.00, 45.00, 495.00, 'sent', 'bank_transfer', 'pending',
  'Pedido corporativo reunión de equipo',
  v_user_id, v_fiscal_year_id_1050
);

INSERT INTO invoice_lines (invoice_id, invoice_type, line_number, description, quantity, unit_price, tax_rate, tax_amount, total)
VALUES
  (v_invoice_2, 'issued', 1, 'McMenu BigMac Mediano', 30, 12.00, 10.00, 36.00, 396.00),
  (v_invoice_2, 'issued', 2, 'Patatas Grandes', 30, 3.00, 10.00, 9.00, 99.00);

-- Factura 3: Servicio Catering Colegio - PAGADA
v_invoice_3 := gen_random_uuid();
UPDATE invoice_sequences SET last_number = last_number + 1 
WHERE centro_code = '1050' AND series = 'A' AND year = 2025;

INSERT INTO invoices_issued (
  id, centro_code, invoice_series, invoice_number, invoice_date, due_date,
  customer_name, customer_tax_id, customer_email, customer_address,
  subtotal, tax_total, total, status, payment_method, payment_status,
  notes, created_by, fiscal_year_id
) VALUES (
  v_invoice_3, '1050', 'A', 3, '2025-01-18', '2025-02-18',
  'Colegio Santa María', 'Q2887002G', 'administracion@colegiosantamaria.es', 'C/ Educación 15, Bilbao',
  800.00, 80.00, 880.00, 'paid', 'bank_transfer', 'paid',
  'Catering excursión escolar - 100 alumnos',
  v_user_id, v_fiscal_year_id_1050
);

INSERT INTO invoice_lines (invoice_id, invoice_type, line_number, description, quantity, unit_price, tax_rate, tax_amount, total)
VALUES
  (v_invoice_3, 'issued', 1, 'Happy Meal Completo', 100, 5.50, 10.00, 55.00, 605.00),
  (v_invoice_3, 'issued', 2, 'Manzanas frescas', 100, 0.80, 10.00, 8.00, 88.00),
  (v_invoice_3, 'issued', 3, 'Zumos naturales 200ml', 100, 1.20, 10.00, 12.00, 132.00),
  (v_invoice_3, 'issued', 4, 'Servicio y coordinación', 1, 50.00, 10.00, 5.00, 55.00);

-- Factura 4: Pedido Empresa Local - ENVIADA
v_invoice_4 := gen_random_uuid();
UPDATE invoice_sequences SET last_number = last_number + 1 
WHERE centro_code = '1050' AND series = 'A' AND year = 2025;

INSERT INTO invoices_issued (
  id, centro_code, invoice_series, invoice_number, invoice_date, due_date,
  customer_name, customer_tax_id, customer_email, customer_address,
  subtotal, tax_total, total, status, payment_method, payment_status,
  notes, created_by, fiscal_year_id
) VALUES (
  v_invoice_4, '1050', 'A', 4, '2025-01-25', '2025-02-25',
  'Construcciones García SL', 'B98765432', 'contabilidad@garciaconstrucciones.es', 'Polígono Industrial 34, Bilbao',
  280.00, 28.00, 308.00, 'sent', 'bank_transfer', 'pending',
  'Pedido diario obra - 20 operarios',
  v_user_id, v_fiscal_year_id_1050
);

INSERT INTO invoice_lines (invoice_id, invoice_type, line_number, description, quantity, unit_price, tax_rate, tax_amount, total)
VALUES
  (v_invoice_4, 'issued', 1, 'Menús Medianos variados', 20, 11.00, 10.00, 22.00, 242.00),
  (v_invoice_4, 'issued', 2, 'Café solo/cortado', 20, 1.50, 10.00, 3.00, 33.00),
  (v_invoice_4, 'issued', 3, 'Donuts variados', 20, 1.50, 10.00, 3.00, 33.00);

-- Factura 5: Venta Merchandising - BORRADOR
v_invoice_5 := gen_random_uuid();
UPDATE invoice_sequences SET last_number = last_number + 1 
WHERE centro_code = '1050' AND series = 'A' AND year = 2025;

INSERT INTO invoices_issued (
  id, centro_code, invoice_series, invoice_number, invoice_date, due_date,
  customer_name, customer_tax_id, customer_email, customer_address,
  subtotal, tax_total, total, status, payment_method, payment_status,
  notes, created_by, fiscal_year_id
) VALUES (
  v_invoice_5, '1050', 'A', 5, '2025-01-28', '2025-02-28',
  'Club Deportivo Islazul', 'G75312468', 'info@cdislazul.com', 'Av. Deportes 10, Bilbao',
  500.00, 105.00, 605.00, 'draft', 'bank_transfer', 'pending',
  'Merchandising evento deportivo',
  v_user_id, v_fiscal_year_id_1050
);

INSERT INTO invoice_lines (invoice_id, invoice_type, line_number, description, quantity, unit_price, tax_rate, tax_amount, total)
VALUES
  (v_invoice_5, 'issued', 1, 'Camisetas promocionales personalizadas', 50, 8.00, 21.00, 84.00, 484.00),
  (v_invoice_5, 'issued', 2, 'Gorras con logo', 50, 2.00, 21.00, 21.00, 121.00);

-- =====================================================
-- FACTURAS LORANCA (457) - 5 FACTURAS
-- =====================================================

-- Factura 6: Catering Cumpleaños - PAGADA
v_invoice_6 := gen_random_uuid();
UPDATE invoice_sequences SET last_number = last_number + 1 
WHERE centro_code = '457' AND series = 'A' AND year = 2025;

INSERT INTO invoices_issued (
  id, centro_code, invoice_series, invoice_number, invoice_date, due_date,
  customer_name, customer_tax_id, customer_email, customer_address,
  subtotal, tax_total, total, status, payment_method, payment_status,
  notes, created_by, fiscal_year_id
) VALUES (
  v_invoice_6, '457', 'A', 1, '2025-01-08', '2025-02-08',
  'Familia Martínez López', '12345678Z', 'martinez.lopez@gmail.com', 'C/ Loranca 45, Fuenlabrada',
  300.00, 30.00, 330.00, 'paid', 'card', 'paid',
  'Celebración cumpleaños infantil - 25 niños',
  v_user_id, v_fiscal_year_id_457
);

INSERT INTO invoice_lines (invoice_id, invoice_type, line_number, description, quantity, unit_price, tax_rate, tax_amount, total)
VALUES
  (v_invoice_6, 'issued', 1, 'Happy Meal Cumpleaños', 25, 6.00, 10.00, 15.00, 165.00),
  (v_invoice_6, 'issued', 2, 'Tarta cumpleaños personalizada', 2, 45.00, 10.00, 9.00, 99.00),
  (v_invoice_6, 'issued', 3, 'Decoración y globos', 1, 60.00, 10.00, 6.00, 66.00);

-- Factura 7: Pedido Empresa - PAGADA
v_invoice_7 := gen_random_uuid();
UPDATE invoice_sequences SET last_number = last_number + 1 
WHERE centro_code = '457' AND series = 'A' AND year = 2025;

INSERT INTO invoices_issued (
  id, centro_code, invoice_series, invoice_number, invoice_date, due_date,
  customer_name, customer_tax_id, customer_email, customer_address,
  subtotal, tax_total, total, status, payment_method, payment_status,
  notes, created_by, fiscal_year_id
) VALUES (
  v_invoice_7, '457', 'A', 2, '2025-01-15', '2025-02-15',
  'Banco Santander SA', 'A39000013', 'compras.madrid@santander.com', 'Pº Castellana 140, Madrid',
  520.00, 52.00, 572.00, 'paid', 'bank_transfer', 'paid',
  'Desayunos semanales oficina - Enero S2',
  v_user_id, v_fiscal_year_id_457
);

INSERT INTO invoice_lines (invoice_id, invoice_type, line_number, description, quantity, unit_price, tax_rate, tax_amount, total)
VALUES
  (v_invoice_7, 'issued', 1, 'Desayuno completo (café + croissant)', 40, 4.50, 10.00, 18.00, 198.00),
  (v_invoice_7, 'issued', 2, 'Café premium variado', 50, 2.00, 10.00, 10.00, 110.00),
  (v_invoice_7, 'issued', 3, 'Zumos naturales 300ml', 40, 2.80, 10.00, 11.20, 123.20),
  (v_invoice_7, 'issued', 4, 'Bollería variada', 30, 3.60, 10.00, 10.80, 118.80),
  (v_invoice_7, 'issued', 5, 'Servicio entrega en oficina', 1, 20.00, 10.00, 2.00, 22.00);

-- Factura 8: Servicio Hospital - ENVIADA
v_invoice_8 := gen_random_uuid();
UPDATE invoice_sequences SET last_number = last_number + 1 
WHERE centro_code = '457' AND series = 'A' AND year = 2025;

INSERT INTO invoices_issued (
  id, centro_code, invoice_series, invoice_number, invoice_date, due_date,
  customer_name, customer_tax_id, customer_email, customer_address,
  subtotal, tax_total, total, status, payment_method, payment_status,
  notes, created_by, fiscal_year_id
) VALUES (
  v_invoice_8, '457', 'A', 3, '2025-01-20', '2025-02-20',
  'Hospital Universitario Gregorio Marañón', 'Q2887002G', 'compras@hgugm.es', 'C/ Dr. Esquerdo 46, Madrid',
  900.00, 90.00, 990.00, 'sent', 'bank_transfer', 'pending',
  'Servicio comedor personal sanitario - Guardia 20/01',
  v_user_id, v_fiscal_year_id_457
);

INSERT INTO invoice_lines (invoice_id, invoice_type, line_number, description, quantity, unit_price, tax_rate, tax_amount, total)
VALUES
  (v_invoice_8, 'issued', 1, 'Menú saludable (ensalada + proteína)', 60, 9.00, 10.00, 54.00, 594.00),
  (v_invoice_8, 'issued', 2, 'Ensaladas Premium variadas', 60, 4.50, 10.00, 27.00, 297.00),
  (v_invoice_8, 'issued', 3, 'Agua mineral 500ml', 100, 0.90, 10.00, 9.00, 99.00);

-- Factura 9: Evento Deportivo - ENVIADA
v_invoice_9 := gen_random_uuid();
UPDATE invoice_sequences SET last_number = last_number + 1 
WHERE centro_code = '457' AND series = 'A' AND year = 2025;

INSERT INTO invoices_issued (
  id, centro_code, invoice_series, invoice_number, invoice_date, due_date,
  customer_name, customer_tax_id, customer_email, customer_address,
  subtotal, tax_total, total, status, payment_method, payment_status,
  notes, created_by, fiscal_year_id
) VALUES (
  v_invoice_9, '457', 'A', 4, '2025-01-26', '2025-02-26',
  'Asociación Maratón Madrid', 'G28987654', 'info@maratonmadrid.es', 'Av. Concha Espina 8, Madrid',
  1100.00, 110.00, 1210.00, 'sent', 'bank_transfer', 'pending',
  'Avituallamiento Maratón Madrid 2025',
  v_user_id, v_fiscal_year_id_457
);

INSERT INTO invoice_lines (invoice_id, invoice_type, line_number, description, quantity, unit_price, tax_rate, tax_amount, total)
VALUES
  (v_invoice_9, 'issued', 1, 'Menú ligero post-carrera', 80, 8.00, 10.00, 64.00, 704.00),
  (v_invoice_9, 'issued', 2, 'Bebidas isotónicas 500ml', 120, 2.50, 10.00, 30.00, 330.00),
  (v_invoice_9, 'issued', 3, 'Frutas y barritas energéticas', 80, 2.00, 10.00, 16.00, 176.00);

-- Factura 10: Merchandising Corporativo - BORRADOR
v_invoice_10 := gen_random_uuid();
UPDATE invoice_sequences SET last_number = last_number + 1 
WHERE centro_code = '457' AND series = 'A' AND year = 2025;

INSERT INTO invoices_issued (
  id, centro_code, invoice_series, invoice_number, invoice_date, due_date,
  customer_name, customer_tax_id, customer_email, customer_address,
  subtotal, tax_total, total, status, payment_method, payment_status,
  notes, created_by, fiscal_year_id
) VALUES (
  v_invoice_10, '457', 'A', 5, '2025-01-30', '2025-02-28',
  'Ayuntamiento de Fuenlabrada', 'P2805400I', 'compras@ayto-fuenlabrada.es', 'Plaza de la Constitución 1, Fuenlabrada',
  450.00, 94.50, 544.50, 'draft', 'bank_transfer', 'pending',
  'Merchandising Fiestas Patronales 2025',
  v_user_id, v_fiscal_year_id_457
);

INSERT INTO invoice_lines (invoice_id, invoice_type, line_number, description, quantity, unit_price, tax_rate, tax_amount, total)
VALUES
  (v_invoice_10, 'issued', 1, 'Vasos personalizados logo ayuntamiento', 200, 1.50, 21.00, 63.00, 363.00),
  (v_invoice_10, 'issued', 2, 'Llaveros McDonalds Fuenlabrada', 150, 0.80, 21.00, 25.20, 145.20),
  (v_invoice_10, 'issued', 3, 'Bolsas reutilizables personalizadas', 100, 0.30, 21.00, 6.30, 36.30);

END $$;

-- =====================================================
-- VERIFICACIÓN DE DATOS
-- =====================================================

-- Contar facturas creadas por centro
SELECT 
  centro_code,
  COUNT(*) as total_facturas,
  SUM(total) as total_facturado,
  SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END) as total_cobrado,
  SUM(CASE WHEN status = 'sent' THEN total ELSE 0 END) as total_pendiente,
  SUM(CASE WHEN status = 'draft' THEN total ELSE 0 END) as total_borrador
FROM invoices_issued
WHERE centro_code IN ('1050', '457')
GROUP BY centro_code
ORDER BY centro_code;

-- Ver todas las facturas con sus líneas
SELECT 
  ii.centro_code,
  ii.invoice_series || '-' || LPAD(ii.invoice_number::text, 4, '0') as numero_factura,
  ii.invoice_date,
  ii.customer_name,
  ii.status,
  ii.total,
  COUNT(il.id) as num_lineas
FROM invoices_issued ii
LEFT JOIN invoice_lines il ON il.invoice_id = ii.id AND il.invoice_type = 'issued'
WHERE ii.centro_code IN ('1050', '457')
GROUP BY ii.id, ii.centro_code, ii.invoice_series, ii.invoice_number, 
         ii.invoice_date, ii.customer_name, ii.status, ii.total
ORDER BY ii.centro_code, ii.invoice_date;
