import { useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, X, CheckCircle2, AlertCircle, Loader2, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDropzone } from 'react-dropzone';
import { useBulkInvoiceUpload, type UploadFileItem } from '@/hooks/useBulkInvoiceUpload';
import { useNavigate } from 'react-router-dom';

interface BulkInvoiceUploaderProps {
  centroCode: string;
}

export const BulkInvoiceUploader = ({ centroCode }: BulkInvoiceUploaderProps) => {
  const navigate = useNavigate();
  const { files, stats, isProcessing, addFiles, removeFile, clearAll, processAll } = useBulkInvoiceUpload(centroCode);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    addFiles(acceptedFiles);
  }, [addFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 50,
    disabled: isProcessing
  });

  const getStatusIcon = (status: UploadFileItem['status']) => {
    switch (status) {
      case 'pending':
        return <div className="w-4 h-4 rounded-full bg-muted border-2 border-primary" />;
      case 'uploading':
      case 'processing':
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      case 'processed':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'needs_review':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
    }
  };

  const getStatusBadge = (status: UploadFileItem['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-muted-foreground">Pendiente</Badge>;
      case 'uploading':
        return <Badge variant="outline" className="text-primary">Subiendo</Badge>;
      case 'processing':
        return <Badge variant="outline" className="text-primary">Procesando OCR</Badge>;
      case 'processed':
        return <Badge variant="outline" className="text-green-600 border-green-600">Procesado</Badge>;
      case 'needs_review':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Requiere Revisión</Badge>;
      case 'error':
        return <Badge variant="outline" className="text-red-600 border-red-600">Error</Badge>;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const canProcess = stats.pending > 0 && !isProcessing;
  const allCompleted = stats.total > 0 && stats.pending === 0 && stats.uploading === 0 && stats.processing === 0;

  return (
    <div className="space-y-6">
      {/* Dropzone */}
      <Card className="p-8">
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer",
            "hover:border-primary hover:bg-primary/5",
            isDragActive ? "border-primary bg-primary/10" : "border-muted",
            isProcessing && "opacity-50 cursor-not-allowed"
          )}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">
            {isDragActive 
              ? "Suelte los archivos aquí..." 
              : "Arrastre aquí sus facturas o haga clic para seleccionar"
            }
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            PDF · Máximo 10MB por archivo · Hasta 50 archivos simultáneos
          </p>
          <Button variant="outline" disabled={isProcessing}>
            Seleccionar archivos
          </Button>
        </div>
      </Card>

      {/* Stats Dashboard */}
      {files.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Estado del lote</h3>
            <div className="flex gap-2">
              {canProcess && (
                <Button onClick={processAll} disabled={isProcessing}>
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Procesar lote ({stats.pending})
                    </>
                  )}
                </Button>
              )}
              {allCompleted && (
                <Button onClick={clearAll} variant="outline">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Limpiar completados
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{stats.total}</div>
              <div className="text-xs text-muted-foreground mt-1">Total</div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-xs text-muted-foreground mt-1">Completados</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{stats.needsReview}</div>
              <div className="text-xs text-muted-foreground mt-1">Revisión</div>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
              <div className="text-xs text-muted-foreground mt-1">Errores</div>
            </div>
          </div>

          {/* Overall Progress */}
          {stats.total > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progreso general</span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(((stats.completed + stats.needsReview + stats.errors) / stats.total) * 100)}%
                </span>
              </div>
              <Progress 
                value={((stats.completed + stats.needsReview + stats.errors) / stats.total) * 100} 
                className="h-2"
              />
            </div>
          )}
        </Card>
      )}

      {/* Files List */}
      {files.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Archivos ({files.length})</h3>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-shrink-0">
                  {getStatusIcon(file.status)}
                </div>

                <FileText className="w-8 h-8 text-muted-foreground flex-shrink-0" />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium truncate">{file.file.name}</p>
                    {getStatusBadge(file.status)}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {formatFileSize(file.file.size)}
                    {file.ocrConfidence && (
                      <> · Confianza OCR: {Math.round(file.ocrConfidence * 100)}%</>
                    )}
                  </p>
                  {file.status !== 'pending' && file.status !== 'error' && (
                    <Progress value={file.progress} className="h-1" />
                  )}
                  {file.error && (
                    <p className="text-xs text-red-600 mt-1">{file.error}</p>
                  )}
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  {file.invoiceId && (file.status === 'processed' || file.status === 'needs_review') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/invoices/received/${file.invoiceId}`)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  )}
                  {(file.status === 'pending' || file.status === 'error') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile(file.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Success Animation */}
      {allCompleted && stats.errors === 0 && (
        <Card className="p-8 text-center bg-green-50 dark:bg-green-950/20 border-green-200">
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-600 animate-pulse" />
          <h3 className="text-xl font-semibold text-green-900 dark:text-green-100 mb-2">
            ¡Lote procesado correctamente!
          </h3>
          <p className="text-sm text-green-700 dark:text-green-300">
            {stats.completed} facturas procesadas exitosamente
            {stats.needsReview > 0 && ` · ${stats.needsReview} requieren revisión manual`}
          </p>
        </Card>
      )}
    </div>
  );
};
