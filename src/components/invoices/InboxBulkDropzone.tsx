import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useBulkInvoiceUpload, type UploadFileItem } from '@/hooks/useBulkInvoiceUpload';
import { formatFileSize } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface InboxBulkDropzoneProps {
  centroCode: string;
  onUploadComplete?: () => void;
  supplierHint?: string;
}

export function InboxBulkDropzone({ centroCode, onUploadComplete, supplierHint }: InboxBulkDropzoneProps) {
  const {
    files,
    stats,
    isProcessing,
    addFiles,
    removeFile,
    processAll,
    clearCompleted,
    clearErrors,
  } = useBulkInvoiceUpload(centroCode);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    addFiles(acceptedFiles);
  }, [addFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 10 * 1024 * 1024,
    multiple: true,
  });

  const handleProcessAll = async () => {
    await processAll();
    if (onUploadComplete) {
      onUploadComplete();
    }
  };

  const getStatusIcon = (status: UploadFileItem['status']) => {
    switch (status) {
      case 'processed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'needs_review':
        return <AlertCircle className="h-4 w-4 text-warning" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'uploading':
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: UploadFileItem['status']) => {
    const labels = {
      pending: 'Pendiente',
      uploading: 'Subiendo',
      processing: 'Procesando OCR',
      processed: 'Completado',
      needs_review: 'Requiere revisión',
      error: 'Error',
    };
    return labels[status];
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <Card
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed cursor-pointer transition-colors hover:border-primary/50",
          isDragActive && "border-primary bg-primary/5"
        )}
      >
        <input {...getInputProps()} />
        <div className="p-8 text-center">
          <Upload className={cn(
            "h-10 w-10 mx-auto mb-4 transition-colors",
            isDragActive ? "text-primary" : "text-muted-foreground"
          )} />
          <p className="text-base font-medium mb-1">
            {isDragActive ? 'Suelta los archivos aquí' : 'Arrastra facturas PDF o haz clic para seleccionar'}
          </p>
          <p className="text-sm text-muted-foreground">
            Máximo 50 archivos · 10MB por archivo · Solo PDF
          </p>
          {supplierHint && (
            <p className="text-xs text-muted-foreground mt-2">
              💡 Proveedor sugerido: {supplierHint}
            </p>
          )}
        </div>
      </Card>

      {/* Stats & Actions */}
      {files.length > 0 && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline">{stats.total} archivos</Badge>
            {stats.completed > 0 && <Badge variant="default">{stats.completed} completados</Badge>}
            {stats.needsReview > 0 && <Badge variant="secondary">{stats.needsReview} requieren revisión</Badge>}
            {stats.errors > 0 && <Badge variant="destructive">{stats.errors} errores</Badge>}
          </div>
          <div className="flex items-center gap-2">
            {stats.completed > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCompleted}>
                Limpiar completados
              </Button>
            )}
            {stats.errors > 0 && (
              <Button variant="ghost" size="sm" onClick={clearErrors}>
                Limpiar errores
              </Button>
            )}
            <Button
              onClick={handleProcessAll}
              disabled={isProcessing || stats.pending === 0}
              size="sm"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Procesando...
                </>
              ) : (
                `Procesar ${stats.pending > 0 ? `(${stats.pending})` : ''}`
              )}
            </Button>
          </div>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {files.map((fileItem) => (
            <Card key={fileItem.id} className="p-3">
              <div className="flex items-center gap-3">
                {getStatusIcon(fileItem.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-sm font-medium truncate">{fileItem.file.name}</p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatFileSize(fileItem.file.size)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{getStatusLabel(fileItem.status)}</span>
                    {fileItem.ocrEngine && (
                      <Badge variant="outline" className="text-xs">{fileItem.ocrEngine}</Badge>
                    )}
                    {fileItem.ocrConfidence !== undefined && (
                      <Badge variant="outline" className="text-xs">
                        {Math.round(fileItem.ocrConfidence * 100)}% confianza
                      </Badge>
                    )}
                  </div>
                  {(fileItem.status === 'uploading' || fileItem.status === 'processing') && (
                    <Progress value={fileItem.progress} className="h-1 mt-2" />
                  )}
                  {fileItem.error && (
                    <p className="text-xs text-destructive mt-1">{fileItem.error}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => removeFile(fileItem.id)}
                  disabled={fileItem.status === 'uploading' || fileItem.status === 'processing'}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
