import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, Upload, AlertCircle } from "lucide-react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { FiscalYearConfig } from "@/hooks/useHistoricalMigration";

interface StepAperturaProps {
  config: FiscalYearConfig;
  completed: boolean;
  entryId?: string;
  onComplete: (entryId: string, date: string) => void;
  onNext: () => void;
  onPrev: () => void;
}

type AperturaRow = {
  cuenta: string;
  saldo_deudor?: string | number;
  saldo_acreedor?: string | number;
};

export function StepApertura({ config, completed, entryId, onComplete, onNext, onPrev }: StepAperturaProps) {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<AperturaRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      const f = acceptedFiles[0];
      if (f) {
        setFile(f);
        parseFile(f);
      }
    },
  });

  const parseFile = (f: File) => {
    setErrors([]);
    Papa.parse<AperturaRow>(f, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const data = result.data.filter(r => r.cuenta);
        setRows(data);
        toast.success(`${data.length} cuentas detectadas`);
      },
      error: (error) => {
        toast.error(`Error al parsear: ${error.message}`);
      },
    });
  };

  const handleImport = async () => {
    if (rows.length === 0) {
      toast.error("No hay datos para importar");
      return;
    }

    setImporting(true);
    setErrors([]);

    try {
      const transactions: any[] = [];
      let lineNumber = 1;

      for (const r of rows) {
        const deudor = parseFloat(r.saldo_deudor?.toString().replace(',', '.') || '0');
        const acreedor = parseFloat(r.saldo_acreedor?.toString().replace(',', '.') || '0');

        if (deudor > 0) {
          transactions.push({
            account_code: r.cuenta,
            movement_type: 'debit',
            amount: deudor,
            description: 'Saldo de apertura',
            line_number: lineNumber++,
          });
        }

        if (acreedor > 0) {
          transactions.push({
            account_code: r.cuenta,
            movement_type: 'credit',
            amount: acreedor,
            description: 'Saldo de apertura',
            line_number: lineNumber++,
          });
        }
      }

      const totalDebit = transactions
        .filter(t => t.movement_type === 'debit')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalCredit = transactions
        .filter(t => t.movement_type === 'credit')
        .reduce((sum, t) => sum + t.amount, 0);

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error(`Asiento descuadrado: Debe=${totalDebit.toFixed(2)} Haber=${totalCredit.toFixed(2)}`);
      }

      // Get next entry number
      const { data: nextNumber, error: numberError } = await supabase.rpc('get_next_entry_number', {
        p_centro_code: config.centroCode,
        p_company_id: null,
        p_ejercicio: config.year,
        p_serie: 'MIGRACION',
      });

      if (numberError) throw numberError;

      // Create opening entry
      const { data: entry, error: entryError } = await supabase
        .from('accounting_entries')
        .insert([{
          centro_code: config.centroCode,
          entry_date: config.startDate,
          entry_number: nextNumber,
          description: `Asiento de apertura - Ejercicio ${config.year}`,
          fiscal_year_id: config.fiscalYearId,
          status: 'posted',
          total_debit: totalDebit,
          total_credit: totalCredit,
          serie: 'MIGRACION',
        }])
        .select()
        .single();

      if (entryError) throw entryError;

      // Insert transactions
      const transactionsWithEntry = transactions.map(t => ({
        ...t,
        entry_id: entry.id,
      }));

      const { error: txError } = await supabase
        .from('accounting_transactions')
        .insert(transactionsWithEntry);

      if (txError) throw txError;

      toast.success(`✅ Asiento de apertura creado con ${transactions.length} líneas`);
      onComplete(entry.id, config.startDate);
    } catch (error: any) {
      console.error('Import error:', error);
      setErrors([error.message || 'Error desconocido']);
      toast.error(error.message || 'Error al importar');
    } finally {
      setImporting(false);
    }
  };

  if (completed && entryId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            Paso 2: Saldo de Apertura - Completado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Asiento de apertura creado</AlertTitle>
            <AlertDescription>
              ID: {entryId}
            </AlertDescription>
          </Alert>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onPrev}>← Atrás</Button>
            <Button onClick={onNext}>Continuar →</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paso 2: Saldo de Apertura</CardTitle>
        <CardDescription>
          Importa el balance de sumas y saldos del ejercicio anterior (CSV con columnas: cuenta, saldo_deudor, saldo_acreedor)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {file ? file.name : 'Arrastra un archivo CSV o haz clic para seleccionar'}
          </p>
        </div>

        {rows.length > 0 && (
          <Alert>
            <AlertDescription>
              {rows.length} cuentas cargadas. Total Debe: {rows.reduce((sum, r) => sum + parseFloat(r.saldo_deudor?.toString().replace(',', '.') || '0'), 0).toFixed(2)}€
              {' | '}
              Total Haber: {rows.reduce((sum, r) => sum + parseFloat(r.saldo_acreedor?.toString().replace(',', '.') || '0'), 0).toFixed(2)}€
            </AlertDescription>
          </Alert>
        )}

        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Errores detectados</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4 mt-2">
                {errors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={onPrev}>← Atrás</Button>
          <Button onClick={handleImport} disabled={rows.length === 0 || importing}>
            {importing ? "Importando..." : "Importar Apertura"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
