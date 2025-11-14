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
import { convertPdfToPngClient } from '@/lib/pdf-converter';
import { autoDetectCentro } from '@/lib/centro-detection';

interface UploadParams {
  file: File;
  centroCode: string;
  companyId?: string;
  supplierId?: string;
  preferredEngine?: 'openai' | 'mindee';
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
    const { file, centroCode, supplierId, preferredEngine = 'openai', supplierHint = null, autoDetectCentro: shouldAutoDetect = false } = params;

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

      // 6. Convert PDF to PNG on client side for OCR
      let imageDataUrl: string | undefined;
      try {
        console.log('[Upload] Converting PDF to PNG for OCR...');
        imageDataUrl = await convertPdfToPngClient(file);
        console.log('[Upload] ✓ PDF converted to PNG');
      } catch (conversionError) {
        console.warn('[Upload] PDF conversion failed, will try server-side:', conversionError);
        // Continue without imageDataUrl - server will attempt conversion
      }

      // 7. Get supplier VAT ID if supplier is known
      let supplierVatId: string | null = null;
      if (supplierId) {
        const { data: supplier } = await supabase
          .from('suppliers')
          .select('tax_id')
          .eq('id', supplierId)
          .maybeSingle();
        
        if (supplier?.tax_id) {
          supplierVatId = supplier.tax_id;
          console.log('[Upload] Supplier VAT ID found:', supplierVatId);
        }
      }

      // 8. Trigger OCR processing using webhook mode (async) - forzado a OpenAI
      const ocrRequestBody: any = {
        invoice_id: invoice.id,
        useWebhook: true,
        supplierHint
      };

      if (imageDataUrl) {
        ocrRequestBody.imageDataUrl = imageDataUrl;
        console.log('[Upload] Including imageDataUrl in OCR request');
      }

      if (supplierVatId) {
        ocrRequestBody.supplierVatId = supplierVatId;
        console.log('[Upload] Including supplierVatId for template detection');
      }

      const ocrResponse = await supabase.functions.invoke('invoice-ocr', {
        body: ocrRequestBody
      });

      if (ocrResponse.error) {
        console.error('Error al iniciar OCR:', ocrResponse.error);
        toast.error('Factura guardada pero OCR falló. Reintente manualmente.');
      } else if (ocrResponse.data?.status === 'processing') {
        // Webhook mode: Poll for completion
        const jobId = ocrResponse.data.job_id;
        console.log('OCR job enqueued (async)', { jobId, invoiceId: invoice.id });
        
        toast.success('Factura subida. Procesando OCR en segundo plano...');
        
        // Poll invoice status every 2 seconds
        const pollInterval = setInterval(async () => {
          const { data: updatedInvoice, error: pollError } = await supabase
            .from('invoices_received')
            .select('status, ocr_engine')
            .eq('id', invoice.id)
            .single();
          
          if (pollError) {
            console.error('Poll error:', pollError);
            clearInterval(pollInterval);
            return;
          }
          
          if (updatedInvoice?.status !== 'processing' && updatedInvoice?.status !== 'pending') {
            clearInterval(pollInterval);
            
            if (updatedInvoice.status === 'processed_ok' || updatedInvoice.status === 'approved') {
              toast.success(`✅ OCR completado: ${updatedInvoice.ocr_engine || 'openai'}`);
            } else if (updatedInvoice.status === 'needs_review') {
              toast.warning('OCR completado pero requiere revisión manual');
            } else {
              toast.error('OCR falló. Revise la factura manualmente.');
            }
          }
        }, 2000);
        
        // Stop polling after 60 seconds (fallback)
        setTimeout(() => {
          clearInterval(pollInterval);
          console.log('Polling timeout reached');
        }, 60000);
      } else if (ocrResponse.data?.success) {
        // Synchronous mode (fallback)
        console.log('OCR completed (sync):', ocrResponse.data);
        
        // Auto-detect centro if enabled
        if (shouldAutoDetect && ocrResponse.data.rawText) {
          const detection = autoDetectCentro(ocrResponse.data.rawText, ocrResponse.data.json);
          if (detection.centroCode && detection.confidence === 'high') {
            await supabase
              .from('invoices_received')
              .update({ centro_code: detection.centroCode })
              .eq('id', invoice.id);
            
            toast.success(
              `OCR completado: ${ocrResponse.data.engine} · Centro detectado: ${detection.centroCode}`
            );
          } else {
            toast.success(
              `OCR completado: ${ocrResponse.data.engine} (${Math.round(ocrResponse.data.confidence * 100)}% confianza)`
            );
          }
        } else {
          toast.success(
            `OCR completado: ${ocrResponse.data.engine} (${Math.round(ocrResponse.data.confidence * 100)}% confianza)`
          );
        }
      }

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
