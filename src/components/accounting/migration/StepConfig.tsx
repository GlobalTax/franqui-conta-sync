import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useView } from "@/contexts/ViewContext";
import { supabase } from "@/integrations/supabase/client";
import type { FiscalYearConfig } from "@/hooks/useHistoricalMigration";

interface StepConfigProps {
  config: FiscalYearConfig;
  onConfigChange: (config: FiscalYearConfig) => void;
  onNext: () => void;
}

export function StepConfig({ config, onConfigChange, onNext }: StepConfigProps) {
  const { selectedView } = useView();
  const [checking, setChecking] = useState(false);
  const [validation, setValidation] = useState<{ valid: boolean; message?: string } | null>(null);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 1 - i);

  const handleYearChange = (year: string) => {
    const y = parseInt(year);
    onConfigChange({
      ...config,
      year: y,
      startDate: `${y}-01-01`,
      endDate: `${y}-12-31`,
    });
  };

  useEffect(() => {
    if (selectedView?.type === 'centre') {
      onConfigChange({
        ...config,
        centroCode: selectedView.id,
      });
    }
  }, [selectedView]);

  const handleValidate = async () => {
    if (!config.centroCode || !config.startDate || !config.endDate) {
      setValidation({ valid: false, message: "Completa todos los campos requeridos" });
      return;
    }

    setChecking(true);
    setValidation(null);

    try {
      // Check if fiscal year already exists
      const { data: existingFY, error: fyError } = await supabase
        .from('fiscal_years')
        .select('id, status')
        .eq('centro_code', config.centroCode)
        .eq('year', config.year)
        .maybeSingle();

      if (fyError) throw fyError;

      if (existingFY && existingFY.status === 'closed') {
        setValidation({ 
          valid: false, 
          message: `El ejercicio ${config.year} ya existe y está cerrado. No se puede re-importar.` 
        });
        setChecking(false);
        return;
      }

      // Check if there are existing entries in this period
      const { count, error: countError } = await supabase
        .from('accounting_entries')
        .select('*', { count: 'exact', head: true })
        .eq('centro_code', config.centroCode)
        .gte('entry_date', config.startDate)
        .lte('entry_date', config.endDate);

      if (countError) throw countError;

      if (count && count > 0) {
        setValidation({ 
          valid: false, 
          message: `Ya existen ${count} asientos contables en este período. Debes eliminarlos primero.` 
        });
        setChecking(false);
        return;
      }

      // Create or update fiscal year
      if (existingFY) {
        onConfigChange({ ...config, fiscalYearId: existingFY.id });
      } else {
        const { data: newFY, error: insertError } = await supabase
          .from('fiscal_years')
          .insert({
            centro_code: config.centroCode,
            year: config.year,
            start_date: config.startDate,
            end_date: config.endDate,
            status: 'open',
          })
          .select()
          .single();

        if (insertError) throw insertError;
        onConfigChange({ ...config, fiscalYearId: newFY.id });
      }

      setValidation({ valid: true, message: "Validación exitosa. Puedes continuar." });
    } catch (error) {
      console.error('Validation error:', error);
      setValidation({ valid: false, message: "Error al validar. Intenta de nuevo." });
    } finally {
      setChecking(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paso 1: Configuración del Ejercicio</CardTitle>
        <CardDescription>
          Define el ejercicio fiscal histórico que deseas importar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Ejercicio Fiscal</Label>
            <Select value={config.year.toString()} onValueChange={handleYearChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Centro</Label>
            <Input value={selectedView?.name || ''} disabled />
          </div>

          <div className="space-y-2">
            <Label>Fecha Inicio</Label>
            <Input 
              type="date" 
              value={config.startDate}
              onChange={e => onConfigChange({ ...config, startDate: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Fecha Fin</Label>
            <Input 
              type="date" 
              value={config.endDate}
              onChange={e => onConfigChange({ ...config, endDate: e.target.value })}
            />
          </div>
        </div>

        {validation && (
          <Alert variant={validation.valid ? "default" : "destructive"}>
            {validation.valid ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertDescription>{validation.message}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          <Button onClick={handleValidate} disabled={checking}>
            {checking ? "Validando..." : "Validar Configuración"}
          </Button>
          {validation?.valid && (
            <Button onClick={onNext}>
              Continuar →
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
