import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, Eye } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ImportRun, ImportStatus } from "@/hooks/useImportRun";

interface ImportHistoryTableProps {
  imports: ImportRun[];
  onViewDetails?: (importRun: ImportRun) => void;
  onDownloadErrors?: (importRun: ImportRun) => void;
}

const statusConfig: Record<ImportStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: 'Pendiente', variant: 'secondary' },
  staging: { label: 'Validando', variant: 'default' },
  posting: { label: 'Contabilizando', variant: 'default' },
  completed: { label: 'Completado', variant: 'outline' },
  error: { label: 'Error', variant: 'destructive' },
};

export function ImportHistoryTable({ imports, onViewDetails, onDownloadErrors }: ImportHistoryTableProps) {
  if (imports.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No hay importaciones registradas</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Módulo</TableHead>
            <TableHead>Archivo</TableHead>
            <TableHead>Centro</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Filas</TableHead>
            <TableHead className="text-right">Asientos</TableHead>
            <TableHead className="text-right">Errores</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {imports.map((importRun) => (
            <TableRow key={importRun.id}>
              <TableCell className="font-medium">
                {format(new Date(importRun.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
              </TableCell>
              <TableCell className="capitalize">{importRun.module.replace('_', ' ')}</TableCell>
              <TableCell className="max-w-[200px] truncate">
                {importRun.filename || '-'}
              </TableCell>
              <TableCell>{importRun.centro_code || 'Todos'}</TableCell>
              <TableCell>
                <Badge variant={statusConfig[importRun.status].variant}>
                  {statusConfig[importRun.status].label}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {importRun.stats?.rows_inserted || 0} / {importRun.stats?.rows_total || 0}
              </TableCell>
              <TableCell className="text-right">
                {importRun.stats?.entries_created || 0}
              </TableCell>
              <TableCell className="text-right">
                {importRun.stats?.rows_error ? (
                  <span className="text-destructive font-medium">
                    {importRun.stats.rows_error}
                  </span>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  {onViewDetails && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetails(importRun)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  {onDownloadErrors && importRun.stats?.rows_error && importRun.stats.rows_error > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDownloadErrors(importRun)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
