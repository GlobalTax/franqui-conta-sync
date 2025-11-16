/**
 * Hook for uploading invoices with Mindee OCR processing
 * 
 * Features:
 * - File upload to Supabase Storage
 * - SHA-256 hash calculation for deduplication
 * - Automatic OCR processing via Mindee
 * - Progress tracking and error handling
 * - Integration with workflow (normalize + AP mapping + GL entry)
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { buildInvoicePath } from '@/lib/storage-utils';
import { autoDetectCentro } from '@/lib/centro-detection';

interface UploadParams {
  file: File;
  centroCode: string;
  companyId?: string;
  supplierId?: string;
  supplierHint?: string | null;
  autoDetectCentro?: boolean;
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
    const { file, centroCode, supplierId, supplierHint = null, autoDetectCentro: shouldAutoDetect = false } = params;

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
          // Valores por defecto para evitar errores de campos no nullables
          invoice_number: `PENDING-${Date.now()}`,
          invoice_date: new Date().toISOString().split('T')[0],
          subtotal: 0,
          tax_total: 0,
          total: 0,
        })
        .select()
        .single();

      if (insertError) {
        console.error('[useInvoiceUpload] Insert error:', insertError);
        throw new Error(`Error al crear registro: ${insertError.message}`);
      }

      if (!invoice) {
        throw new Error('No se pudo crear el registro de la factura');
      }

      setProgress(70);

      // 6. Procesar con Mindee OCR (nativo de PDFs)
      console.log('[useInvoiceUpload] Iniciando Mindee OCR...');
      
      const { data: ocrData, error: ocrError } = await supabase.functions.invoke('mindee-invoice-ocr', {
        body: {
          invoice_id: invoice.id,
          documentPath: filePath,
          centroCode: centroCode
        }
      });

      setProgress(90);

      if (ocrError) {
        console.error('[useInvoiceUpload] Mindee OCR error:', ocrError);
        
        // Actualizar estado como error pero no fallar completamente
        await supabase
          .from('invoices_received')
          .update({ 
            status: 'ocr_error',
            approval_status: 'ocr_error'
          })
          .eq('id', invoice.id);

        toast.warning('Factura subida pero OCR falló', {
          description: 'Puedes reprocesar la factura desde el detalle'
        });

        return {
          id: invoice.id,
          file_path: filePath,
          status: 'ocr_error'
        };
      }

      setProgress(100);

      const mindeeConfidence = ocrData?.mindee_metadata?.confidence || 0;
      const fallbackUsed = ocrData?.mindee_metadata?.fallback_used || false;

      if (fallbackUsed) {
        toast.warning('Factura procesada con parsers de respaldo', {
          description: `Confianza: ${Math.round(mindeeConfidence)}% - Se recomienda revisión manual`
        });
      } else if (mindeeConfidence < 70) {
        toast.warning('Factura procesada con confianza baja', {
          description: `Confianza: ${Math.round(mindeeConfidence)}% - Revisar datos extraídos`
        });
      } else {
        toast.success('Factura procesada correctamente', {
          description: `Confianza: ${Math.round(mindeeConfidence)}%`
        });
      }

      return {
        id: invoice.id,
        file_path: filePath,
        status: 'processed'
      };

    } catch (error) {
      console.error('[useInvoiceUpload] Error:', error);
      throw error;
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  return {
    uploadInvoice,
    isUploading,
    progress,
  };
};
