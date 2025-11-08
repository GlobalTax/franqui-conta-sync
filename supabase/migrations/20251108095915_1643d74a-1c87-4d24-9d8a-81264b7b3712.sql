-- Create entry_templates table for predefined accounting entry templates
CREATE TABLE IF NOT EXISTS entry_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  centro_code TEXT,
  category TEXT DEFAULT 'general',
  is_system BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create entry_template_lines table for template line items
CREATE TABLE IF NOT EXISTS entry_template_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES entry_templates(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  account_code TEXT NOT NULL,
  movement_type movement_type NOT NULL,
  amount_formula TEXT, -- e.g., "base", "base*0.21", "total"
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE entry_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_template_lines ENABLE ROW LEVEL SECURITY;

-- RLS Policies for entry_templates
CREATE POLICY "Admins can manage all entry templates"
  ON entry_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view templates for accessible centres"
  ON entry_templates FOR SELECT
  USING (
    centro_code IS NULL 
    OR centro_code IN (
      SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create templates for accessible centres"
  ON entry_templates FOR INSERT
  WITH CHECK (
    centro_code IN (
      SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own templates"
  ON entry_templates FOR UPDATE
  USING (created_by = auth.uid() AND NOT is_system);

CREATE POLICY "Users can delete their own templates"
  ON entry_templates FOR DELETE
  USING (created_by = auth.uid() AND NOT is_system);

-- RLS Policies for entry_template_lines
CREATE POLICY "Admins can manage all template lines"
  ON entry_template_lines FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view template lines for accessible templates"
  ON entry_template_lines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM entry_templates et
      WHERE et.id = entry_template_lines.template_id
      AND (
        et.centro_code IS NULL 
        OR et.centro_code IN (
          SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can manage lines for their templates"
  ON entry_template_lines FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM entry_templates et
      WHERE et.id = entry_template_lines.template_id
      AND et.created_by = auth.uid()
      AND NOT et.is_system
    )
  );

-- Create index for performance
CREATE INDEX idx_entry_templates_centro ON entry_templates(centro_code);
CREATE INDEX idx_entry_template_lines_template ON entry_template_lines(template_id);

-- Insert system templates
INSERT INTO entry_templates (name, description, category, is_system) VALUES
  ('Factura de Compra con IVA 21%', 'Plantilla para registrar facturas de compra con IVA del 21%', 'compras', true),
  ('Factura de Venta con IVA 21%', 'Plantilla para registrar facturas de venta con IVA del 21%', 'ventas', true),
  ('Pago a Proveedor', 'Plantilla para registrar pagos a proveedores', 'tesoreria', true),
  ('Cobro de Cliente', 'Plantilla para registrar cobros de clientes', 'tesoreria', true),
  ('Nómina', 'Plantilla para registrar el pago de nóminas', 'personal', true);

-- Insert template lines for "Factura de Compra con IVA 21%"
INSERT INTO entry_template_lines (template_id, line_number, account_code, movement_type, amount_formula, description)
SELECT id, 1, '600', 'debit', 'base', 'Compras de mercaderías'
FROM entry_templates WHERE name = 'Factura de Compra con IVA 21%';

INSERT INTO entry_template_lines (template_id, line_number, account_code, movement_type, amount_formula, description)
SELECT id, 2, '472', 'debit', 'base*0.21', 'IVA Soportado'
FROM entry_templates WHERE name = 'Factura de Compra con IVA 21%';

INSERT INTO entry_template_lines (template_id, line_number, account_code, movement_type, amount_formula, description)
SELECT id, 3, '400', 'credit', 'total', 'Proveedores'
FROM entry_templates WHERE name = 'Factura de Compra con IVA 21%';

-- Insert template lines for "Factura de Venta con IVA 21%"
INSERT INTO entry_template_lines (template_id, line_number, account_code, movement_type, amount_formula, description)
SELECT id, 1, '430', 'debit', 'total', 'Clientes'
FROM entry_templates WHERE name = 'Factura de Venta con IVA 21%';

INSERT INTO entry_template_lines (template_id, line_number, account_code, movement_type, amount_formula, description)
SELECT id, 2, '700', 'credit', 'base', 'Ventas de mercaderías'
FROM entry_templates WHERE name = 'Factura de Venta con IVA 21%';

INSERT INTO entry_template_lines (template_id, line_number, account_code, movement_type, amount_formula, description)
SELECT id, 3, '477', 'credit', 'base*0.21', 'IVA Repercutido'
FROM entry_templates WHERE name = 'Factura de Venta con IVA 21%';

-- Insert template lines for "Pago a Proveedor"
INSERT INTO entry_template_lines (template_id, line_number, account_code, movement_type, amount_formula, description)
SELECT id, 1, '400', 'debit', 'total', 'Proveedores'
FROM entry_templates WHERE name = 'Pago a Proveedor';

INSERT INTO entry_template_lines (template_id, line_number, account_code, movement_type, amount_formula, description)
SELECT id, 2, '572', 'credit', 'total', 'Bancos c/c'
FROM entry_templates WHERE name = 'Pago a Proveedor';

-- Insert template lines for "Cobro de Cliente"
INSERT INTO entry_template_lines (template_id, line_number, account_code, movement_type, amount_formula, description)
SELECT id, 1, '572', 'debit', 'total', 'Bancos c/c'
FROM entry_templates WHERE name = 'Cobro de Cliente';

INSERT INTO entry_template_lines (template_id, line_number, account_code, movement_type, amount_formula, description)
SELECT id, 2, '430', 'credit', 'total', 'Clientes'
FROM entry_templates WHERE name = 'Cobro de Cliente';

-- Insert template lines for "Nómina"
INSERT INTO entry_template_lines (template_id, line_number, account_code, movement_type, amount_formula, description)
SELECT id, 1, '640', 'debit', 'base', 'Sueldos y salarios'
FROM entry_templates WHERE name = 'Nómina';

INSERT INTO entry_template_lines (template_id, line_number, account_code, movement_type, amount_formula, description)
SELECT id, 2, '642', 'debit', 'base*0.32', 'Seguridad Social a cargo de la empresa'
FROM entry_templates WHERE name = 'Nómina';

INSERT INTO entry_template_lines (template_id, line_number, account_code, movement_type, amount_formula, description)
SELECT id, 3, '476', 'credit', 'base*0.065', 'Organismos de la Seguridad Social, acreedores'
FROM entry_templates WHERE name = 'Nómina';

INSERT INTO entry_template_lines (template_id, line_number, account_code, movement_type, amount_formula, description)
SELECT id, 4, '4751', 'credit', 'base*0.15', 'Hacienda Pública, acreedora por retenciones'
FROM entry_templates WHERE name = 'Nómina';

INSERT INTO entry_template_lines (template_id, line_number, account_code, movement_type, amount_formula, description)
SELECT id, 5, '465', 'credit', 'base*1.105', 'Remuneraciones pendientes de pago'
FROM entry_templates WHERE name = 'Nómina';

-- Create trigger for updated_at
CREATE TRIGGER update_entry_templates_updated_at
  BEFORE UPDATE ON entry_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();