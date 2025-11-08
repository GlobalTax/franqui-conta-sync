-- =====================================================
-- FASE 3: MÓDULO DE FACTURACIÓN - MIGRACIÓN COMPLETA
-- =====================================================

-- 1. TABLA: suppliers (Proveedores)
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  commercial_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'España',
  payment_terms INTEGER DEFAULT 30,
  default_account_code TEXT,
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TABLA: invoices_received (Facturas Recibidas)
CREATE TABLE IF NOT EXISTS public.invoices_received (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES public.suppliers(id),
  centro_code TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE,
  subtotal NUMERIC(12,2),
  tax_total NUMERIC(12,2),
  total NUMERIC(12,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  document_path TEXT,
  entry_id UUID REFERENCES public.accounting_entries(id),
  payment_transaction_id UUID REFERENCES public.bank_transactions(id),
  ocr_confidence NUMERIC(3,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  UNIQUE(supplier_id, invoice_number)
);

-- 3. TABLA: invoices_issued (Facturas Emitidas)
CREATE TABLE IF NOT EXISTS public.invoices_issued (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_code TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_tax_id TEXT,
  customer_email TEXT,
  customer_address TEXT,
  invoice_series TEXT DEFAULT 'A',
  invoice_number INTEGER NOT NULL,
  full_invoice_number TEXT GENERATED ALWAYS AS (invoice_series || '-' || LPAD(invoice_number::TEXT, 6, '0')) STORED,
  invoice_date DATE NOT NULL,
  due_date DATE,
  subtotal NUMERIC(12,2),
  tax_total NUMERIC(12,2),
  total NUMERIC(12,2) NOT NULL,
  status TEXT DEFAULT 'draft',
  entry_id UUID REFERENCES public.accounting_entries(id),
  payment_transaction_id UUID REFERENCES public.bank_transactions(id),
  pdf_path TEXT,
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  UNIQUE(centro_code, invoice_series, invoice_number)
);

-- 4. TABLA: invoice_lines (Líneas de Factura)
CREATE TABLE IF NOT EXISTS public.invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL,
  invoice_type TEXT NOT NULL CHECK (invoice_type IN ('received', 'issued')),
  line_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  discount_percentage NUMERIC(5,2) DEFAULT 0,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  subtotal NUMERIC(12,2) NOT NULL,
  tax_rate NUMERIC(5,2) DEFAULT 21,
  tax_amount NUMERIC(12,2) NOT NULL,
  total NUMERIC(12,2) NOT NULL,
  account_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. TABLA: invoice_sequences (Secuencias de Numeración)
CREATE TABLE IF NOT EXISTS public.invoice_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_code TEXT NOT NULL,
  invoice_type TEXT NOT NULL,
  series TEXT NOT NULL,
  year INTEGER NOT NULL,
  last_number INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(centro_code, invoice_type, series, year)
);

-- =====================================================
-- ÍNDICES DE PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_suppliers_tax_id ON public.suppliers(tax_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON public.suppliers(active);

CREATE INDEX IF NOT EXISTS idx_invoices_received_centro ON public.invoices_received(centro_code);
CREATE INDEX IF NOT EXISTS idx_invoices_received_supplier ON public.invoices_received(supplier_id);
CREATE INDEX IF NOT EXISTS idx_invoices_received_status ON public.invoices_received(status);
CREATE INDEX IF NOT EXISTS idx_invoices_received_date ON public.invoices_received(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_received_entry ON public.invoices_received(entry_id);

CREATE INDEX IF NOT EXISTS idx_invoices_issued_centro ON public.invoices_issued(centro_code);
CREATE INDEX IF NOT EXISTS idx_invoices_issued_status ON public.invoices_issued(status);
CREATE INDEX IF NOT EXISTS idx_invoices_issued_date ON public.invoices_issued(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_issued_number ON public.invoices_issued(full_invoice_number);

CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice ON public.invoice_lines(invoice_id, invoice_type);

-- =====================================================
-- TRIGGERS PARA updated_at
-- =====================================================

CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_received_updated_at
  BEFORE UPDATE ON public.invoices_received
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_issued_updated_at
  BEFORE UPDATE ON public.invoices_issued
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoice_sequences_updated_at
  BEFORE UPDATE ON public.invoice_sequences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Habilitar RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices_received ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices_issued ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_sequences ENABLE ROW LEVEL SECURITY;

-- SUPPLIERS POLICIES
CREATE POLICY "Admins can manage all suppliers"
  ON public.suppliers
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view suppliers"
  ON public.suppliers
  FOR SELECT
  USING (active = true);

CREATE POLICY "Users can create suppliers"
  ON public.suppliers
  FOR INSERT
  WITH CHECK (true);

-- INVOICES_RECEIVED POLICIES
CREATE POLICY "Admins can manage all invoices_received"
  ON public.invoices_received
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view invoices_received for accessible centres"
  ON public.invoices_received
  FOR SELECT
  USING (
    centro_code IN (
      SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create invoices_received for accessible centres"
  ON public.invoices_received
  FOR INSERT
  WITH CHECK (
    centro_code IN (
      SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update invoices_received for accessible centres"
  ON public.invoices_received
  FOR UPDATE
  USING (
    centro_code IN (
      SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
    )
  );

-- INVOICES_ISSUED POLICIES
CREATE POLICY "Admins can manage all invoices_issued"
  ON public.invoices_issued
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view invoices_issued for accessible centres"
  ON public.invoices_issued
  FOR SELECT
  USING (
    centro_code IN (
      SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create invoices_issued for accessible centres"
  ON public.invoices_issued
  FOR INSERT
  WITH CHECK (
    centro_code IN (
      SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update invoices_issued for accessible centres"
  ON public.invoices_issued
  FOR UPDATE
  USING (
    centro_code IN (
      SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
    )
  );

-- INVOICE_LINES POLICIES
CREATE POLICY "Admins can manage all invoice_lines"
  ON public.invoice_lines
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view invoice_lines for accessible invoices"
  ON public.invoice_lines
  FOR SELECT
  USING (
    (invoice_type = 'received' AND EXISTS (
      SELECT 1 FROM invoices_received ir 
      WHERE ir.id = invoice_lines.invoice_id 
        AND ir.centro_code IN (SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid())
    ))
    OR
    (invoice_type = 'issued' AND EXISTS (
      SELECT 1 FROM invoices_issued ii 
      WHERE ii.id = invoice_lines.invoice_id 
        AND ii.centro_code IN (SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid())
    ))
  );

CREATE POLICY "Users can create invoice_lines for accessible invoices"
  ON public.invoice_lines
  FOR INSERT
  WITH CHECK (
    (invoice_type = 'received' AND EXISTS (
      SELECT 1 FROM invoices_received ir 
      WHERE ir.id = invoice_lines.invoice_id 
        AND ir.centro_code IN (SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid())
    ))
    OR
    (invoice_type = 'issued' AND EXISTS (
      SELECT 1 FROM invoices_issued ii 
      WHERE ii.id = invoice_lines.invoice_id 
        AND ii.centro_code IN (SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid())
    ))
  );

CREATE POLICY "Users can delete invoice_lines for accessible invoices"
  ON public.invoice_lines
  FOR DELETE
  USING (
    (invoice_type = 'received' AND EXISTS (
      SELECT 1 FROM invoices_received ir 
      WHERE ir.id = invoice_lines.invoice_id 
        AND ir.centro_code IN (SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid())
    ))
    OR
    (invoice_type = 'issued' AND EXISTS (
      SELECT 1 FROM invoices_issued ii 
      WHERE ii.id = invoice_lines.invoice_id 
        AND ii.centro_code IN (SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid())
    ))
  );

-- INVOICE_SEQUENCES POLICIES
CREATE POLICY "Admins can manage all invoice_sequences"
  ON public.invoice_sequences
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view invoice_sequences for accessible centres"
  ON public.invoice_sequences
  FOR SELECT
  USING (
    centro_code IN (
      SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- STORAGE BUCKET PARA FACTURAS
-- =====================================================

-- Crear bucket para documentos de facturas
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoice-documents', 'invoice-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Policies para el bucket
CREATE POLICY "Users can view invoice documents for accessible centres"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'invoice-documents' 
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can upload invoice documents"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'invoice-documents' 
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete invoice documents"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'invoice-documents' 
    AND auth.uid() IS NOT NULL
  );

-- =====================================================
-- SEED DATA: PROVEEDORES DE EJEMPLO
-- =====================================================

INSERT INTO public.suppliers (tax_id, name, commercial_name, email, phone, address, city, postal_code, payment_terms, default_account_code, active)
VALUES
  ('A12345678', 'Distribuciones Alimentarias SA', 'DistriAliment', 'info@distrialiment.com', '+34 912 345 678', 'Calle Mayor 123', 'Madrid', '28001', 30, '400001', true),
  ('B87654321', 'Bebidas y Refrescos SL', 'BebidasCo', 'ventas@bebidasrefrescos.com', '+34 933 456 789', 'Av. Diagonal 456', 'Barcelona', '08019', 30, '400002', true),
  ('C11223344', 'Suministros Hostelería SRL', 'HostelSupply', 'pedidos@hostelsupply.com', '+34 954 123 456', 'Calle Sierpes 789', 'Sevilla', '41001', 15, '400003', true),
  ('D55667788', 'Mantenimiento Industrial SA', 'MantenPro', 'contacto@mantenpro.com', '+34 963 789 012', 'Av. del Puerto 321', 'Valencia', '46001', 60, '400004', true),
  ('E99887766', 'Energía y Servicios SL', 'EnergiServ', 'facturacion@energiserv.com', '+34 944 567 890', 'Gran Vía 654', 'Bilbao', '48001', 30, '400005', true),
  ('F44556677', 'Limpieza Profesional SA', 'CleanPro', 'admin@cleanpro.com', '+34 985 234 567', 'Calle Uría 987', 'Oviedo', '33001', 30, '400006', true),
  ('G22334455', 'Tecnología Punto de Venta SL', 'TechPOS', 'soporte@techpos.com', '+34 976 345 678', 'Paseo Independencia 147', 'Zaragoza', '50001', 45, '400007', true),
  ('H77889900', 'Marketing Digital SA', 'DigiMarketing', 'info@digimarketing.com', '+34 952 456 789', 'Calle Larios 258', 'Málaga', '29015', 30, '400008', true),
  ('I66778899', 'Uniformes Profesionales SL', 'UniformPro', 'pedidos@uniformpro.com', '+34 981 567 890', 'Rúa Nova 369', 'Santiago', '15001', 30, '400009', true),
  ('J33445566', 'Asesoría Contable y Fiscal SA', 'ContaFiscal', 'asesoria@contafiscal.com', '+34 968 678 901', 'Gran Vía Escultor 741', 'Murcia', '30001', 15, '400010', true);

-- =====================================================
-- SEED DATA: FACTURAS RECIBIDAS DE EJEMPLO
-- =====================================================

-- Obtener el primer centro activo para las facturas de ejemplo
DO $$
DECLARE
  v_centro_code TEXT;
  v_supplier_id_1 UUID;
  v_supplier_id_2 UUID;
  v_supplier_id_3 UUID;
  v_supplier_id_4 UUID;
  v_supplier_id_5 UUID;
BEGIN
  -- Obtener el primer centro activo
  SELECT codigo INTO v_centro_code FROM centres WHERE activo = true LIMIT 1;
  
  -- Obtener IDs de proveedores
  SELECT id INTO v_supplier_id_1 FROM suppliers WHERE tax_id = 'A12345678';
  SELECT id INTO v_supplier_id_2 FROM suppliers WHERE tax_id = 'B87654321';
  SELECT id INTO v_supplier_id_3 FROM suppliers WHERE tax_id = 'C11223344';
  SELECT id INTO v_supplier_id_4 FROM suppliers WHERE tax_id = 'D55667788';
  SELECT id INTO v_supplier_id_5 FROM suppliers WHERE tax_id = 'E99887766';

  -- Insertar facturas recibidas
  INSERT INTO public.invoices_received (supplier_id, centro_code, invoice_number, invoice_date, due_date, subtotal, tax_total, total, status, notes)
  VALUES
    (v_supplier_id_1, v_centro_code, 'FA-2024-001', '2024-01-15', '2024-02-14', 2500.00, 525.00, 3025.00, 'posted', 'Suministro mensual alimentación'),
    (v_supplier_id_1, v_centro_code, 'FA-2024-002', '2024-02-15', '2024-03-16', 2800.00, 588.00, 3388.00, 'posted', 'Suministro mensual alimentación'),
    (v_supplier_id_1, v_centro_code, 'FA-2024-003', '2024-03-15', '2024-04-14', 2650.00, 556.50, 3206.50, 'approved', 'Suministro mensual alimentación'),
    
    (v_supplier_id_2, v_centro_code, 'BEB-2024-101', '2024-01-20', '2024-02-19', 1200.00, 252.00, 1452.00, 'posted', 'Bebidas enero'),
    (v_supplier_id_2, v_centro_code, 'BEB-2024-102', '2024-02-20', '2024-03-21', 1350.00, 283.50, 1633.50, 'posted', 'Bebidas febrero'),
    (v_supplier_id_2, v_centro_code, 'BEB-2024-103', '2024-03-20', '2024-04-19', 1280.00, 268.80, 1548.80, 'pending', 'Bebidas marzo'),
    
    (v_supplier_id_3, v_centro_code, 'HS-2024-50', '2024-01-10', '2024-01-25', 450.00, 94.50, 544.50, 'posted', 'Material desechable'),
    (v_supplier_id_3, v_centro_code, 'HS-2024-51', '2024-02-10', '2024-02-25', 520.00, 109.20, 629.20, 'posted', 'Material desechable'),
    (v_supplier_id_3, v_centro_code, 'HS-2024-52', '2024-03-10', '2024-03-25', 480.00, 100.80, 580.80, 'pending', 'Material desechable'),
    
    (v_supplier_id_4, v_centro_code, 'MNT-2024-789', '2024-01-25', '2024-03-26', 3500.00, 735.00, 4235.00, 'posted', 'Mantenimiento trimestral equipos'),
    (v_supplier_id_4, v_centro_code, 'MNT-2024-790', '2024-02-15', '2024-04-16', 850.00, 178.50, 1028.50, 'approved', 'Reparación urgente cocina'),
    
    (v_supplier_id_5, v_centro_code, 'ENE-2024-1001', '2024-01-31', '2024-02-29', 1850.00, 388.50, 2238.50, 'posted', 'Electricidad enero'),
    (v_supplier_id_5, v_centro_code, 'ENE-2024-1002', '2024-02-29', '2024-03-30', 1920.00, 403.20, 2323.20, 'posted', 'Electricidad febrero'),
    (v_supplier_id_5, v_centro_code, 'ENE-2024-1003', '2024-03-31', '2024-04-30', 1780.00, 373.80, 2153.80, 'pending', 'Electricidad marzo');

  -- Insertar líneas de factura para algunas facturas
  INSERT INTO public.invoice_lines (invoice_id, invoice_type, line_number, description, quantity, unit_price, discount_percentage, discount_amount, subtotal, tax_rate, tax_amount, total, account_code)
  SELECT 
    ir.id,
    'received',
    1,
    'Productos varios',
    1,
    ir.subtotal,
    0,
    0,
    ir.subtotal,
    21,
    ir.tax_total,
    ir.total,
    '600000'
  FROM invoices_received ir
  WHERE ir.centro_code = v_centro_code;

END $$;

-- =====================================================
-- SEED DATA: FACTURAS EMITIDAS DE EJEMPLO
-- =====================================================

DO $$
DECLARE
  v_centro_code TEXT;
BEGIN
  -- Obtener el primer centro activo
  SELECT codigo INTO v_centro_code FROM centres WHERE activo = true LIMIT 1;

  -- Inicializar secuencia de numeración
  INSERT INTO public.invoice_sequences (centro_code, invoice_type, series, year, last_number)
  VALUES 
    (v_centro_code, 'issued', 'A', 2024, 10),
    (v_centro_code, 'issued', 'B', 2024, 5)
  ON CONFLICT (centro_code, invoice_type, series, year) DO NOTHING;

  -- Insertar facturas emitidas
  INSERT INTO public.invoices_issued (centro_code, customer_name, customer_tax_id, customer_email, invoice_series, invoice_number, invoice_date, due_date, subtotal, tax_total, total, status, notes)
  VALUES
    (v_centro_code, 'Eventos Corporativos SA', 'B98765432', 'eventos@corporativos.com', 'A', 1, '2024-01-10', '2024-02-09', 5000.00, 1050.00, 6050.00, 'paid', 'Catering evento corporativo'),
    (v_centro_code, 'Bodas y Celebraciones SL', 'C87654321', 'info@bodascelebraciones.com', 'A', 2, '2024-01-20', '2024-02-19', 8500.00, 1785.00, 10285.00, 'paid', 'Catering boda 150 personas'),
    (v_centro_code, 'Instituto Tecnológico', 'Q7654321B', 'administracion@instituto.edu', 'A', 3, '2024-02-05', '2024-03-06', 3200.00, 672.00, 3872.00, 'issued', 'Servicio cafetería mensual'),
    (v_centro_code, 'Ayuntamiento de la Ciudad', 'P2800000A', 'contabilidad@ayuntamiento.gob', 'A', 4, '2024-02-15', '2024-03-16', 12000.00, 2520.00, 14520.00, 'issued', 'Catering acto institucional'),
    (v_centro_code, 'Empresa Construcción SA', 'A11223344', 'admin@construccion.com', 'A', 5, '2024-02-25', '2024-03-26', 2500.00, 525.00, 3025.00, 'sent', 'Comidas obreros obra'),
    (v_centro_code, 'Club Deportivo Elite', 'G44332211', 'info@clubelite.com', 'A', 6, '2024-03-05', '2024-04-04', 4800.00, 1008.00, 5808.00, 'issued', 'Catering evento deportivo'),
    (v_centro_code, 'Hospital Universitario', 'Q8765432C', 'compras@hospital.com', 'A', 7, '2024-03-10', '2024-04-09', 15000.00, 1500.00, 16500.00, 'draft', 'Servicio comedor sanitarios IVA reducido'),
    (v_centro_code, 'Conferencia Anual 2024', 'N0012345F', 'organizacion@conferencia2024.com', 'A', 8, '2024-03-15', '2024-04-14', 9500.00, 1995.00, 11495.00, 'draft', 'Catering congreso 300 asistentes'),
    (v_centro_code, 'Feria Internacional', 'J55667788', 'contacto@feriainternacional.com', 'B', 1, '2024-03-18', '2024-04-17', 6200.00, 1302.00, 7502.00, 'draft', 'Stand catering feria'),
    (v_centro_code, 'Graduación Universidad', 'Q3456789D', 'eventos@universidad.edu', 'B', 2, '2024-03-20', '2024-04-19', 7800.00, 1638.00, 9438.00, 'draft', 'Catering graduación 200 personas');

  -- Insertar líneas de factura para facturas emitidas
  INSERT INTO public.invoice_lines (invoice_id, invoice_type, line_number, description, quantity, unit_price, discount_percentage, discount_amount, subtotal, tax_rate, tax_amount, total, account_code)
  SELECT 
    ii.id,
    'issued',
    1,
    'Servicios de catering',
    1,
    ii.subtotal,
    0,
    0,
    ii.subtotal,
    CASE WHEN ii.full_invoice_number LIKE 'A-000007' THEN 10 ELSE 21 END,
    ii.tax_total,
    ii.total,
    '705000'
  FROM invoices_issued ii
  WHERE ii.centro_code = v_centro_code;

END $$;