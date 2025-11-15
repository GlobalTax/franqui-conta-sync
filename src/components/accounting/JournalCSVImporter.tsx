import { useMemo, useState } from "react";
import Papa from "papaparse";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle, Download, AlertCircle } from "lucide-react";
import { useCreateAccountingEntry } from "@/hooks/useAccountingEntries";
import { useSupabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { NewAccountingEntryFormData, MovementType } from "@/types/accounting-entries";
import { cn } from "@/lib/utils";

type ParsedRow = {
  entry_date: string;
  description?: string;
  account_code: string;
  debit?: string | number;
  credit?: string | number;
  line_description?: string;
};

interface JournalCSVImporterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  centroCode: string;
  onImportComplete?: (count: number, totalDebit: number, totalCredit: number) => void;
  fiscalYearRange?: { startDate: string; endDate: string };
}

interface ValidationError {
  row: number;
  field: string;
  value: string;
  issue: string;
  suggestion?: string;
}

export function JournalCSVImporter({ 
  open, 
  onOpenChange, 
  centroCode, 
  onImportComplete,
  fiscalYearRange 
}: JournalCSVImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [validAccounts, setValidAccounts] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const createEntry = useCreateAccountingEntry();
  const supabase = useSupabase();

  const grouped = useMemo(() => {
    const byKey = new Map<string, ParsedRow[]>();
    for (const r of rows) {
      const key = `${r.entry_date}|${r.description || "SIN DESCRIPCIÓN"}`;
      const list = byKey.get(key) || [];
      list.push(r);
      byKey.set(key, list);
    }
    return Array.from(byKey.entries()).map(([key, items]) => {
      const [entry_date, description] = key.split("|");
      return { entry_date, description, items };
    });
  }, [rows]);

  const totals = useMemo(() => {
    return grouped.map((g) => {
      let debit = 0;
      let credit = 0;
      for (const it of g.items) {
        const d = parseFloat(it.debit?.toString().replace(',', '.') || '0');
        const c = parseFloat(it.credit?.toString().replace(',', '.') || '0');
        debit += d;
        credit += c;
      }
      return { 
        key: `${g.entry_date}-${g.description}`, 
        debit, 
        credit, 
        balanced: Math.abs(debit - credit) < 0.01 
      };
    });
  }, [grouped]);

  const hasUnbalanced = totals.some((t) => !t.balanced);

  const handleParse = async () => {
    if (!file) return;
    setErrors([]);
    setValidationErrors([]);
    
    Papa.parse<ParsedRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (result) => {
        const data = (result.data || []).map((r) => ({
          entry_date: (r.entry_date || "").toString().trim(),
          description: r.description || "",
          account_code: (r.account_code || "").toString().trim(),
          debit: r.debit ?? "",
          credit: r.credit ?? "",
          line_description: r.line_description || "",
        }));

        const errs: string[] = [];
        
        for (let i = 0; i < data.length; i++) {
          const r = data[i];
          
          if (!r.entry_date || !r.account_code) {
            errs.push(`Fila ${i + 1}: faltan campos obligatorios`);
            continue;
          }
          
          if (!/^\d{4}-\d{2}-\d{2}$/.test(r.entry_date)) {
            errs.push(`Fila ${i + 1}: fecha debe estar en formato YYYY-MM-DD`);
          }
          
          if (!/^\d{7}$/.test(r.account_code)) {
            errs.push(`Fila ${i + 1}: account_code debe tener 7 dígitos`);
          }
          
          const d = parseFloat(r.debit?.toString().replace(',', '.') || '0');
          const c = parseFloat(r.credit?.toString().replace(',', '.') || '0');
          if (d === 0 && c === 0) {
            errs.push(`Fila ${i + 1}: debit y credit están en 0`);
          }
        }

        setRows(data);
        setErrors(errs);
        
        await performAdvancedValidations(data);

        if (errs.length === 0) {
          toast.success(`${data.length} líneas parseadas`);
        } else {
          toast.warning(`${errs.length} errores encontrados`);
        }
      },
      error: (error) => {
        toast.error(`Error al parsear CSV: ${error.message}`);
      },
    });
  };

  const performAdvancedValidations = async (parsed: ParsedRow[]) => {
    const validationIssues: ValidationError[] = [];
    
    if (fiscalYearRange) {
      parsed.forEach((row, idx) => {
        if (!row.entry_date) return;
        const rowDate = new Date(row.entry_date);
        const startDate = new Date(fiscalYearRange.startDate);
        const endDate = new Date(fiscalYearRange.endDate);
        
        if (rowDate < startDate || rowDate > endDate) {
          validationIssues.push({
            row: idx + 1,
            field: 'entry_date',
            value: row.entry_date,
            issue: 'Fecha fuera del ejercicio fiscal',
            suggestion: `Entre ${fiscalYearRange.startDate} y ${fiscalYearRange.endDate}`
          });
        }
      });
    }

    const uniqueAccounts = [...new Set(parsed.map(r => r.account_code).filter(Boolean))];
    try {
      const { data: accounts } = await supabase
        .from('accounts')
        .select('code')
        .eq('centro_code', centroCode)
        .in('code', uniqueAccounts);
      
      const validCodes = new Set(accounts?.map(a => a.code) || []);
      setValidAccounts(validCodes);

      parsed.forEach((row, idx) => {
        if (!row.account_code) return;
        if (!validCodes.has(row.account_code)) {
          validationIssues.push({
            row: idx + 1,
            field: 'account_code',
            value: row.account_code,
            issue: 'Cuenta no existe',
            suggestion: 'Verifica el código'
          });
        }
      });
    } catch (error) {
      console.error('Error validating:', error);
    }

    setValidationErrors(validationIssues);
  };

  const handleImport = async () => {
    if (hasUnbalanced || errors.length > 0) {
      toast.error("Corrige errores antes de importar");
      return;
    }

    setImporting(true);
    let successCount = 0;
    let totalDebit = 0;
    let totalCredit = 0;

    try {
      for (const g of grouped) {
        const transactions: Array<{
          account_code: string;
          movement_type: MovementType;
          amount: number;
          description?: string;
        }> = [];
        
        for (const it of g.items) {
          const d = parseFloat(it.debit?.toString().replace(',', '.') || '0');
          const c = parseFloat(it.credit?.toString().replace(',', '.') || '0');
          
          if (d > 0) {
            transactions.push({
              account_code: it.account_code,
              movement_type: "debit" as MovementType,
              amount: d,
              description: it.line_description || undefined,
            });
            totalDebit += d;
          }
          
          if (c > 0) {
            transactions.push({
              account_code: it.account_code,
              movement_type: "credit" as MovementType,
              amount: c,
              description: it.line_description || undefined,
            });
            totalCredit += c;
          }
        }

        const formData: NewAccountingEntryFormData = {
          centro_code: centroCode,
          entry_date: g.entry_date,
          description: g.description,
          transactions,
        };

        await createEntry.mutateAsync(formData);
        successCount++;
      }

      toast.success(`${successCount} asientos importados`);
      onImportComplete?.(successCount, totalDebit, totalCredit);
      onOpenChange(false);
      
      setFile(null);
      setRows([]);
      setErrors([]);
      setValidationErrors([]);
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      ['entry_date', 'description', 'account_code', 'debit', 'credit'],
      ['2024-01-15', 'Compra', '6000000', '1000.00', ''],
      ['2024-01-15', 'Compra', '4720000', '210.00', ''],
      ['2024-01-15', 'Compra', '4100000', '', '1210.00'],
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantilla-diario.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadErrors = () => {
    if (validationErrors.length === 0) return;

    const csvContent = [
      ['Fila', 'Campo', 'Valor', 'Problema', 'Sugerencia'],
      ...validationErrors.map(e => [e.row, e.field, e.value, e.issue, e.suggestion || ''])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `errores-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Diario desde CSV</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="csv-file">Archivo CSV</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          {file && (
            <div className="flex gap-2">
              <Button onClick={handleParse} variant="secondary">Previsualizar</Button>
              <Button onClick={downloadTemplate} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />Plantilla
              </Button>
            </div>
          )}

          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold">Errores ({errors.length}):</div>
                <div className="text-xs max-h-24 overflow-y-auto">
                  {errors.slice(0, 5).map((e, i) => <div key={i}>{e}</div>)}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Advertencias ({validationErrors.length})</AlertTitle>
              <AlertDescription>
                <Button variant="outline" size="sm" onClick={downloadErrors}>
                  <Download className="h-4 w-4 mr-2" />Exportar
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {rows.length > 0 && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {grouped.map((g, idx) => {
                const tot = totals[idx];
                const hasInvalid = g.items.some(it => !validAccounts.has(it.account_code));
                return (
                  <Card key={idx} className={cn(!tot.balanced && "border-destructive")}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between text-sm">
                        <div>
                          <CardTitle className="text-sm">{g.entry_date}</CardTitle>
                          <CardDescription className="text-xs">{g.description}</CardDescription>
                        </div>
                        <div className="text-right">
                          <div>D: {tot.debit.toFixed(2)} | H: {tot.credit.toFixed(2)}</div>
                          {tot.balanced ? (
                            <span className="text-success text-xs">✓ Cuadrado</span>
                          ) : (
                            <span className="text-destructive text-xs">✗ Descuadre</span>
                          )}
                          {hasInvalid && <span className="text-warning text-xs ml-2">⚠</span>}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleImport} disabled={importing || rows.length === 0 || errors.length > 0 || hasUnbalanced}>
            {importing ? "Importando..." : `Importar ${grouped.length}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
