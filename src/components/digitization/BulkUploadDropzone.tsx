// ============================================================================
// BULK UPLOAD DROPZONE
// Componente para carga masiva de PDFs con OCR automático
// ============================================================================

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileCheck, AlertCircle, X } from "lucide-react";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";

interface UploadedFile {
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'success' | 'error';
  progress: number;
  error?: string;
  invoiceId?: string;
}

interface BulkUploadDropzoneProps {
  onUploaded: (files: File[]) => void;
}

export function BulkUploadDropzone({ onUploaded }: BulkUploadDropzoneProps) {
  const { currentMembership } = useOrganization();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map((file) => ({
      file,
      status: 'pending',
      progress: 0,
    }));
    
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxSize: 20 * 1024 * 1024, // 20MB
  });

  const processFiles = async () => {
    if (!currentMembership) {
      toast.error("No hay membresía activa");
      return;
    }

    setIsProcessing(true);

    for (let i = 0; i < files.length; i++) {
      const fileEntry = files[i];
      if (fileEntry.status !== 'pending') continue;

      try {
        // Update status: uploading
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: 'uploading' as const, progress: 30 } : f
          )
        );

        // Upload to storage
        const fileName = `${Date.now()}_${fileEntry.file.name}`;
        const filePath = `${currentMembership.organization_id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('invoice-documents')
          .upload(filePath, fileEntry.file);

        if (uploadError) throw uploadError;

        // Update status: processing OCR
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: 'processing' as const, progress: 60 } : f
          )
        );

        // Call OCR function in background
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error("Usuario no autenticado");

        const { data: ocrData, error: ocrError } = await supabase.functions.invoke(
          'invoice-ocr',
          {
            body: {
              documentPath: filePath,
              centroCode: currentMembership.restaurant?.codigo || 'DEFAULT',
              engine: 'mindee',
            },
          }
        );

        if (ocrError) throw ocrError;

        // Update status: success
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? {
                  ...f,
                  status: 'success' as const,
                  progress: 100,
                  invoiceId: ocrData?.invoice_id,
                }
              : f
          )
        );
      } catch (error: any) {
        console.error('Error processing file:', error);
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? {
                  ...f,
                  status: 'error' as const,
                  error: error.message || 'Error desconocido',
                }
              : f
          )
        );
      }
    }

    setIsProcessing(false);
    
    const successCount = files.filter((f) => f.status === 'success').length;
    toast.success(`${successCount} facturas procesadas correctamente`);
    
    onUploaded(files.filter((f) => f.status === 'success').map((f) => f.file));
  };

  const clearFiles = () => {
    setFiles([]);
  };

  const getStatusBadge = (status: UploadedFile['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Pendiente</Badge>;
      case 'uploading':
        return <Badge variant="secondary">Subiendo...</Badge>;
      case 'processing':
        return <Badge variant="secondary">Procesando OCR...</Badge>;
      case 'success':
        return <Badge variant="default">✓ Completado</Badge>;
      case 'error':
        return <Badge variant="destructive">✗ Error</Badge>;
    }
  };

  return (
    <Card className="p-6 space-y-6">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-lg font-medium mb-2">
          {isDragActive
            ? 'Suelta los archivos aquí...'
            : 'Arrastra PDFs o haz clic para seleccionar'}
        </p>
        <p className="text-sm text-muted-foreground">
          Máximo 20MB por archivo · Solo PDF
        </p>
      </div>

      {/* Files List */}
      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">
              Archivos ({files.length})
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFiles}
              disabled={isProcessing}
            >
              <X className="w-4 h-4 mr-2" />
              Limpiar
            </Button>
          </div>

          <div className="space-y-2">
            {files.map((fileEntry, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 p-3 border rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{fileEntry.file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(fileEntry.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  {fileEntry.status !== 'pending' && fileEntry.status !== 'error' && (
                    <Progress value={fileEntry.progress} className="mt-2" />
                  )}
                  {fileEntry.error && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {fileEntry.error}
                    </p>
                  )}
                </div>
                {getStatusBadge(fileEntry.status)}
              </div>
            ))}
          </div>

          {/* Process Button */}
          <Button
            onClick={processFiles}
            disabled={isProcessing || files.every((f) => f.status !== 'pending')}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent mr-2" />
                Procesando...
              </>
            ) : (
              <>
                <FileCheck className="w-4 h-4 mr-2" />
                Procesar {files.filter((f) => f.status === 'pending').length} archivos
              </>
            )}
          </Button>
        </div>
      )}
    </Card>
  );
}
