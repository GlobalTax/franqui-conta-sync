-- ============================================================================
-- MIGRATION: Crear tabla pl_manual_adjustments para ajustes manuales de P&L
-- ============================================================================

-- Tabla para ajustes manuales de P&L
CREATE TABLE IF NOT EXISTS pl_manual_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  centro_code TEXT NOT NULL REFERENCES centres(codigo) ON DELETE CASCADE,
  template_code TEXT NOT NULL,
  rubric_code TEXT NOT NULL,
  period_date DATE NOT NULL,
  adjustment_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint único: un ajuste por rubro/periodo/centro/plantilla
  CONSTRAINT unique_pl_adjustment UNIQUE (company_id, centro_code, template_code, rubric_code, period_date)
);

-- Índices para optimizar queries
CREATE INDEX IF NOT EXISTS idx_pl_adjustments_company ON pl_manual_adjustments(company_id);
CREATE INDEX IF NOT EXISTS idx_pl_adjustments_centro ON pl_manual_adjustments(centro_code);
CREATE INDEX IF NOT EXISTS idx_pl_adjustments_template ON pl_manual_adjustments(template_code);
CREATE INDEX IF NOT EXISTS idx_pl_adjustments_period ON pl_manual_adjustments(period_date);

-- RLS Policies (Row Level Security)
ALTER TABLE pl_manual_adjustments ENABLE ROW LEVEL SECURITY;

-- Policy: Los usuarios solo pueden ver ajustes de sus centros accesibles
CREATE POLICY "Users can view adjustments for their accessible centres"
  ON pl_manual_adjustments
  FOR SELECT
  USING (
    centro_code IN (
      SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
    )
  );

-- Policy: Los usuarios pueden insertar ajustes en sus centros
CREATE POLICY "Users can insert adjustments in their centres"
  ON pl_manual_adjustments
  FOR INSERT
  WITH CHECK (
    centro_code IN (
      SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
    )
  );

-- Policy: Los usuarios pueden actualizar ajustes en sus centros
CREATE POLICY "Users can update adjustments in their centres"
  ON pl_manual_adjustments
  FOR UPDATE
  USING (
    centro_code IN (
      SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
    )
  );

-- Policy: Solo admins pueden eliminar ajustes
CREATE POLICY "Only admins can delete adjustments"
  ON pl_manual_adjustments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_pl_adjustments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pl_adjustments_updated_at
  BEFORE UPDATE ON pl_manual_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION update_pl_adjustments_updated_at();

-- Comentarios
COMMENT ON TABLE pl_manual_adjustments IS 
  'Ajustes manuales a las cifras calculadas automáticamente en P&L';
COMMENT ON COLUMN pl_manual_adjustments.adjustment_amount IS 
  'Cantidad a sumar al importe calculado (puede ser negativa)';
COMMENT ON COLUMN pl_manual_adjustments.period_date IS 
  'Fecha del primer día del mes (YYYY-MM-01)';