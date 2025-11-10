import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UploadFileItem {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'processed' | 'needs_review' | 'error';
  progress: number;
  invoiceId?: string;
  documentPath?: string;
  ocrStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  ocrConfidence?: number;
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

  // Calculate stats
  const stats: BulkUploadStats = {
    total: files.length,
    pending: files.filter(f => f.status === 'pending').length,
    uploading: files.filter(f => f.status === 'uploading').length,
    processing: files.filter(f => f.status === 'processing').length,
    completed: files.filter(f => f.status === 'processed').length,
    needsReview: files.filter(f => f.status === 'needs_review').length,
    errors: files.filter(f => f.status === 'error').length,
    totalCostEur: 0,
    avgProcessingTimeMs: 0,
    mindeeFallbackCount: 0,
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
    const validatedFiles: UploadFileItem[] = [];
    
    for (const file of newFiles) {
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
  }, []);

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

      // TODO: Check for duplicates (commented out due to TS type inference issue)
      // We can add this back with a different approach or RPC call
      /*
      const existingCheck = await supabase
        .from('invoices_received')
        .select('id')
        .eq('document_hash', fileHash)
        .eq('centro_code', centroCode)
        .maybeSingle();

      if (existingCheck.data) {
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id 
            ? { 
                ...f, 
                status: 'error', 
                error: 'Archivo duplicado (ya procesado anteriormente)',
                progress: 100 
              } 
            : f
        ));
        return;
      }
      */

      // Upload to storage
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const fileName = `${fileHash.substring(0, 8)}_${Date.now()}.pdf`;
      const path = `received/${centroCode}/${year}/${month}/${fileName}`;

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

      // Create invoice record
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices_received')
        .insert({
          centro_code: centroCode,
          invoice_number: `PENDING-${Date.now()}`, // Temporary
          invoice_date: new Date().toISOString().split('T')[0],
          total: 0, // Will be updated by OCR
          status: 'pending',
          document_path: path,
          document_hash: fileHash,
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

      // Trigger OCR processing
      const { data: ocrResult, error: ocrError } = await supabase.functions.invoke('invoice-ocr', {
        body: { 
          documentPath: path, 
          centroCode,
          invoiceId: invoice.id 
        }
      });

      if (ocrError) throw ocrError;

      setFiles(prev => prev.map(f => 
        f.id === fileItem.id ? { ...f, progress: 80, ocrStatus: 'processing' } : f
      ));

      // Update invoice with OCR results
      const ocrData = ocrResult.data || ocrResult.normalized;
      const finalStatus = ocrResult.status || 'needs_review';

      const { error: updateError } = await supabase
        .from('invoices_received')
        .update({
          invoice_number: ocrData.invoice_number || `PENDING-${Date.now()}`,
          invoice_date: ocrData.issue_date || new Date().toISOString().split('T')[0],
          due_date: ocrData.due_date,
          subtotal: ocrData.totals?.total ? ocrData.totals.total / (1 + (ocrData.totals?.vat_21 || 0) / 100) : 0,
          tax_total: ocrData.totals?.vat_21 || ocrData.totals?.vat_10 || 0,
          total: ocrData.totals?.total || 0,
          status: finalStatus,
          ocr_confidence: ocrResult.confidence || 0,
          ocr_engine: ocrResult.ocr_engine,
          ocr_processing_time_ms: ocrResult.processingTimeMs,
          ocr_confidence_notes: ocrResult.validation?.warnings || [],
          ocr_merge_notes: ocrResult.merge_notes || [],
          ocr_extracted_data: ocrData,
        })
        .eq('id', invoice.id);

      if (updateError) throw updateError;

      // Final status
      const uiStatus = finalStatus === 'processed_ok' ? 'processed' : 'needs_review';

      setFiles(prev => prev.map(f => 
        f.id === fileItem.id 
          ? { 
              ...f, 
              progress: 100, 
              status: uiStatus,
              ocrStatus: 'completed',
              ocrConfidence: ocrResult.confidence,
              processedAt: new Date()
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

  // Process all files
  const processAll = useCallback(async () => {
    setIsProcessing(true);
    
    const pendingFiles = files.filter(f => f.status === 'pending');
    
    if (pendingFiles.length === 0) {
      toast.info('No hay archivos pendientes de procesar');
      setIsProcessing(false);
      return;
    }

    toast.info(`Procesando ${pendingFiles.length} archivo(s)...`);

    // Process files in batches of 3
    const BATCH_SIZE = 3;
    for (let i = 0; i < pendingFiles.length; i += BATCH_SIZE) {
      const batch = pendingFiles.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(file => uploadFile(file)));
    }

    setIsProcessing(false);
    toast.success('Proceso de carga completado');
  }, [files, uploadFile]);

  return {
    files,
    stats,
    isProcessing,
    addFiles,
    removeFile,
    clearAll,
    processAll,
  };
};
