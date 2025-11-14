-- ============================================================================
-- SUPPLIER OCR TEMPLATES (Fixed)
-- Sistema de templates configurables para extracción OCR por proveedor
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.supplier_ocr_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  document_type TEXT DEFAULT 'invoice' CHECK (document_type IN ('invoice', 'ticket', 'credit_note')),
  
  -- Configuración visual de campos (coordenadas, regex, tipo, etc.)
  field_mappings JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Estrategia de extracción
  extraction_strategy TEXT DEFAULT 'coordinates' CHECK (extraction_strategy IN ('coordinates', 'regex', 'ocr_fallback')),
  
  -- Preferencias
  preferred_ocr_engine TEXT DEFAULT 'template' CHECK (preferred_ocr_engine IN ('template', 'openai', 'mindee')),
  confidence_threshold NUMERIC DEFAULT 0.8 CHECK (confidence_threshold >= 0 AND confidence_threshold <= 1),
  
  -- Estadísticas de uso
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  avg_confidence NUMERIC,
  
  -- Metadatos
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para búsqueda eficiente
CREATE INDEX idx_supplier_templates_supplier ON public.supplier_ocr_templates(supplier_id, is_active);
CREATE INDEX idx_supplier_templates_active ON public.supplier_ocr_templates(is_active) WHERE is_active = true;

-- Trigger para updated_at
CREATE TRIGGER update_supplier_ocr_templates_updated_at
  BEFORE UPDATE ON public.supplier_ocr_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- RLS Policies (simplificadas - los suppliers son globales)
ALTER TABLE public.supplier_ocr_templates ENABLE ROW LEVEL SECURITY;

-- Usuarios autenticados pueden ver templates
CREATE POLICY "Authenticated users can view templates"
  ON public.supplier_ocr_templates
  FOR SELECT
  TO authenticated
  USING (true);

-- Usuarios autenticados pueden crear templates
CREATE POLICY "Authenticated users can create templates"
  ON public.supplier_ocr_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Usuarios pueden actualizar templates
CREATE POLICY "Authenticated users can update templates"
  ON public.supplier_ocr_templates
  FOR UPDATE
  TO authenticated
  USING (true);

-- Usuarios pueden desactivar templates
CREATE POLICY "Authenticated users can delete templates"
  ON public.supplier_ocr_templates
  FOR DELETE
  TO authenticated
  USING (true);

-- Comentarios
COMMENT ON TABLE public.supplier_ocr_templates IS 'Templates configurables para extracción OCR por proveedor';
COMMENT ON COLUMN public.supplier_ocr_templates.field_mappings IS 'Configuración de campos: { "invoice_number": { "x": 100, "y": 50, "width": 200, "height": 30, "page": 1, "regex": "\\d+", "required": true, "type": "text" } }';
COMMENT ON COLUMN public.supplier_ocr_templates.extraction_strategy IS 'Estrategia de extracción: coordinates (coordenadas fijas), regex (patrones), ocr_fallback (fallback a OpenAI)';
COMMENT ON COLUMN public.supplier_ocr_templates.preferred_ocr_engine IS 'Motor OCR preferido: template (extracción por template), openai, mindee';