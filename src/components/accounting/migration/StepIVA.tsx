import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Upload, AlertCircle } from "lucide-react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { FiscalYearConfig } from "@/hooks/useHistoricalMigration";

interface StepIVAProps {
  config: FiscalYearConfig;
  emitidasCompleted: boolean;
  emitidasCount: number;
  recibidasCompleted: boolean;
  recibidasCount: number;
  onEmitidasComplete: (count: number) => void;
  onRecibidasComplete: (count: number) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function StepIVA({ 
  config, 
  emitidasCompleted, 
  emitidasCount, 
  recibidasCompleted, 
  recibidasCount,
  onEmitidasComplete, 
  onRecibidasComplete, 
  onNext, 
  onPrev 
}: StepIVAProps) {
  const [activeTab, setActiveTab] = useState<'emitidas' | 'recibidas'>('emitidas');

  const allCompleted = emitidasCompleted && recibidasCompleted;

  if (allCompleted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            Paso 4: Libros IVA - Completado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Libros IVA importados</AlertTitle>
            <AlertDescription>
              Facturas emitidas: {emitidasCount} | Facturas recibidas: {recibidasCount}
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
        <CardTitle>Paso 4: Libros IVA</CardTitle>
        <CardDescription>
          Importa las facturas emitidas y recibidas del ejercicio {config.year}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="emitidas" className="flex items-center gap-2">
              Facturas Emitidas
              {emitidasCompleted && <CheckCircle2 className="h-4 w-4 text-success" />}
            </TabsTrigger>
            <TabsTrigger value="recibidas" className="flex items-center gap-2">
              Facturas Recibidas
              {recibidasCompleted && <CheckCircle2 className="h-4 w-4 text-success" />}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="emitidas" className="space-y-4">
            <IVAImportPanel
              type="emitidas"
              config={config}
              completed={emitidasCompleted}
              count={emitidasCount}
              onComplete={onEmitidasComplete}
            />
          </TabsContent>

          <TabsContent value="recibidas" className="space-y-4">
            <IVAImportPanel
              type="recibidas"
              config={config}
              completed={recibidasCompleted}
              count={recibidasCount}
              onComplete={onRecibidasComplete}
            />
          </TabsContent>
        </Tabs>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onPrev}>← Atrás</Button>
          {allCompleted && <Button onClick={onNext}>Continuar →</Button>}
        </div>
      </CardContent>
    </Card>
  );
}

interface IVAImportPanelProps {
  type: 'emitidas' | 'recibidas';
  config: FiscalYearConfig;
  completed: boolean;
  count: number;
  onComplete: (count: number) => void;
}

function IVAImportPanel({ type, config, completed, count, onComplete }: IVAImportPanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      const f = acceptedFiles[0];
      if (f) {
        setFile(f);
        Papa.parse(f, {
          header: true,
          skipEmptyLines: true,
          complete: (result) => {
            setRows(result.data);
            toast.success(`${result.data.length} facturas detectadas`);
          },
        });
      }
    },
  });

  const handleImport = async () => {
    if (rows.length === 0) return;

    setImporting(true);
    try {
      // Call the import-iva-historical edge function
      const { data, error } = await supabase.functions.invoke('import-iva-historical', {
        body: {
          centroCode: config.centroCode,
          fiscalYear: config.year,
          invoiceType: type,
          rows: rows.map((r: any) => ({
            fecha: r.fecha || r.date || '',
            numero: r.numero || r.number || '',
            nif: r.nif || r.tax_id || '',
            nombre: r.nombre || r.name || '',
            base: parseFloat(r.base || r.subtotal || '0'),
            tipo: parseFloat(r.tipo || r.tax_rate || '0'),
            cuota: parseFloat(r.cuota || r.tax_amount || '0'),
            total: parseFloat(r.total || r.total_amount || '0'),
          })),
        },
      });

      if (error) throw error;

      if (data.success) {
        onComplete(data.count);
        toast.success(
          `${data.count} facturas importadas\nBase: ${data.total_base.toFixed(2)}€ | IVA: ${data.total_cuota.toFixed(2)}€`
        );
        
        if (data.errors && data.errors.length > 0) {
          toast.warning(`${data.errors.length} advertencias detectadas`, {
            description: 'Revisa la consola para más detalles',
          });
          console.warn('Import warnings:', data.errors);
        }
      } else {
        throw new Error(data.message || 'Error en la importación');
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al importar IVA');
      console.error('IVA import error:', error);
    } finally {
      setImporting(false);
    }
  };

  if (completed) {
    return (
      <Alert>
        <CheckCircle2 className="h-4 w-4" />
        <AlertTitle>Importación completada</AlertTitle>
        <AlertDescription>{count} facturas {type} importadas</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {file ? file.name : `Arrastra el CSV de facturas ${type}`}
        </p>
      </div>

      {rows.length > 0 && (
        <Button onClick={handleImport} disabled={importing}>
          {importing ? "Importando..." : `Importar ${rows.length} facturas`}
        </Button>
      )}
    </div>
  );
}
