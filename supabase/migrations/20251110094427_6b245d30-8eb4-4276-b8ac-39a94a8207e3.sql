-- ============================================================
-- STORAGE: Bucket para importación de archivos de diario
-- ============================================================

-- Crear bucket (si no existe)
INSERT INTO storage.buckets (id, name, public)
VALUES ('journal-imports', 'journal-imports', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies para el bucket

-- Policy 1: Usuarios autenticados pueden subir archivos
CREATE POLICY "Authenticated users can upload journal files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'journal-imports');

-- Policy 2: Usuarios pueden leer sus propios archivos
CREATE POLICY "Users can read their own journal files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'journal-imports' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Usuarios pueden eliminar sus propios archivos
CREATE POLICY "Users can delete their own journal files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'journal-imports' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Service role puede leer todos los archivos
CREATE POLICY "Service role can read journal files"
ON storage.objects
FOR SELECT
TO service_role
USING (bucket_id = 'journal-imports');