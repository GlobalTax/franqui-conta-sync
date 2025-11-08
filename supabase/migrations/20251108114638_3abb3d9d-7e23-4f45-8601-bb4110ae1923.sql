-- Create OCR processing log table for auditing and continuous improvement
CREATE TABLE IF NOT EXISTS public.ocr_processing_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.invoices_received(id) ON DELETE SET NULL,
  document_path TEXT NOT NULL,
  ocr_provider TEXT NOT NULL DEFAULT 'google-vision',
  raw_response JSONB,
  extracted_data JSONB,
  confidence NUMERIC CHECK (confidence >= 0 AND confidence <= 1),
  processing_time_ms INTEGER,
  user_corrections JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.ocr_processing_log ENABLE ROW LEVEL SECURITY;

-- Users can view OCR logs for their own invoices
CREATE POLICY "Users can view their OCR logs"
ON public.ocr_processing_log
FOR SELECT
USING (
  created_by = auth.uid()
);

-- Users can insert OCR logs
CREATE POLICY "Users can create OCR logs"
ON public.ocr_processing_log
FOR INSERT
WITH CHECK (
  created_by = auth.uid()
);

-- Create index for performance
CREATE INDEX idx_ocr_log_invoice_id ON public.ocr_processing_log(invoice_id);
CREATE INDEX idx_ocr_log_created_at ON public.ocr_processing_log(created_at DESC);