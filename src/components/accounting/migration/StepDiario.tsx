import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2 } from "lucide-react";
import { JournalCSVImporter } from "@/components/accounting/JournalCSVImporter";
import type { FiscalYearConfig } from "@/hooks/useHistoricalMigration";
import { createMigrationLogger } from "@/lib/migration/migrationLogger";

interface StepDiarioProps {
  config: FiscalYearConfig;
  completed: boolean;
  entriesCount: number;
  totalDebit?: number;
  totalCredit?: number;
  migrationRunId?: string;
  onComplete: (entriesCount: number, totalDebit: number, totalCredit: number) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function StepDiario({ 
  config, 
  completed, 
  entriesCount, 
  totalDebit, 
  totalCredit,
  migrationRunId,
  onComplete, 
  onNext, 
  onPrev 
}: StepDiarioProps) {
  const [showImporter, setShowImporter] = useState(false);

  const handleImportSuccess = async (count: number, debit: number, credit: number) => {
    const logger = migrationRunId 
      ? createMigrationLogger('diario', migrationRunId, config.centroCode, config.fiscalYearId)
      : null;
    
    await logger?.success(`Libro diario importado completamente`, {
      entriesCount: count,
      totalDebit: debit,
      totalCredit: credit,
    });
    
    onComplete(count, debit, credit);
    setShowImporter(false);
  };

  if (completed && entriesCount > 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            Paso 3: Libro Diario - Completado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Libro Diario importado</AlertTitle>
            <AlertDescription>
              {entriesCount} asientos contables creados
              {totalDebit && totalCredit && (
                <div className="mt-2 text-xs">
                  Total Debe: {totalDebit.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€ | 
                  Total Haber: {totalCredit.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€
                </div>
              )}
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
    <>
      <Card>
        <CardHeader>
          <CardTitle>Paso 3: Libro Diario</CardTitle>
          <CardDescription>
            Importa todos los asientos contables del ejercicio {config.year}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertDescription>
              El archivo CSV debe tener las columnas: entry_date, description, account_code, debit, credit, line_description
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Formato esperado:
            </p>
            <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`entry_date,description,account_code,debit,credit,line_description
${config.startDate},Asiento ejemplo,6000000,1000.00,0,Compras
${config.startDate},Asiento ejemplo,4700000,0,1000.00,Proveedor XYZ`}
            </pre>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onPrev}>← Atrás</Button>
            <Button onClick={() => setShowImporter(true)}>
              Abrir Importador
            </Button>
          </div>
        </CardContent>
      </Card>

      <JournalCSVImporter
        open={showImporter}
        onOpenChange={setShowImporter}
        centroCode={config.centroCode}
        onImportComplete={handleImportSuccess}
        fiscalYearRange={{
          startDate: `${config.year}-01-01`,
          endDate: `${config.year}-12-31`
        }}
      />
    </>
  );
}
