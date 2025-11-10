-- ============================================================================
-- AP LEARNING CORRECTIONS - Sistema de Aprendizaje del Motor AP
-- Threshold híbrido: Auto-aprueba si confidence >= 85%, revisión manual < 85%
-- ============================================================================

-- Tabla para registrar correcciones manuales que el sistema aprende
CREATE TABLE IF NOT EXISTS public.ap_learning_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referencias
  invoice_id UUID REFERENCES public.invoices_received(id) ON DELETE CASCADE,
  invoice_line_id UUID REFERENCES public.invoice_lines(id) ON DELETE CASCADE,
  supplier_id UUID,
  
  -- Datos de la corrección
  line_description TEXT NOT NULL,
  line_amount NUMERIC(12,2) NOT NULL,
  
  -- Cuenta sugerida vs corregida
  suggested_account TEXT NOT NULL,
  corrected_account TEXT NOT NULL,
  suggested_rule_id UUID REFERENCES public.ap_mapping_rules(id),
  suggested_confidence INTEGER,
  
  -- Contexto extraído
  extracted_keywords TEXT[], -- Keywords relevantes de la descripción
  supplier_name TEXT,
  supplier_tax_id TEXT,
  centro_code TEXT,
  
  -- Regla generada automáticamente
  generated_rule_id UUID REFERENCES public.ap_mapping_rules(id),
  rule_status TEXT DEFAULT 'pending' CHECK (rule_status IN ('pending', 'approved', 'rejected', 'manual')),
  
  -- Control
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  review_notes TEXT
);

-- Índices
CREATE INDEX idx_ap_learning_invoice ON public.ap_learning_corrections(invoice_id);
CREATE INDEX idx_ap_learning_supplier ON public.ap_learning_corrections(supplier_id);
CREATE INDEX idx_ap_learning_status ON public.ap_learning_corrections(rule_status);
CREATE INDEX idx_ap_learning_created ON public.ap_learning_corrections(created_at DESC);

-- RLS
ALTER TABLE public.ap_learning_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view learning corrections"
  ON public.ap_learning_corrections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert learning corrections"
  ON public.ap_learning_corrections FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can manage learning corrections"
  ON public.ap_learning_corrections FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

COMMENT ON TABLE public.ap_learning_corrections IS 'Correcciones manuales del usuario para aprendizaje automático del motor AP (threshold 85%)';