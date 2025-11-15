import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { FiscalYearConfig } from "@/hooks/useHistoricalMigration";
import { supabase } from "@/integrations/supabase/client";
import { IVACSVValidator } from "@/components/accounting/IVACSVValidator";
import { createMigrationLogger } from "@/lib/migration/migrationLogger";

interface StepIVAProps {
  config: FiscalYearConfig;
  emitidasCompleted: boolean;
  emitidasCount: number;
  recibidasCompleted: boolean;
  recibidasCount: number;
  migrationRunId?: string;
  onEmitidasComplete: (count: number) => void;
  onRecibidasComplete: (count: number) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function StepIVA({ config, emitidasCompleted, emitidasCount, recibidasCompleted, recibidasCount, migrationRunId, onEmitidasComplete, onRecibidasComplete, onNext, onPrev }: StepIVAProps) {
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
            <AlertDescription>Emitidas: {emitidasCount} | Recibidas: {recibidasCount}</AlertDescription>
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
        <CardDescription>Importa facturas del ejercicio {config.year}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="emitidas">Emitidas {emitidasCompleted && <CheckCircle2 className="h-4 w-4 ml-2" />}</TabsTrigger>
            <TabsTrigger value="recibidas">Recibidas {recibidasCompleted && <CheckCircle2 className="h-4 w-4 ml-2" />}</TabsTrigger>
          </TabsList>
          <TabsContent value="emitidas">
            <IVAImportPanel 
              type="emitidas" 
              config={config} 
              completed={emitidasCompleted} 
              count={emitidasCount} 
              migrationRunId={migrationRunId}
              onComplete={onEmitidasComplete} 
            />
          </TabsContent>
          <TabsContent value="recibidas">
            <IVAImportPanel 
              type="recibidas" 
              config={config} 
              completed={recibidasCompleted} 
              count={recibidasCount} 
              migrationRunId={migrationRunId}
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
  migrationRunId?: string;
  onComplete: (count: number) => void;
}

function IVAImportPanel({ type, config, completed, count, migrationRunId, onComplete }: IVAImportPanelProps) {
  const [showValidator, setShowValidator] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleValidated = async (rows: any[]) => {
    setImporting(true);
    
    const logger = migrationRunId 
      ? createMigrationLogger(type === 'emitidas' ? 'iva_emitidas' : 'iva_recibidas', migrationRunId, config.centroCode, config.fiscalYearId)
      : null;

    try {
      await logger?.start(`Iniciando importación de facturas ${type}`, { totalFacturas: rows.length });

      const { data, error } = await supabase.functions.invoke('import-iva-historical', {
        body: { centroCode: config.centroCode, fiscalYear: config.year, type, rows }
      });
      
      if (error) {
        await logger?.error(`Error al importar facturas ${type}`, error.message);
        throw error;
      }

      await logger?.success(`Facturas ${type} importadas exitosamente`, {
        count: data.count,
        fiscalYear: config.year,
      });

      toast.success(`${data.count} facturas importadas`);
      onComplete(data.count);
    } catch (error: any) {
      await logger?.error(`Error en importación de IVA ${type}`, error);
      toast.error(error.message || 'Error al importar');
    } finally {
      setImporting(false);
    }
  };

  if (completed) {
    return (
      <Alert>
        <CheckCircle2 className="h-4 w-4" />
        <AlertTitle>Facturas {type} importadas</AlertTitle>
        <AlertDescription>{count} facturas</AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <Button onClick={() => setShowValidator(true)} disabled={importing} className="w-full">
        {importing ? "Importando..." : `Seleccionar CSV de ${type}`}
      </Button>
      <IVACSVValidator
        open={showValidator}
        onOpenChange={setShowValidator}
        type={type}
        onValidated={handleValidated}
        fiscalYearRange={{ startDate: `${config.year}-01-01`, endDate: `${config.year}-12-31` }}
      />
    </>
  );
}
