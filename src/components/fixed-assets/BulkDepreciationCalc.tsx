import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calculator, AlertCircle, CheckCircle2 } from "lucide-react";
import { useCalculateMonthlyDepreciations, usePostDepreciationEntries } from "@/hooks/useDepreciationPosting";
import { useView } from "@/contexts/ViewContext";
import { supabase } from "@/integrations/supabase/client";

export function BulkDepreciationCalc() {
  const { selectedView } = useView();
  const centroCode = selectedView?.type === 'centre' ? selectedView.id : undefined;
  
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [calculationDone, setCalculationDone] = useState(false);

  const calculateMutation = useCalculateMonthlyDepreciations();
  const postMutation = usePostDepreciationEntries();

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);
  const months = [
    { value: 1, label: "Enero" },
    { value: 2, label: "Febrero" },
    { value: 3, label: "Marzo" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Mayo" },
    { value: 6, label: "Junio" },
    { value: 7, label: "Julio" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Septiembre" },
    { value: 10, label: "Octubre" },
    { value: 11, label: "Noviembre" },
    { value: 12, label: "Diciembre" },
  ];

  const handleCalculate = async () => {
    if (!centroCode) return;

    await calculateMutation.mutateAsync({
      centroCode,
      year: selectedYear,
      month: selectedMonth,
    });

    setCalculationDone(true);
  };

  const handlePost = async () => {
    if (!centroCode) return;

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    await postMutation.mutateAsync({
      centroCode,
      year: selectedYear,
      month: selectedMonth,
      userId: user.user.id,
    });

    setCalculationDone(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Cálculo mensual de amortizaciones
        </CardTitle>
        <CardDescription>
          Calcula automáticamente las amortizaciones de todos los activos activos del mes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Selección de periodo */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="year">Año</Label>
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => {
                setSelectedYear(parseInt(value));
                setCalculationDone(false);
              }}
            >
              <SelectTrigger id="year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="month">Mes</Label>
            <Select
              value={selectedMonth.toString()}
              onValueChange={(value) => {
                setSelectedMonth(parseInt(value));
                setCalculationDone(false);
              }}
            >
              <SelectTrigger id="month">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value.toString()}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Información */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Proceso en 2 pasos</AlertTitle>
          <AlertDescription>
            1. <strong>Calcular</strong>: Genera los registros de amortización del mes<br />
            2. <strong>Contabilizar</strong>: Crea el asiento contable automático (681/281)
          </AlertDescription>
        </Alert>

        {/* Resultado cálculo */}
        {calculationDone && (
          <Alert variant="default" className="bg-success/10 border-success">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <AlertTitle className="text-success">Cálculo completado</AlertTitle>
            <AlertDescription>
              Las amortizaciones han sido calculadas. Ahora puedes generar el asiento contable.
            </AlertDescription>
          </Alert>
        )}

        {/* Acciones */}
        <div className="flex gap-3">
          <Button
            onClick={handleCalculate}
            disabled={!centroCode || calculateMutation.isPending}
            className="flex-1"
          >
            {calculateMutation.isPending ? "Calculando..." : "1. Calcular amortizaciones"}
          </Button>

          <Button
            onClick={handlePost}
            disabled={!calculationDone || postMutation.isPending}
            variant="default"
            className="flex-1"
          >
            {postMutation.isPending ? "Contabilizando..." : "2. Generar asiento contable"}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          * El asiento se generará con las cuentas 681 (Amortización del inmovilizado) y 281 (Amortización acumulada)
        </p>
      </CardContent>
    </Card>
  );
}
