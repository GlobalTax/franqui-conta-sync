import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { buildInvoicePath } from '@/lib/storage-utils';
import { logger } from '@/lib/logger';

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
  retryCount: number;
}

export type FileFilter = 'all' | 'pending' | 'processing' | 'completed' | 'needs_review' | 'error';

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
  etaMs: number | null;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['pdf'];
const MAX_RETRIES = 3;

export const useBulkInvoiceUpload = (centroCode: string) => {
  const [files, setFiles] = useState<UploadFileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [filter, setFilter] = useState<FileFilter>('all');
  const [processStartTime, setProcessStartTime] = useState<number | null>(null);

  const completedFiles = files.filter(f => f.status === 'processed' || f.status === 'needs_review');
  const totalCost = completedFiles.reduce((sum, f) => sum + (f.ocrCostEur || 0), 0);
  const totalTime = completedFiles.reduce((sum, f) => sum + (f.processingTimeMs || 0), 0);
  const avgTimeMs = completedFiles.length > 0 ? Math.round(totalTime / completedFiles.length) : 0;

  const doneCount = completedFiles.length + files.filter(f => f.status === 'error').length;
  const remainingCount = files.filter(f => ['pending', 'uploading', 'processing'].includes(f.status)).length;
  const etaMs = isProcessing && avgTimeMs > 0 && remainingCount > 0
    ? Math.round(avgTimeMs * remainingCount / 3) // batches of 3
    : null;

  const stats: BulkUploadStats = {
    total: files.length,
    pending: files.filter(f => f.status === 'pending').length,
    uploading: files.filter(f => f.status === 'uploading').length,
    processing: files.filter(f => f.status === 'processing').length,
    completed: files.filter(f => f.status === 'processed').length,
    needsReview: files.filter(f => f.status === 'needs_review').length,
    errors: files.filter(f => f.status === 'error').length,
    totalCostEur: totalCost,
    avgProcessingTimeMs: avgTimeMs,
    etaMs,
  };

  // Filtered files for display
  const filteredFiles = useMemo(() => {
    if (filter === 'all') return files;
    const statusMap: Record<FileFilter, UploadFileItem['status'][]> = {
      all: [],
      pending: ['pending'],
      processing: ['uploading', 'processing'],
      completed: ['processed'],
      needs_review: ['needs_review'],
      error: ['error'],
    };
    return files.filter(f => statusMap[filter].includes(f.status));
  }, [files, filter]);

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

  const addFiles = useCallback((newFiles: File[]) => {
    const remainingSlots = 50 - files.length;
    if (remainingSlots <= 0) {
      toast.error('Límite de 50 archivos alcanzado.');
      return;
    }
    const filesToAdd = newFiles.slice(0, remainingSlots);
    if (newFiles.length > remainingSlots) {
      toast.warning(`Solo se añadieron ${remainingSlots} archivos (límite: 50)`);
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
        retryCount: 0,
      });
    }
    setFiles(prev => [...prev, ...validatedFiles]);
    if (validatedFiles.length > 0) {
      toast.success(`${validatedFiles.length} archivo(s) añadido(s) a la cola`);
    }
  }, [files.length]);

  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const clearAll = useCallback(() => { setFiles([]); }, []);

  const calculateHash = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const uploadFile = async (fileItem: UploadFileItem): Promise<void> => {
    try {
      setFiles(prev => prev.map(f =>
        f.id === fileItem.id ? { ...f, status: 'uploading', progress: 10, error: undefined } : f
      ));

      const fileHash = await calculateHash(fileItem.file);

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
            ? { ...f, status: 'error', error: `Duplicado: Factura ${dup.invoice_number || ''} del ${dup.invoice_date || ''}`, progress: 100 }
            : f
        ));
        return;
      }

      const path = buildInvoicePath({
        invoiceType: 'received',
        centroCode,
        originalName: fileItem.file.name,
        date: new Date()
      });

      setFiles(prev => prev.map(f =>
        f.id === fileItem.id ? { ...f, progress: 30 } : f
      ));

      const { error: uploadError } = await supabase.storage
        .from('invoice-documents')
        .upload(path, fileItem.file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      setFiles(prev => prev.map(f =>
        f.id === fileItem.id ? { ...f, progress: 50, documentPath: path } : f
      ));

      const { data: { user } } = await supabase.auth.getUser();

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices_received')
        .insert({
          centro_code: centroCode,
          invoice_number: `PENDING-${Date.now()}`,
          invoice_date: new Date().toISOString().split('T')[0],
          total: 0,
          status: 'pending',
          file_name: fileItem.file.name,
          file_path: path,
          document_path: path,
          document_hash: fileHash,
          ocr_engine: null,
          uploaded_by: user?.id,
          uploaded_at: new Date().toISOString(),
          approval_status: 'pending',
        })
        .select('*')
        .single();

      if (invoiceError) throw invoiceError;
      if (!invoice?.id) throw new Error('No se recibió ID de factura');

      setFiles(prev => prev.map(f =>
        f.id === fileItem.id
          ? { ...f, progress: 60, invoiceId: invoice.id, uploadedAt: new Date(), status: 'processing', ocrStatus: 'pending' }
          : f
      ));

      const { data: ocrResult, error: ocrError } = await supabase.functions.invoke('claude-invoice-ocr', {
        body: { invoice_id: invoice.id, documentPath: path, centroCode }
      });

      if (ocrError) throw ocrError;

      setFiles(prev => prev.map(f =>
        f.id === fileItem.id ? { ...f, progress: 80, ocrStatus: 'processing' } : f
      ));

      if (!ocrResult?.success) throw new Error(ocrResult?.error || 'Error en OCR');

      const uiStatus = ocrResult.needs_manual_review ? 'needs_review' : 'processed';
      setFiles(prev => prev.map(f =>
        f.id === fileItem.id
          ? {
              ...f, progress: 100, status: uiStatus, ocrStatus: 'completed',
              ocrConfidence: ocrResult.ocr_confidence, ocrEngine: ocrResult.ocr_engine,
              ocrCostEur: ocrResult.ocr_cost_euros, processingTimeMs: ocrResult.ocr_processing_time_ms,
              processedAt: new Date(),
            }
          : f
      ));
    } catch (error: unknown) {
      logger.error('BulkUpload', 'Error uploading file:', error);
      setFiles(prev => prev.map(f =>
        f.id === fileItem.id
          ? { ...f, status: 'error', error: error instanceof Error ? error.message : 'Error desconocido', progress: 100 }
          : f
      ));
    }
  };

  const clearCompleted = useCallback(() => {
    setFiles(prev => prev.filter(f => f.status !== 'processed'));
    toast.success('Archivos completados eliminados');
  }, []);

  const clearErrors = useCallback(() => {
    setFiles(prev => prev.filter(f => f.status !== 'error'));
    toast.success('Archivos con error eliminados');
  }, []);

  // Retry a single file
  const retryFile = useCallback((fileId: string) => {
    setFiles(prev => prev.map(f =>
      f.id === fileId && f.status === 'error' && f.retryCount < MAX_RETRIES
        ? { ...f, status: 'pending', progress: 0, error: undefined, retryCount: f.retryCount + 1 }
        : f
    ));
  }, []);

  // Retry all error files
  const retryAllErrors = useCallback(() => {
    setFiles(prev => prev.map(f =>
      f.status === 'error' && f.retryCount < MAX_RETRIES
        ? { ...f, status: 'pending', progress: 0, error: undefined, retryCount: f.retryCount + 1 }
        : f
    ));
    toast.info('Archivos con error puestos en cola para reintentar');
  }, []);

  // Send browser notification
  const sendNotification = useCallback((title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  }, []);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  const processAll = useCallback(async () => {
    setIsProcessing(true);
    setProcessStartTime(Date.now());
    await requestNotificationPermission();

    const pendingFiles = files.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) {
      toast.info('No hay archivos pendientes');
      setIsProcessing(false);
      return;
    }

    toast.info(`🚀 Procesando ${pendingFiles.length} archivo(s)...`);

    const BATCH_SIZE = 3;
    for (let i = 0; i < pendingFiles.length; i += BATCH_SIZE) {
      const batch = pendingFiles.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(file => uploadFile(file)));
      const processed = Math.min(i + BATCH_SIZE, pendingFiles.length);
      if (processed < pendingFiles.length) {
        toast.loading(`Procesados ${processed}/${pendingFiles.length}...`);
      }
    }

    setIsProcessing(false);
    setProcessStartTime(null);

    // Browser notification when done
    const finalCompleted = files.filter(f => f.status === 'processed').length;
    const finalErrors = files.filter(f => f.status === 'error').length;
    sendNotification(
      'Lote de facturas completado',
      `${finalCompleted} procesadas, ${finalErrors} errores`
    );

    if (finalErrors === 0) {
      toast.success(`✅ ¡Lote completado! ${finalCompleted} procesados`);
    } else {
      toast.warning(`⚠️ Completado con ${finalErrors} errores`);
    }
  }, [files, uploadFile]);

  return {
    files,
    filteredFiles,
    filter,
    setFilter,
    stats,
    isProcessing,
    addFiles,
    removeFile,
    clearAll,
    clearCompleted,
    clearErrors,
    retryFile,
    retryAllErrors,
    processAll,
  };
};
