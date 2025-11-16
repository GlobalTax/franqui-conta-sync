import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { buildInvoicePath } from '@/lib/storage-utils';
import { convertPdfToPngClient } from '@/lib/pdf-converter';

export interface UploadFileItem {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'processed' | 'needs_review' | 'error';
  progress: number;
  invoiceId?: string;
  documentPath?: string;
  ocrStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  ocrConfidence?: number;
  ocrEngine?: string;
  ocrCostEur?: number;
  processingTimeMs?: number;
  error?: string;
  uploadedAt?: Date;
  processedAt?: Date;
}

export interface BulkUploadStats {
  total: number;
  pending: number;
  uploading: number;
  processing: number;
  completed: number;
  needsReview: number;
  errors: number;
  totalCostEur: number;
  avgProcessingTimeMs: number;
  mindeeFallbackCount: number;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ['pdf'];

export const useBulkInvoiceUpload = (centroCode: string) => {
  const [files, setFiles] = useState<UploadFileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Calculate stats with real OCR data
  const completedFiles = files.filter(f => f.status === 'processed' || f.status === 'needs_review');
  const totalCost = completedFiles.reduce((sum, f) => sum + (f.ocrCostEur || 0), 0);
  const totalTime = completedFiles.reduce((sum, f) => sum + (f.processingTimeMs || 0), 0);
  const mindeeFallbacks = completedFiles.filter(f => f.ocrEngine === 'mindee').length;
  
  const stats: BulkUploadStats = {
    total: files.length,
    pending: files.filter(f => f.status === 'pending').length,
    uploading: files.filter(f => f.status === 'uploading').length,
    processing: files.filter(f => f.status === 'processing').length,
    completed: files.filter(f => f.status === 'processed').length,
    needsReview: files.filter(f => f.status === 'needs_review').length,
    errors: files.filter(f => f.status === 'error').length,
    totalCostEur: totalCost,
    avgProcessingTimeMs: completedFiles.length > 0 ? Math.round(totalTime / completedFiles.length) : 0,
    mindeeFallbackCount: mindeeFallbacks,
  };

  // Validate file
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
      return { valid: false, error: 'Solo se permiten archivos PDF' };
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: `El archivo supera los 10MB (${(file.size / 1024 / 1024).toFixed(2)}MB)` };
    }
    
    return { valid: true };
  };

  // Add files to queue
  const addFiles = useCallback((newFiles: File[]) => {
    // Check total file limit
    const remainingSlots = 50 - files.length;
    if (remainingSlots <= 0) {
      toast.error('Límite de 50 archivos alcanzado. Procese o elimine archivos antes de añadir más.');
      return;
    }
    
    const filesToAdd = newFiles.slice(0, remainingSlots);
    if (newFiles.length > remainingSlots) {
      toast.warning(`Solo se añadieron ${remainingSlots} archivos (límite: 50 total)`);
    }
    
    const validatedFiles: UploadFileItem[] = [];
    
    for (const file of filesToAdd) {
      const validation = validateFile(file);
      
      if (!validation.valid) {
        toast.error(`${file.name}: ${validation.error}`);
        continue;
      }
      
      validatedFiles.push({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        status: 'pending',
        progress: 0,
      });
    }
    
    setFiles(prev => [...prev, ...validatedFiles]);
    
    if (validatedFiles.length > 0) {
      toast.success(`${validatedFiles.length} archivo(s) añadido(s) a la cola`);
    }
  }, [files.length]);

  // Remove file from queue
  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  // Clear all files
  const clearAll = useCallback(() => {
    setFiles([]);
  }, []);

  // Calculate SHA-256 hash
  const calculateHash = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Upload single file
  const uploadFile = async (fileItem: UploadFileItem): Promise<void> => {
    try {
      // Update status to uploading
      setFiles(prev => prev.map(f => 
        f.id === fileItem.id ? { ...f, status: 'uploading', progress: 10 } : f
      ));

      // Calculate hash for deduplication
      const fileHash = await calculateHash(fileItem.file);

      // Check for duplicates using direct query
      const { data: duplicates } = await supabase
        .from('invoices_received')
        .select('id, invoice_number, invoice_date')
        .eq('document_hash', fileHash)
        .eq('centro_code', centroCode)
        .limit(1);
      
      if (duplicates && duplicates.length > 0) {
        const dup = duplicates[0];
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id 
            ? { 
                ...f, 
                status: 'error', 
                error: `Archivo duplicado: Factura ${dup.invoice_number || ''} del ${dup.invoice_date || ''}`,
                progress: 100 
              } 
            : f
        ));
        return;
      }

      // Upload to storage using standardized path structure
      const path = buildInvoicePath({
        invoiceType: 'received',
        centroCode: centroCode,
        originalName: fileItem.file.name,
        date: new Date()
      });

      setFiles(prev => prev.map(f => 
        f.id === fileItem.id ? { ...f, progress: 30 } : f
      ));

      const { error: uploadError } = await supabase.storage
        .from('invoice-documents')
        .upload(path, fileItem.file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setFiles(prev => prev.map(f => 
        f.id === fileItem.id ? { ...f, progress: 50, documentPath: path } : f
      ));

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Create invoice record with all required fields
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices_received')
        .insert({
          centro_code: centroCode,
          invoice_number: `PENDING-${Date.now()}`, // Temporary until OCR completes
          invoice_date: new Date().toISOString().split('T')[0],
          total: 0, // Will be updated by OCR
          status: 'pending', // Estados: pending | processing | processed_ok | needs_review | error
          file_name: fileItem.file.name,
          file_path: path,
          document_path: path, // Keep both for compatibility
          document_hash: fileHash,
          ocr_engine: null, // Will be set by OCR orchestrator
          uploaded_by: user?.id,
          uploaded_at: new Date().toISOString(),
          approval_status: 'pending',
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      setFiles(prev => prev.map(f => 
        f.id === fileItem.id 
          ? { 
              ...f, 
              progress: 60, 
              invoiceId: invoice.id,
              uploadedAt: new Date(),
              status: 'processing',
              ocrStatus: 'pending'
            } 
          : f
      ));

      // 4. CALL MINDEE OCR (reemplaza invoice-ocr legacy)
      console.log('[BulkUpload] Invocando Mindee OCR...');
      
      const { data: ocrResult, error: ocrError } = await supabase.functions.invoke('mindee-invoice-ocr', {
        body: {
          invoice_id: invoice.id,
          documentPath: path,
          centroCode: centroCode,
        }
      });

      if (ocrError) throw ocrError;

      setFiles(prev => prev.map(f => 
        f.id === fileItem.id ? { ...f, progress: 80, ocrStatus: 'processing' } : f
      ));

      // 5. PROCESS MINDEE RESULT
      console.log('[BulkUpload] Procesando resultado Mindee...');
      
      if (!ocrResult?.success) {
        throw new Error(ocrResult?.error || 'Error en procesamiento Mindee');
      }

      console.log('[BulkUpload] ✓ OCR completado:', {
        mindeeDocId: ocrResult.mindee_document_id,
        confidence: ocrResult.mindee_confidence,
        cost: ocrResult.mindee_cost_euros,
        engine: ocrResult.ocr_engine,
        fallbackUsed: ocrResult.ocr_fallback_used,
        needsReview: ocrResult.needs_manual_review,
      });

      // Update UI status
      const uiStatus = ocrResult.needs_manual_review ? 'needs_review' : 'processed';

      setFiles(prev => prev.map(f => 
        f.id === fileItem.id 
          ? { 
              ...f, 
              progress: 100,
              status: uiStatus,
              ocrStatus: 'completed',
              ocrConfidence: ocrResult.mindee_confidence,
              ocrEngine: ocrResult.ocr_engine,
              ocrCostEur: ocrResult.mindee_cost_euros,
              processingTimeMs: ocrResult.mindee_processing_time ? ocrResult.mindee_processing_time * 1000 : undefined,
              processedAt: new Date(),
            } 
          : f
      ));

    } catch (error: any) {
      console.error('Error uploading file:', error);
      setFiles(prev => prev.map(f => 
        f.id === fileItem.id 
          ? { 
              ...f, 
              status: 'error', 
              error: error.message || 'Error desconocido',
              progress: 100
            } 
          : f
      ));
    }
  };

  // Clear completed files
  const clearCompleted = useCallback(() => {
    setFiles(prev => prev.filter(f => f.status !== 'processed'));
    toast.success('Archivos completados eliminados');
  }, []);

  // Clear error files
  const clearErrors = useCallback(() => {
    setFiles(prev => prev.filter(f => f.status !== 'error'));
    toast.success('Archivos con error eliminados');
  }, []);

  // Process all files
  const processAll = useCallback(async () => {
    setIsProcessing(true);
    
    const pendingFiles = files.filter(f => f.status === 'pending');
    
    if (pendingFiles.length === 0) {
      toast.info('No hay archivos pendientes de procesar');
      setIsProcessing(false);
      return;
    }

    toast.info(`🚀 Iniciando procesamiento de ${pendingFiles.length} archivo(s)...`);

    // Process files in batches of 3
    const BATCH_SIZE = 3;
    for (let i = 0; i < pendingFiles.length; i += BATCH_SIZE) {
      const batch = pendingFiles.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(file => uploadFile(file)));
      
      // Progress toast
      const processed = Math.min(i + BATCH_SIZE, pendingFiles.length);
      if (processed < pendingFiles.length) {
        toast.loading(`Procesados ${processed}/${pendingFiles.length} archivos...`);
      }
    }

    setIsProcessing(false);
    
    // Final summary toast
    const finalStats = {
      completed: files.filter(f => f.status === 'processed').length,
      needsReview: files.filter(f => f.status === 'needs_review').length,
      errors: files.filter(f => f.status === 'error').length,
    };
    
    if (finalStats.errors === 0) {
      toast.success(`✅ ¡Lote completado! ${finalStats.completed} procesados, ${finalStats.needsReview} requieren revisión`);
    } else {
      toast.warning(`⚠️ Lote completado con ${finalStats.errors} errores. ${finalStats.completed} procesados correctamente.`);
    }
  }, [files, uploadFile]);

  return {
    files,
    stats,
    isProcessing,
    addFiles,
    removeFile,
    clearAll,
    clearCompleted,
    clearErrors,
    processAll,
  };
};
