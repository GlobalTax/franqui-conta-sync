-- Fase 4: Añadir columnas para tracking de templates en invoices_received

-- Añadir columnas para tracking de supplier y template usado
ALTER TABLE invoices_received 
ADD COLUMN IF NOT EXISTS supplier_vat_id TEXT,
ADD COLUMN IF NOT EXISTS ocr_template_id UUID REFERENCES supplier_ocr_templates(id),
ADD COLUMN IF NOT EXISTS ocr_template_name TEXT,
ADD COLUMN IF NOT EXISTS ocr_engine_used TEXT CHECK (ocr_engine_used IN ('openai', 'template', 'manual'));

-- Índices para búsqueda eficiente
CREATE INDEX IF NOT EXISTS idx_invoices_received_supplier_vat ON invoices_received(supplier_vat_id);
CREATE INDEX IF NOT EXISTS idx_invoices_received_template ON invoices_received(ocr_template_id);
CREATE INDEX IF NOT EXISTS idx_invoices_received_engine ON invoices_received(ocr_engine_used);

-- Comentarios de documentación
COMMENT ON COLUMN invoices_received.supplier_vat_id IS 'CIF/NIF del proveedor emisor de la factura';
COMMENT ON COLUMN invoices_received.ocr_template_id IS 'ID del template OCR usado para extraer datos (si aplica)';
COMMENT ON COLUMN invoices_received.ocr_template_name IS 'Nombre del template usado para referencia rápida';
COMMENT ON COLUMN invoices_received.ocr_engine_used IS 'Motor OCR usado: openai, template, o manual';