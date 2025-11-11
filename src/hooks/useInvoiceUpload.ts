/**
 * Hook for uploading invoices with OCR processing
 * 
 * Features:
 * - File upload to Supabase Storage
 * - SHA-256 hash calculation for deduplication
 * - Automatic OCR processing via existing edge function
 * - Progress tracking and error handling
 * - Integration with workflow (normalize + AP mapping + GL entry)
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { buildInvoicePath } from '@/lib/storage-utils';

interface UploadParams {
  file: File;
  centroCode: string;
  companyId?: string;
  supplierId?: string;
}

interface UploadResult {
  id: string;
  file_path: string;
  status: string;
  isDuplicate?: boolean;
  duplicateOf?: string;
}

export const useInvoiceUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const calculateFileHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const uploadInvoice = async (params: UploadParams): Promise<UploadResult> => {
    const { file, centroCode, supplierId } = params;

    if (!file.type.includes('pdf')) {
      throw new Error('Solo se permiten archivos PDF');
    }

    setIsUploading(true);
    setProgress(10);

    try {
      // 1. Generar path único usando helper compartido
      const filePath = buildInvoicePath({
        invoiceType: 'received',
        centroCode,
        originalName: file.name,
        date: new Date()
      });

      setProgress(20);

      // 2. Calcular hash para deduplicación
      const documentHash = await calculateFileHash(file);
      setProgress(30);

      // 3. Verificar duplicados antes de subir
      const { data: existingInvoice } = await supabase
        .from('invoices_received')
        .select('id, invoice_number, status')
        .eq('document_hash', documentHash)
        .eq('centro_code', centroCode)
        .maybeSingle();

      if (existingInvoice) {
        setIsUploading(false);
        setProgress(0);
        
        toast.warning(`Factura duplicada: ${existingInvoice.invoice_number || existingInvoice.id}`);
        
        return {
          id: existingInvoice.id,
          file_path: '',
          status: 'duplicate',
          isDuplicate: true,
          duplicateOf: existingInvoice.id
        };
      }

      setProgress(40);

      // 4. Subir PDF a storage
      const { error: uploadError } = await supabase.storage
        .from('invoice-documents')
        .upload(filePath, file, {
          contentType: 'application/pdf',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Error al subir archivo: ${uploadError.message}`);
      }

      setProgress(60);

      // 5. Insertar registro en DB con valores por defecto para campos requeridos
      const { data: invoice, error: insertError } = await supabase
        .from('invoices_received')
        .insert({
          file_name: file.name,
          file_path: filePath,
          document_hash: documentHash,
          centro_code: centroCode,
          supplier_id: supplierId || null,
          status: 'pending',
          uploaded_at: new Date().toISOString(),
          // Campos requeridos con valores por defecto (serán actualizados por OCR)
          invoice_number: 'PENDING',
          invoice_date: new Date().toISOString().split('T')[0],
          total: 0
        })
        .select('id, file_path, status')
        .single();

      if (insertError) {
        throw new Error(`Error al guardar factura: ${insertError.message}`);
      }

      setProgress(80);

      // 6. Trigger OCR processing usando el edge function existente
      // El edge function espera: { documentPath, centroCode, engine? }
      supabase.functions
        .invoke('invoice-ocr', {
          body: { 
            documentPath: filePath,
            centroCode
          }
        })
        .then(({ data, error }) => {
          if (error) {
            console.error('Error al iniciar OCR:', error);
            toast.error('Factura guardada pero OCR falló. Reintente manualmente.');
          } else if (data?.success) {
            console.log('OCR completed:', data);
            toast.success(`OCR completado: ${data.ocr_engine} (${Math.round(data.confidence * 100)}% confianza)`);
          }
        });

      setProgress(100);
      setIsUploading(false);

      toast.success('Factura subida correctamente. Procesando OCR...');

      return {
        id: invoice.id,
        file_path: invoice.file_path,
        status: invoice.status,
        isDuplicate: false
      };

    } catch (error: any) {
      setIsUploading(false);
      setProgress(0);
      toast.error(`Error: ${error.message}`);
      throw error;
    }
  };

  return {
    uploadInvoice,
    isUploading,
    progress
  };
};
