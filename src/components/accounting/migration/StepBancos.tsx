import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, Upload, AlertCircle } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import type { FiscalYearConfig } from "@/hooks/useHistoricalMigration";
import { Norma43Parser } from "@/domain/banking/services/Norma43Parser";
import type { Norma43ParseResult } from "@/domain/banking/services/Norma43Parser";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface StepBancosProps {
  config: FiscalYearConfig;
  completed: boolean;
  movements: number;
  skipped: boolean;
  onComplete: (movements: number) => void;
  onSkip: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export function StepBancos({ 
  config, 
  completed, 
  movements, 
  skipped,
  onComplete, 
  onSkip, 
  onNext, 
  onPrev 
}: StepBancosProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [preview, setPreview] = useState<Norma43ParseResult | null>(null);
  const [importing, setImporting] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'text/plain': ['.43', '.txt'] },
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      const f = acceptedFiles[0];
      if (f) {
        setFile(f);
        const content = await f.text();
        setFileContent(content);
        
        // Validate and preview
        if (!Norma43Parser.isValidFormat(content)) {
          toast.error('El archivo no parece ser Norma 43 válido');
          setPreview(null);
          return;
        }

        const parseResult = Norma43Parser.parse(content);
        if (parseResult.errors.length > 0) {
          toast.warning(`Archivo parseado con ${parseResult.errors.length} advertencias`);
        } else {
          toast.success(`${parseResult.transactions.length} movimientos encontrados`);
        }
        setPreview(parseResult);
      }
    },
  });

  const handleImport = async () => {
    if (!file || !preview || !fileContent) return;
    
    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('import-norma43-migration', {
        body: {
          centroCode: config.centroCode,
          fiscalYearId: config.fiscalYearId,
          fiscalYearStart: config.startDate,
          fiscalYearEnd: config.endDate,
          fileContent: fileContent,
        }
      });
      
      if (error) throw error;
      
      if (!data.success) {
        toast.error(data.error || 'Error al importar movimientos');
        return;
      }
      
      toast.success(
        `✅ ${data.movements_imported} movimientos importados\n` +
        `Cuenta: ${data.account_number}\n` +
        `Ingresos: ${data.total_credits.toFixed(2)}€ | Gastos: ${data.total_debits.toFixed(2)}€`
      );
      
      onComplete(data.movements_imported);
      setFile(null);
      setFileContent(null);
      setPreview(null);
    } catch (error: any) {
      console.error('Error importing Norma 43:', error);
      toast.error(`Error al importar: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  if (completed || skipped) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            Paso 5: Movimientos Bancarios - {skipped ? 'Omitido' : 'Completado'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!skipped && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Movimientos bancarios importados</AlertTitle>
              <AlertDescription>{movements} movimientos</AlertDescription>
            </Alert>
          )}
          {skipped && (
            <Alert>
              <AlertDescription>
                Este paso fue omitido. Puedes importar movimientos bancarios más tarde.
              </AlertDescription>
            </Alert>
          )}
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
        <CardTitle>Paso 5: Movimientos Bancarios (Opcional)</CardTitle>
        <CardDescription>
          Importa los extractos bancarios en formato Norma 43 del ejercicio {config.year}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertDescription>
            Este paso es opcional. Los movimientos bancarios pueden importarse más tarde desde la sección de Tesorería.
          </AlertDescription>
        </Alert>

        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
            isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          )}
        >
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {file ? file.name : 'Arrastra un archivo Norma 43 (.43, .txt)'}
          </p>
        </div>

        {preview && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Preview - Extracto Bancario</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {preview.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Advertencias de formato</AlertTitle>
                  <AlertDescription className="text-xs max-h-24 overflow-y-auto">
                    {preview.errors.slice(0, 3).map((err, i) => (
                      <div key={i}>{err}</div>
                    ))}
                    {preview.errors.length > 3 && <div>... y {preview.errors.length - 3} más</div>}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Cuenta</div>
                  <div className="font-mono text-xs">
                    {preview.header.bankCode}-{preview.header.officeCode}-{preview.header.accountNumber}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Período</div>
                  <div className="text-xs">
                    {preview.header.startDate} - {preview.header.endDate}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Movimientos</div>
                  <div className="font-semibold">{preview.summary.transactionsCount}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Saldo inicial</div>
                  <div className="font-semibold">{preview.header.initialBalance.toFixed(2)} €</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Saldo final</div>
                  <div className="font-semibold">{preview.header.finalBalance.toFixed(2)} €</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Diferencia</div>
                  <div className={cn(
                    "font-semibold",
                    (preview.header.finalBalance - preview.header.initialBalance) >= 0 
                      ? "text-success" 
                      : "text-destructive"
                  )}>
                    {(preview.header.finalBalance - preview.header.initialBalance).toFixed(2)} €
                  </div>
                </div>
              </div>

              <div className="space-y-1 max-h-48 overflow-y-auto">
                <div className="text-xs font-semibold grid grid-cols-4 gap-2 pb-2 border-b sticky top-0 bg-background">
                  <span>Fecha</span>
                  <span className="col-span-2">Concepto</span>
                  <span className="text-right">Importe</span>
                </div>
                {preview.transactions.slice(0, 10).map((tx, idx) => (
                  <div key={idx} className="text-xs grid grid-cols-4 gap-2 py-1 border-b">
                    <span>{tx.transactionDate}</span>
                    <span className="col-span-2 truncate">
                      {tx.description || tx.commonConcept || tx.ownConcept}
                    </span>
                    <span className={cn(
                      "text-right font-mono",
                      tx.amount >= 0 ? "text-success" : "text-destructive"
                    )}>
                      {tx.amount.toFixed(2)} €
                    </span>
                  </div>
                ))}
                {preview.transactions.length > 10 && (
                  <div className="text-xs text-muted-foreground text-center py-2">
                    ... y {preview.transactions.length - 10} movimientos más
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={onPrev}>← Atrás</Button>
          <Button variant="outline" onClick={handleSkip}>
            Omitir este paso →
          </Button>
          {preview && (
            <Button onClick={handleImport} disabled={importing || preview.errors.length > 0}>
              {importing ? "Importando..." : `Importar ${preview.transactions.length} movimientos`}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
