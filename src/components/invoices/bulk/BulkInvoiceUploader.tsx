import { useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, X, CheckCircle2, AlertCircle, Loader2, Eye, RotateCcw, Clock, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDropzone } from 'react-dropzone';
import { useBulkInvoiceUpload, type UploadFileItem, type FileFilter } from '@/hooks/useBulkInvoiceUpload';
import { useNavigate } from 'react-router-dom';

interface BulkInvoiceUploaderProps {
  centroCode: string;
}

const filterLabels: Record<FileFilter, string> = {
  all: 'Todos',
  pending: 'Pendientes',
  processing: 'En proceso',
  completed: 'Completados',
  needs_review: 'Revisión',
  error: 'Errores',
};

export const BulkInvoiceUploader = ({ centroCode }: BulkInvoiceUploaderProps) => {
  const navigate = useNavigate();
  const {
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
    processAll
  } = useBulkInvoiceUpload(centroCode);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    addFiles(acceptedFiles);
  }, [addFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
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
        return <AlertCircle className="w-4 h-4 text-destructive" />;
    }
  };

  const getStatusBadge = (status: UploadFileItem['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-muted-foreground">Pendiente</Badge>;
      case 'uploading':
        return <Badge variant="outline" className="text-primary">Subiendo</Badge>;
      case 'processing':
        return <Badge variant="outline" className="text-primary">OCR</Badge>;
      case 'processed':
        return <Badge variant="outline" className="text-green-600 border-green-600">OK</Badge>;
      case 'needs_review':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Revisión</Badge>;
      case 'error':
        return <Badge variant="outline" className="text-destructive border-destructive">Error</Badge>;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const formatEta = (ms: number | null) => {
    if (!ms) return null;
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `~${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `~${minutes}m ${secs}s`;
  };

  const canProcess = stats.pending > 0 && !isProcessing;
  const allCompleted = stats.total > 0 && stats.pending === 0 && stats.uploading === 0 && stats.processing === 0;
  const hasCompleted = stats.completed > 0;
  const hasErrors = stats.errors > 0;

  return (
    <div className="space-y-6">
      {/* Dropzone */}
      <Card className="p-8">
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer",
            "hover:border-primary hover:bg-primary/5",
            isDragActive ? "border-primary bg-primary/10" : "border-primary/40",
            isProcessing && "opacity-50 cursor-not-allowed"
          )}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">
            {isDragActive ? "Suelte los archivos aquí..." : "Arrastre facturas o haga clic para seleccionar"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            PDF · Máximo 10MB por archivo · Hasta 50 archivos
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
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold">Estado del lote</h3>
              {/* ETA indicator */}
              {stats.etaMs && (
                <Badge variant="secondary" className="gap-1">
                  <Clock className="w-3 h-3" />
                  ETA: {formatEta(stats.etaMs)}
                </Badge>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {canProcess && (
                <Button onClick={processAll} disabled={isProcessing} size="sm">
                  {isProcessing ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Procesando...</>
                  ) : (
                    <><Upload className="w-4 h-4 mr-2" />Procesar ({stats.pending})</>
                  )}
                </Button>
              )}
              {hasErrors && !isProcessing && (
                <Button onClick={retryAllErrors} variant="outline" size="sm">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reintentar errores ({stats.errors})
                </Button>
              )}
              {hasCompleted && !isProcessing && (
                <Button onClick={clearCompleted} variant="outline" size="sm">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Limpiar completados
                </Button>
              )}
              {hasErrors && !isProcessing && (
                <Button onClick={clearErrors} variant="ghost" size="sm">
                  <X className="w-4 h-4 mr-2" />
                  Limpiar errores
                </Button>
              )}
              {files.length > 0 && !isProcessing && (
                <Button onClick={clearAll} variant="ghost" size="sm">
                  Limpiar todo
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
              <div className="text-2xl font-bold text-destructive">{stats.errors}</div>
              <div className="text-xs text-muted-foreground mt-1">Errores</div>
            </div>
          </div>

          {/* OCR Statistics */}
          {(stats.completed + stats.needsReview) > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="text-center">
                <div className="text-lg font-bold text-primary">€{stats.totalCostEur.toFixed(4)}</div>
                <div className="text-xs text-muted-foreground mt-1">Coste OCR</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-primary">{(stats.avgProcessingTimeMs / 1000).toFixed(1)}s</div>
                <div className="text-xs text-muted-foreground mt-1">Tiempo medio</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-primary">Claude</div>
                <div className="text-xs text-muted-foreground mt-1">Motor OCR</div>
              </div>
            </div>
          )}

          {/* Overall Progress */}
          {stats.total > 0 && (
            <div className="mb-2">
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

      {/* Files List with Filters */}
      {files.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Archivos ({filteredFiles.length})</h3>
            {/* Filter chips */}
            <div className="flex gap-1.5 flex-wrap">
              {(Object.keys(filterLabels) as FileFilter[]).map(key => {
                const count = key === 'all' ? files.length
                  : key === 'processing' ? stats.uploading + stats.processing
                  : stats[key === 'completed' ? 'completed' : key === 'needs_review' ? 'needsReview' : key as keyof typeof stats] as number;
                if (key !== 'all' && count === 0) return null;
                return (
                  <Button
                    key={key}
                    size="sm"
                    variant={filter === key ? 'default' : 'outline'}
                    className="h-7 text-xs px-2.5"
                    onClick={() => setFilter(key)}
                  >
                    <Filter className="w-3 h-3 mr-1" />
                    {filterLabels[key]} {key !== 'all' && `(${count})`}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-shrink-0">{getStatusIcon(file.status)}</div>
                <FileText className="w-8 h-8 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium truncate">{file.file.name}</p>
                    {getStatusBadge(file.status)}
                    {file.retryCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        Intento {file.retryCount + 1}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {formatFileSize(file.file.size)}
                    {file.ocrConfidence != null && (
                      <> · OCR: {Math.round(file.ocrConfidence * 100)}%</>
                    )}
                    {file.processingTimeMs != null && (
                      <> · {(file.processingTimeMs / 1000).toFixed(1)}s</>
                    )}
                  </p>
                  {file.status !== 'pending' && file.status !== 'error' && (
                    <Progress value={file.progress} className="h-1" />
                  )}
                  {file.error && (
                    <p className="text-xs text-destructive mt-1">{file.error}</p>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {file.invoiceId && (file.status === 'processed' || file.status === 'needs_review') && (
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/invoices/received/${file.invoiceId}`)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  )}
                  {file.status === 'error' && file.retryCount < 3 && (
                    <Button size="sm" variant="ghost" onClick={() => retryFile(file.id)} title="Reintentar">
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  )}
                  {(file.status === 'pending' || file.status === 'error') && (
                    <Button size="sm" variant="ghost" onClick={() => removeFile(file.id)}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {filteredFiles.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No hay archivos con el filtro seleccionado
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Success Card */}
      {allCompleted && stats.errors === 0 && (
        <Card className="p-8 text-center bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-300 shadow-lg">
          <div className="animate-bounce mb-4">
            <CheckCircle2 className="w-20 h-20 mx-auto text-green-600 drop-shadow-lg" />
          </div>
          <h3 className="text-2xl font-bold text-green-900 dark:text-green-100 mb-2">
            ¡Lote procesado correctamente! 🎉
          </h3>
          <p className="text-sm text-green-700 dark:text-green-300 mb-4">
            {stats.completed} facturas procesadas
            {stats.needsReview > 0 && ` · ${stats.needsReview} requieren revisión`}
          </p>
          <div className="flex justify-center gap-3">
            <Button onClick={() => navigate('/invoices/received')} size="sm">Ver facturas</Button>
            <Button onClick={clearCompleted} variant="outline" size="sm">Limpiar y continuar</Button>
          </div>
        </Card>
      )}

      {/* Partial Success */}
      {allCompleted && stats.errors > 0 && (
        <Card className="p-8 text-center bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-yellow-300 shadow-lg">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-yellow-600" />
          <h3 className="text-xl font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
            Completado con advertencias
          </h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
            {stats.completed} OK · {stats.needsReview} revisión · {stats.errors} errores
          </p>
          <div className="flex justify-center gap-3">
            <Button onClick={retryAllErrors} size="sm">
              <RotateCcw className="w-4 h-4 mr-2" />
              Reintentar errores
            </Button>
            <Button onClick={() => navigate('/invoices/received')} variant="outline" size="sm">Ver facturas</Button>
          </div>
        </Card>
      )}
    </div>
  );
};
