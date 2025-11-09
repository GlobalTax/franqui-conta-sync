import { useMemo, useState } from "react";
import Papa from "papaparse";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle, Download } from "lucide-react";
import { useCreateAccountingEntry } from "@/hooks/useAccountingEntries";
import { toast } from "sonner";
import type { NewAccountingEntryFormData, MovementType } from "@/types/accounting-entries";

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
}

export function JournalCSVImporter({ open, onOpenChange, centroCode }: JournalCSVImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const createEntry = useCreateAccountingEntry();

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

  const handleParse = () => {
    if (!file) return;
    setErrors([]);
    
    Papa.parse<ParsedRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
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
            errs.push(`Fila ${i + 1}: faltan campos obligatorios (entry_date, account_code).`);
            continue;
          }
          
          if (!/^\d{4}-\d{2}-\d{2}$/.test(r.entry_date)) {
            errs.push(`Fila ${i + 1}: fecha debe estar en formato YYYY-MM-DD (ej: 2025-01-15).`);
          }
          
          if (!/^\d{7}$/.test(r.account_code)) {
            errs.push(`Fila ${i + 1}: account_code debe tener 7 dígitos (ej: 6000000).`);
          }
          
          const debit = parseFloat(r.debit?.toString().replace(',', '.') || '0');
          const credit = parseFloat(r.credit?.toString().replace(',', '.') || '0');
          
          if (isNaN(debit) || isNaN(credit)) {
            errs.push(`Fila ${i + 1}: importes deben ser números válidos.`);
            continue;
          }
          
          if (debit > 0 && credit > 0) {
            errs.push(`Fila ${i + 1}: no puede tener importe en Debe y Haber simultáneamente.`);
          }
          
          if (debit === 0 && credit === 0) {
            errs.push(`Fila ${i + 1}: Debe o Haber debe ser > 0.`);
          }
          
          if (debit < 0 || credit < 0) {
            errs.push(`Fila ${i + 1}: los importes no pueden ser negativos.`);
          }
        }
        
        setRows(data);
        setErrors(errs);
        
        if (errs.length === 0) {
          toast.success(`Importadas ${data.length} líneas. Revisa el balance antes de cargar.`);
        } else {
          toast.error(`Se encontraron ${errs.length} errores de validación.`);
        }
      },
      error: (error) => {
        toast.error(`Error al leer CSV: ${error.message}`);
      },
    });
  };

  const handleImport = async () => {
    if (rows.length === 0) return;
    if (hasUnbalanced) {
      toast.error("Hay asientos desbalanceados. Corrige antes de importar.");
      return;
    }
    
    if (!centroCode) {
      toast.error("No se ha seleccionado un centro de coste.");
      return;
    }
    
    setImporting(true);
    
    const results = {
      success: [] as string[],
      failed: [] as { entry: string; error: string }[],
    };
    
    try {
      for (const group of grouped) {
        try {
          const formData: NewAccountingEntryFormData = {
            entry_date: group.entry_date,
            description: group.description || `Importación CSV ${new Date().toISOString().split('T')[0]}`,
            transactions: group.items.map((it) => {
              const debit = parseFloat(it.debit?.toString().replace(',', '.') || '0');
              const credit = parseFloat(it.credit?.toString().replace(',', '.') || '0');
              return {
                account_code: it.account_code,
                movement_type: (debit > 0 ? "debit" : "credit") as MovementType,
                amount: debit > 0 ? debit : credit,
                description: it.line_description || "",
              };
            }),
          };

          await createEntry.mutateAsync({ centroCode, formData });
          results.success.push(`${group.entry_date} - ${group.description}`);
        } catch (e: any) {
          results.failed.push({
            entry: `${group.entry_date} - ${group.description}`,
            error: e.message,
          });
        }
      }
      
      if (results.failed.length > 0) {
        toast.error(
          `${results.success.length} asientos creados, ${results.failed.length} fallaron. Revisa la consola para detalles.`,
          { duration: 5000 }
        );
        console.error("Asientos fallidos:", results.failed);
      } else {
        toast.success(`Importación finalizada: ${results.success.length} asientos creados.`);
        onOpenChange(false);
        setFile(null);
        setRows([]);
      }
    } catch (e: any) {
      toast.error(`Error importando: ${e.message}`);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template = `entry_date,description,account_code,debit,credit,line_description
2025-01-15,Compra mercancía,6000000,1000,,Factura PR001
2025-01-15,Compra mercancía,4720001,,1000,IVA soportado 21%
2025-01-16,Venta producto,7000000,,500,Factura VE001
2025-01-16,Venta producto,4300000,500,,Cliente ABC`;

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'plantilla_libro_diario.csv';
    link.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Libro Diario (CSV)</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Archivo CSV</Label>
            <Input 
              type="file" 
              accept=".csv,text/csv" 
              onChange={(e) => setFile(e.target.files?.[0] || null)} 
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Columnas: entry_date, account_code, debit, credit. Opcionales: description, line_description.
              </p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={downloadTemplate}
                className="text-xs"
              >
                <Download className="h-3 w-3 mr-1" />
                Descargar plantilla
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleParse} disabled={!file}>
                Previsualizar
              </Button>
            </div>
          </div>

          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
                </ul>
                {errors.length > 10 && (
                  <div className="text-xs mt-1">+{errors.length - 10} errores más…</div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {rows.length > 0 && (
            <div className="border rounded-lg p-3 bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-muted-foreground">
                  {grouped.length} asientos • {rows.length} líneas
                </div>
                <div className="text-xs">
                  {hasUnbalanced ? (
                    <span className="text-destructive inline-flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Asientos desbalanceados
                    </span>
                  ) : (
                    <span className="text-green-600 inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Todos balanceados
                    </span>
                  )}
                </div>
              </div>
              
              <div className="max-h-64 overflow-auto text-xs space-y-2">
                {grouped.slice(0, 10).map((g, idx) => {
                  const t = totals[idx];
                  return (
                    <div key={idx} className="border-t py-2 first:border-t-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <strong>{g.entry_date}</strong> • {g.description || 'SIN DESCRIPCIÓN'}
                        </div>
                        <div className={`font-mono ${t.balanced ? 'text-green-600' : 'text-destructive'}`}>
                          D:{t.debit.toFixed(2)} H:{t.credit.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-muted-foreground ml-4 mt-1">
                        {g.items.length} líneas
                      </div>
                    </div>
                  );
                })}
                {grouped.length > 10 && (
                  <div className="text-center text-muted-foreground py-2">
                    … y {grouped.length - 10} asientos más
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
            Cancelar
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={rows.length === 0 || importing || hasUnbalanced || errors.length > 0}
          >
            {importing ? "Importando..." : `Importar ${grouped.length} asientos`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
