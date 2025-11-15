import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Papa from "papaparse";

export interface ValidationError {
  row_number?: number;
  error_type: 'unbalanced' | 'invalid_account' | 'date_out_of_range' | 'missing_data' | 'trial_balance';
  severity: 'error' | 'warning';
  entity_type: 'journal_entry' | 'iva_invoice' | 'bank_transaction';
  entity_id?: string;
  entity_number?: number;
  field?: string;
  value?: string;
  expected?: string;
  message: string;
  suggestion?: string;
}

interface ErrorExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  errors: ValidationError[];
  warnings: ValidationError[];
}

const ERROR_TYPE_LABELS: Record<string, string> = {
  unbalanced: 'Descuadre',
  invalid_account: 'Cuenta inválida',
  date_out_of_range: 'Fecha fuera de rango',
  missing_data: 'Datos faltantes',
  trial_balance: 'Balance',
};

const SEVERITY_LABELS: Record<string, { label: string; variant: 'destructive' | 'default' }> = {
  error: { label: 'Error', variant: 'destructive' },
  warning: { label: 'Advertencia', variant: 'default' },
};

export function ErrorExportDialog({ open, onOpenChange, errors, warnings }: ErrorExportDialogProps) {
  const [severityFilter, setSeverityFilter] = useState<'all' | 'error' | 'warning'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const allIssues = useMemo(() => [...errors, ...warnings], [errors, warnings]);

  const filteredIssues = useMemo(() => {
    return allIssues.filter((issue) => {
      if (severityFilter !== 'all' && issue.severity !== severityFilter) {
        return false;
      }
      if (typeFilter !== 'all' && issue.error_type !== typeFilter) {
        return false;
      }
      return true;
    });
  }, [allIssues, severityFilter, typeFilter]);

  const uniqueTypes = useMemo(() => {
    return Array.from(new Set(allIssues.map(i => i.error_type)));
  }, [allIssues]);

  const handleExportCSV = () => {
    const csvData = filteredIssues.map((issue) => ({
      'Tipo': ERROR_TYPE_LABELS[issue.error_type] || issue.error_type,
      'Severidad': SEVERITY_LABELS[issue.severity].label,
      'Entidad': issue.entity_type,
      'Número': issue.entity_number || '',
      'Campo': issue.field || '',
      'Valor': issue.value || '',
      'Esperado': issue.expected || '',
      'Problema': issue.message,
      'Sugerencia': issue.suggestion || '',
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `errores-validacion-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Errores y advertencias de validación</DialogTitle>
          <DialogDescription>
            {errors.length} errores, {warnings.length} advertencias encontradas
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 py-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={severityFilter} onValueChange={(v: any) => setSeverityFilter(v)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="error">Errores</SelectItem>
                <SelectItem value="warning">Advertencias</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {uniqueTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {ERROR_TYPE_LABELS[type] || type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex-1" />

          <Button onClick={handleExportCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV ({filteredIssues.length})
          </Button>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Severidad</TableHead>
                  <TableHead className="w-32">Tipo</TableHead>
                  <TableHead className="w-20">#</TableHead>
                  <TableHead>Problema</TableHead>
                  <TableHead>Sugerencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIssues.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No hay errores con los filtros seleccionados
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredIssues.map((issue, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Badge variant={SEVERITY_LABELS[issue.severity].variant}>
                          {SEVERITY_LABELS[issue.severity].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {ERROR_TYPE_LABELS[issue.error_type] || issue.error_type}
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        {issue.entity_number || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="space-y-1">
                          <div className="font-medium">{issue.message}</div>
                          {issue.value && (
                            <div className="text-xs text-muted-foreground">
                              Valor: <code className="bg-muted px-1 rounded">{issue.value}</code>
                              {issue.expected && (
                                <span className="ml-2">
                                  → Esperado: <code className="bg-muted px-1 rounded">{issue.expected}</code>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {issue.suggestion || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
