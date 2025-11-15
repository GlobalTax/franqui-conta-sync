import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Download, Upload } from "lucide-react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface IVARow {
  fecha: string;
  numero: string;
  nif: string;
  nombre: string;
  base: number;
  tipo: number;
  cuota: number;
  total: number;
}

interface ValidationError {
  row: number;
  field: string;
  value: string;
  issue: string;
  suggestion?: string;
}

interface IVACSVValidatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'emitidas' | 'recibidas';
  onValidated: (rows: IVARow[]) => void;
  fiscalYearRange?: { startDate: string; endDate: string };
}

export function IVACSVValidator({
  open,
  onOpenChange,
  type,
  onValidated,
  fiscalYearRange
}: IVACSVValidatorProps) {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<IVARow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [duplicates, setDuplicates] = useState<string[]>([]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      const f = acceptedFiles[0];
      if (f) {
        setFile(f);
        handleParse(f);
      }
    },
  });

  const handleParse = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const parsed: IVARow[] = result.data.map((row: any) => ({
          fecha: row.fecha || row.date || '',
          numero: row.numero || row.number || '',
          nif: row.nif || row.vat_id || '',
          nombre: row.nombre || row.name || '',
          base: parseFloat(row.base || row.base_amount || '0'),
          tipo: parseFloat(row.tipo || row.tax_rate || '0'),
          cuota: parseFloat(row.cuota || row.tax_amount || '0'),
          total: parseFloat(row.total || row.total_amount || '0'),
        }));

        setRows(parsed);
        performValidations(parsed);
      },
      error: (error) => {
        toast.error(`Error al parsear CSV: ${error.message}`);
      },
    });
  };

  const performValidations = (parsed: IVARow[]) => {
    const basicErrors: string[] = [];
    const validationIssues: ValidationError[] = [];
    const seen = new Map<string, number>();
    const dups: string[] = [];

    parsed.forEach((row, idx) => {
      // Required fields
      if (!row.fecha) basicErrors.push(`Fila ${idx + 1}: Falta fecha`);
      if (!row.numero) basicErrors.push(`Fila ${idx + 1}: Falta número de factura`);
      if (!row.nif) basicErrors.push(`Fila ${idx + 1}: Falta NIF`);

      // Date validation
      if (fiscalYearRange && row.fecha) {
        const rowDate = new Date(row.fecha);
        const startDate = new Date(fiscalYearRange.startDate);
        const endDate = new Date(fiscalYearRange.endDate);
        
        if (rowDate < startDate || rowDate > endDate) {
          validationIssues.push({
            row: idx + 1,
            field: 'fecha',
            value: row.fecha,
            issue: 'Fecha fuera del ejercicio fiscal',
            suggestion: `Debe estar entre ${fiscalYearRange.startDate} y ${fiscalYearRange.endDate}`
          });
        }
      }

      // Amount validations
      const calculatedTax = row.base * (row.tipo / 100);
      const taxDiff = Math.abs(calculatedTax - row.cuota);
      if (taxDiff > 0.02) {
        validationIssues.push({
          row: idx + 1,
          field: 'cuota',
          value: row.cuota.toString(),
          issue: `Cuota no coincide con base × tipo`,
          suggestion: `Esperado: ${calculatedTax.toFixed(2)}`
        });
      }

      const calculatedTotal = row.base + row.cuota;
      const totalDiff = Math.abs(calculatedTotal - row.total);
      if (totalDiff > 0.02) {
        validationIssues.push({
          row: idx + 1,
          field: 'total',
          value: row.total.toString(),
          issue: `Total no coincide con base + cuota`,
          suggestion: `Esperado: ${calculatedTotal.toFixed(2)}`
        });
      }

      // NIF validation (basic Spanish format)
      const nifPattern = /^[A-Z0-9]{8,9}$/i;
      if (row.nif && !nifPattern.test(row.nif)) {
        validationIssues.push({
          row: idx + 1,
          field: 'nif',
          value: row.nif,
          issue: 'Formato de NIF inválido',
          suggestion: 'Debe tener 8-9 caracteres alfanuméricos'
        });
      }

      // Duplicate detection
      const key = `${row.numero}-${row.nif}`;
      if (seen.has(key)) {
        dups.push(`Factura ${row.numero} (${row.nif}) duplicada en filas ${seen.get(key)! + 1} y ${idx + 1}`);
      } else {
        seen.set(key, idx);
      }
    });

    setErrors(basicErrors);
    setValidationErrors(validationIssues);
    setDuplicates(dups);

    if (basicErrors.length === 0 && validationIssues.length === 0 && dups.length === 0) {
      toast.success(`${parsed.length} facturas validadas correctamente`);
    } else {
      const totalIssues = basicErrors.length + validationIssues.length + dups.length;
      toast.warning(`${totalIssues} advertencias encontradas`);
    }
  };

  const downloadErrors = () => {
    if (validationErrors.length === 0 && duplicates.length === 0) {
      toast.error('No hay errores para descargar');
      return;
    }

    const csvContent = [
      ['Fila', 'Campo', 'Valor', 'Problema', 'Sugerencia'],
      ...validationErrors.map(e => [
        e.row.toString(),
        e.field,
        e.value,
        e.issue,
        e.suggestion || ''
      ]),
      ...duplicates.map(d => ['', '', '', d, ''])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `errores-iva-${type}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Errores exportados');
  };

  const downloadTemplate = () => {
    const template = [
      ['fecha', 'numero', 'nif', 'nombre', 'base', 'tipo', 'cuota', 'total'],
      ['2024-01-15', 'F-001', 'B12345678', 'Proveedor SA', '1000.00', '21', '210.00', '1210.00'],
      ['2024-01-20', 'F-002', 'A87654321', 'Cliente SL', '500.00', '21', '105.00', '605.00'],
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `plantilla-iva-${type}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Plantilla descargada');
  };

  const handleContinue = () => {
    if (errors.length > 0) {
      toast.error('Corrige los errores obligatorios antes de continuar');
      return;
    }
    onValidated(rows);
    onOpenChange(false);
  };

  // Calculate totals
  const totals = rows.reduce(
    (acc, row) => ({
      base: acc.base + row.base,
      cuota: acc.cuota + row.cuota,
      total: acc.total + row.total,
    }),
    { base: 0, cuota: 0, total: 0 }
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Importar IVA {type === 'emitidas' ? 'Emitidas' : 'Recibidas'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            )}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {file ? file.name : `Arrastra un CSV de facturas ${type}`}
            </p>
          </div>

          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Errores críticos ({errors.length})</AlertTitle>
              <AlertDescription className="text-xs max-h-32 overflow-y-auto">
                {errors.slice(0, 5).map((err, i) => (
                  <div key={i}>{err}</div>
                ))}
                {errors.length > 5 && <div>... y {errors.length - 5} más</div>}
              </AlertDescription>
            </Alert>
          )}

          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Advertencias de validación ({validationErrors.length})</AlertTitle>
              <AlertDescription>
                Se encontraron inconsistencias en los datos. Puedes continuar pero revisa los errores.
              </AlertDescription>
            </Alert>
          )}

          {duplicates.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Facturas duplicadas ({duplicates.length})</AlertTitle>
              <AlertDescription className="text-xs">
                {duplicates.slice(0, 3).map((dup, i) => (
                  <div key={i}>{dup}</div>
                ))}
                {duplicates.length > 3 && <div>... y {duplicates.length - 3} más</div>}
              </AlertDescription>
            </Alert>
          )}

          {rows.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Resumen ({rows.length} facturas)</CardTitle>
                  <div className="flex gap-2">
                    {(validationErrors.length > 0 || duplicates.length > 0) && (
                      <Button variant="outline" size="sm" onClick={downloadErrors}>
                        <Download className="h-4 w-4 mr-2" />
                        Exportar errores
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={downloadTemplate}>
                      Plantilla
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Base total</div>
                    <div className="text-lg font-semibold">{totals.base.toFixed(2)} €</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">IVA total</div>
                    <div className="text-lg font-semibold">{totals.cuota.toFixed(2)} €</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Total</div>
                    <div className="text-lg font-semibold">{totals.total.toFixed(2)} €</div>
                  </div>
                </div>

                <div className="text-xs space-y-1 max-h-48 overflow-y-auto">
                  <div className="font-semibold grid grid-cols-8 gap-2 pb-2 border-b sticky top-0 bg-background">
                    <span>Fecha</span>
                    <span>Número</span>
                    <span>NIF</span>
                    <span className="col-span-2">Nombre</span>
                    <span className="text-right">Base</span>
                    <span className="text-right">IVA</span>
                    <span className="text-right">Total</span>
                  </div>
                  {rows.slice(0, 20).map((row, idx) => {
                    const hasError = validationErrors.some(e => e.row === idx + 1);
                    return (
                      <div
                        key={idx}
                        className={cn(
                          "grid grid-cols-8 gap-2 py-1",
                          hasError && "bg-destructive/10"
                        )}
                      >
                        <span>{row.fecha}</span>
                        <span>{row.numero}</span>
                        <span>{row.nif}</span>
                        <span className="col-span-2 truncate">{row.nombre}</span>
                        <span className="text-right">{row.base.toFixed(2)}</span>
                        <span className="text-right">{row.cuota.toFixed(2)}</span>
                        <span className="text-right">{row.total.toFixed(2)}</span>
                      </div>
                    );
                  })}
                  {rows.length > 20 && (
                    <div className="text-muted-foreground text-center py-2">
                      ... y {rows.length - 20} facturas más
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleContinue}
              disabled={rows.length === 0 || errors.length > 0}
            >
              Continuar con importación
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
