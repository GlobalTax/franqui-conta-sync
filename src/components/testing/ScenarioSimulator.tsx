import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useTestingMode } from "@/hooks/useTestingMode";
import { supabase } from "@/integrations/supabase/client";
import { Wand2, Loader2 } from "lucide-react";

export default function ScenarioSimulator() {
  const { toast } = useToast();
  const { addLog } = useTestingMode();
  const [selectedCentre, setSelectedCentre] = useState("DEMO-001");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [isSimulating, setIsSimulating] = useState(false);
  const [progress, setProgress] = useState(0);

  const simulateFullMonth = async () => {
    setIsSimulating(true);
    setProgress(0);

    try {
      addLog({
        level: 'info',
        category: 'Simulator',
        message: `Iniciando simulación de mes completo para ${selectedCentre}`,
      });

      const year = new Date().getFullYear();
      const daysInMonth = new Date(year, selectedMonth, 0).getDate();
      
      // Get fiscal year
      const { data: fiscalYear } = await supabase
        .from('fiscal_years')
        .select('id')
        .eq('centro_code', selectedCentre)
        .eq('year', year)
        .single();

      if (!fiscalYear) {
        throw new Error('No existe año fiscal para este centro');
      }

      // Simulate each day
      for (let day = 1; day <= daysInMonth; day++) {
        const date = `${year}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // Generate daily closure
        const dailySales = {
          sales_in_store: Math.random() * 3000 + 2000,
          sales_drive_thru: Math.random() * 2000 + 1000,
          sales_delivery: Math.random() * 1500 + 500,
          sales_kiosk: Math.random() * 1000 + 500,
        };

        const totalSales = Object.values(dailySales).reduce((a, b) => a + b, 0);
        const taxBase = totalSales / 1.21;
        const taxAmount = totalSales - taxBase;

        await supabase.from('daily_closures').insert({
          centro_code: selectedCentre,
          closure_date: date,
          ...dailySales,
          total_sales: totalSales,
          tax_21_base: taxBase,
          tax_21_amount: taxAmount,
          total_tax: taxAmount,
          cash_amount: totalSales * 0.3,
          card_amount: totalSales * 0.7,
          status: 'posted',
        });

        setProgress((day / daysInMonth) * 100);
      }

      // Generate monthly expenses (invoices)
      const monthlyExpenses = [
        { concept: 'Alquiler', account: '6210000', amount: 8000 },
        { concept: 'Electricidad', account: '6280000', amount: 1500 },
        { concept: 'Agua', account: '6280000', amount: 400 },
        { concept: 'Telefonía', account: '6290000', amount: 200 },
        { concept: 'Limpieza', account: '6220000', amount: 800 },
        { concept: 'Mantenimiento', account: '6220000', amount: 1200 },
      ];

      const { data: lastEntry } = await supabase
        .from('accounting_entries')
        .select('entry_number')
        .eq('centro_code', selectedCentre)
        .eq('fiscal_year_id', fiscalYear.id)
        .order('entry_number', { ascending: false })
        .limit(1)
        .single();

      let entryNumber = (lastEntry?.entry_number || 0) + 1;

      for (const expense of monthlyExpenses) {
        const entryDate = `${year}-${String(selectedMonth).padStart(2, '0')}-${Math.floor(Math.random() * 20 + 5).toString().padStart(2, '0')}`;
        
        const { data: entry } = await supabase
          .from('accounting_entries')
          .insert({
            centro_code: selectedCentre,
            fiscal_year_id: fiscalYear.id,
            entry_number: entryNumber++,
            entry_date: entryDate,
            description: `SIM - ${expense.concept}`,
            total_debit: expense.amount,
            total_credit: expense.amount,
            status: 'posted',
          })
          .select()
          .single();

        if (entry) {
          await supabase.from('accounting_transactions').insert([
            {
              entry_id: entry.id,
              line_number: 1,
              account_code: expense.account,
              movement_type: 'debit',
              amount: expense.amount,
              description: expense.concept,
            },
            {
              entry_id: entry.id,
              line_number: 2,
              account_code: '4100000',
              movement_type: 'credit',
              amount: expense.amount,
              description: `Proveedor - ${expense.concept}`,
            },
          ]);
        }
      }

      addLog({
        level: 'success',
        category: 'Simulator',
        message: `✅ Mes completo simulado: ${daysInMonth} días + ${monthlyExpenses.length} gastos`,
      });

      toast({
        title: "Simulación completada",
        description: `Se generaron ${daysInMonth} cierres diarios y ${monthlyExpenses.length} gastos mensuales`,
      });

    } catch (error: any) {
      addLog({
        level: 'error',
        category: 'Simulator',
        message: `❌ Error en simulación: ${error.message}`,
      });

      toast({
        title: "Error en simulación",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSimulating(false);
      setProgress(0);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-primary" />
          Simulador de Escenarios
        </CardTitle>
        <CardDescription>
          Genera datos realistas para un período completo con ventas, gastos y movimientos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Centro</Label>
            <Select value={selectedCentre} onValueChange={setSelectedCentre}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DEMO-001">DEMO-001 - Gran Vía</SelectItem>
                <SelectItem value="DEMO-002">DEMO-002 - Castellana</SelectItem>
                <SelectItem value="DEMO-003">DEMO-003 - Diagonal</SelectItem>
                <SelectItem value="DEMO-004">DEMO-004 - La Maquinista</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Mes</Label>
            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <SelectItem key={month} value={month.toString()}>
                    {new Date(2024, month - 1).toLocaleString('es', { month: 'long' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isSimulating && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Generando datos...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        <div className="space-y-2 p-4 bg-muted/30 rounded-lg text-sm">
          <h4 className="font-medium">Se generará:</h4>
          <ul className="text-muted-foreground space-y-1 ml-4">
            <li>• Cierres diarios con ventas por canal (sala, drive, delivery, kiosk)</li>
            <li>• IVA calculado automáticamente</li>
            <li>• Gastos mensuales recurrentes (alquiler, suministros, etc.)</li>
            <li>• Apuntes contables asociados</li>
            <li>• Datos marcados como "posted" para P&L</li>
          </ul>
        </div>

        <Button
          onClick={simulateFullMonth}
          disabled={isSimulating}
          className="w-full"
          size="lg"
        >
          {isSimulating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Simulando Mes Completo...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" />
              Simular Mes Completo
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
