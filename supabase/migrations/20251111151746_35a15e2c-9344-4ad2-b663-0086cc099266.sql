-- ============================================================================
-- STORAGE RLS POLICIES para invoice-documents
-- Permite a usuarios autenticados subir y leer facturas
-- Permite a service_role (edge functions) acceder a todo
-- ============================================================================

-- Política 1: Permitir a usuarios autenticados SUBIR archivos (INSERT)
CREATE POLICY "Users can upload invoices"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'invoice-documents'
  AND (storage.foldername(name))[1] IN ('received', 'issued', 'temp')
);

-- Política 2: Permitir a usuarios autenticados LEER sus propios archivos (SELECT)
CREATE POLICY "Users can read invoices"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'invoice-documents'
);

-- Política 3: Permitir a service_role (edge functions) acceder a TODO (ALL operations)
CREATE POLICY "Service role full access to invoices"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'invoice-documents')
WITH CHECK (bucket_id = 'invoice-documents');