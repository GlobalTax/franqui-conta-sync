import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTestingMode } from "@/hooks/useTestingMode";
import { supabase } from "@/integrations/supabase/client";
import { 
  Play, 
  RotateCcw, 
  FileText, 
  DollarSign, 
  Building2,
  Calendar,
  Database,
  Loader2
} from "lucide-react";
import { logger } from "@/lib/logger";

export default function SandboxPanel() {
  const { toast } = useToast();
  const { addLog, startOperation, endOperation } = useTestingMode();
  const [selectedCentre, setSelectedCentre] = useState("DEMO-001");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isExecuting, setIsExecuting] = useState(false);

  const executeOperation = async (
    operationId: string,
    operationName: string,
    fn: () => Promise<any>
  ) => {
    setIsExecuting(true);
    startOperation(operationId);
    
    addLog({
      level: 'info',
      category: 'Sandbox',
      message: `Iniciando: ${operationName}`,
    });

    try {
      const result = await fn();
      
      addLog({
        level: 'success',
        category: 'Sandbox',
        message: `✅ ${operationName} completado`,
        details: result,
      });

      toast({
        title: "Operación exitosa",
        description: operationName,
      });

      return result;
    } catch (error: any) {
      logger.error('SandboxPanel', `❌ Error en ${operationName}:`, error);
      
      addLog({
        level: 'error',
        category: 'Sandbox',
        message: `❌ Error en ${operationName}`,
        details: { error: error.message, code: error.code },
      });

      toast({
        title: "Error en operación",
        description: error.message,
        variant: "destructive",
      });
      
      throw error;
    } finally {
      endOperation(operationId);
      setIsExecuting(false);
    }
  };

  const generateDailyClosure = async () => {
    await executeOperation(
      'daily-closure',
      'Generar Cierre Diario',
      async () => {
        const salesInStore = Math.random() * 5000 + 2000;
        const salesDriveThru = Math.random() * 3000 + 1000;
        const salesDelivery = Math.random() * 2000 + 500;
        const salesKiosk = Math.random() * 1500 + 500;
        
        const totalSales = salesInStore + salesDriveThru + salesDelivery + salesKiosk;
        const tax21Base = totalSales / 1.21;
        const tax21Amount = totalSales - tax21Base;

        const salesData = {
          centro_code: selectedCentre,
          closure_date: selectedDate,
          sales_in_store: salesInStore,
          sales_drive_thru: salesDriveThru,
          sales_delivery: salesDelivery,
          sales_kiosk: salesKiosk,
          total_sales: totalSales,
          tax_21_base: tax21Base,
          tax_21_amount: tax21Amount,
          total_tax: tax21Amount,
          cash_amount: Math.random() * 3000 + 1000,
          card_amount: Math.random() * 6000 + 3000,
          status: 'draft',
        };

        const { data, error } = await supabase
          .from('daily_closures')
          .insert(salesData)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    );
  };

  const generateInvoice = async () => {
    await executeOperation(
      'generate-invoice',
      'Generar Factura de Prueba',
      async () => {
        // Simular generación de factura
        return {
          invoice_number: `TEST-${Date.now()}`,
          amount: Math.random() * 1000 + 100,
          date: selectedDate,
        };
      }
    );
  };

  const generateAccountingEntry = async () => {
    await executeOperation(
      'accounting-entry',
      'Generar Apunte Contable',
      async () => {
        const amount = Math.random() * 5000 + 1000;
        
        const { data: fiscalYear } = await supabase
          .from('fiscal_years')
          .select('id')
          .eq('centro_code', selectedCentre)
          .eq('year', new Date(selectedDate).getFullYear())
          .single();

        if (!fiscalYear) {
          throw new Error('No existe año fiscal para este centro');
        }

        // Get next entry number
        const { data: lastEntry } = await supabase
          .from('accounting_entries')
          .select('entry_number')
          .eq('centro_code', selectedCentre)
          .eq('fiscal_year_id', fiscalYear.id)
          .order('entry_number', { ascending: false })
          .limit(1)
          .single();

        const nextNumber = (lastEntry?.entry_number || 0) + 1;

        // Create entry
        const { data: entry, error: entryError } = await supabase
          .from('accounting_entries')
          .insert({
            centro_code: selectedCentre,
            fiscal_year_id: fiscalYear.id,
            entry_number: nextNumber,
            entry_date: selectedDate,
            description: `Prueba Sandbox - ${new Date().toLocaleString()}`,
            total_debit: amount,
            total_credit: amount,
            status: 'draft',
          })
          .select()
          .single();

        if (entryError) throw entryError;

        // Create transactions
        const { error: txError } = await supabase
          .from('accounting_transactions')
          .insert([
            {
              entry_id: entry.id,
              line_number: 1,
              account_code: '5700000',
              movement_type: 'debit',
              amount: amount,
              description: 'Caja EUR - TEST',
            },
            {
              entry_id: entry.id,
              line_number: 2,
              account_code: '7050000',
              movement_type: 'credit',
              amount: amount,
              description: 'Ventas - TEST',
            },
          ]);

        if (txError) throw txError;
        return entry;
      }
    );
  };

  const simulateBankMovement = async () => {
    await executeOperation(
      'bank-movement',
      'Simular Movimiento Bancario',
      async () => {
        const { data: bankAccount } = await supabase
          .from('bank_accounts')
          .select('id')
          .eq('centro_code', selectedCentre)
          .limit(1)
          .single();

        if (!bankAccount) {
          throw new Error('No hay cuentas bancarias para este centro');
        }

        const { data, error } = await supabase
          .from('bank_transactions')
          .insert({
            bank_account_id: bankAccount.id,
            transaction_date: selectedDate,
            amount: (Math.random() - 0.5) * 5000,
            description: `TEST - Movimiento sandbox ${Date.now()}`,
            status: 'pending',
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    );
  };

  const rollbackLastOperations = async () => {
    await executeOperation(
      'rollback',
      'Rollback Últimas Operaciones de TEST',
      async () => {
        // Delete test accounting entries
        const { error: entriesError } = await supabase
          .from('accounting_entries')
          .delete()
          .eq('centro_code', selectedCentre)
          .like('description', '%Prueba Sandbox%');

        // Delete test bank transactions
        const { error: bankError } = await supabase
          .from('bank_transactions')
          .delete()
          .like('description', 'TEST -%');

        // Delete draft closures from today
        const { error: closuresError } = await supabase
          .from('daily_closures')
          .delete()
          .eq('centro_code', selectedCentre)
          .eq('status', 'draft')
          .gte('closure_date', selectedDate);

        if (entriesError || bankError || closuresError) {
          throw new Error('Error en rollback');
        }

        return { message: 'Operaciones de prueba eliminadas' };
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5 text-primary" />
          Sandbox - Panel de Pruebas
        </CardTitle>
        <CardDescription>
          Ejecuta operaciones de prueba y simula escenarios reales
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuración */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
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
            <Label>Fecha</Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>

        {/* Operaciones */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={generateDailyClosure}
            disabled={isExecuting}
            className="h-auto py-4 flex-col items-start gap-2"
            variant="outline"
          >
            <Calendar className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Cierre Diario</div>
              <div className="text-xs text-muted-foreground">Genera ventas del día</div>
            </div>
          </Button>

          <Button
            onClick={generateInvoice}
            disabled={isExecuting}
            className="h-auto py-4 flex-col items-start gap-2"
            variant="outline"
          >
            <FileText className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Factura</div>
              <div className="text-xs text-muted-foreground">Crea factura de prueba</div>
            </div>
          </Button>

          <Button
            onClick={generateAccountingEntry}
            disabled={isExecuting}
            className="h-auto py-4 flex-col items-start gap-2"
            variant="outline"
          >
            <DollarSign className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Apunte Contable</div>
              <div className="text-xs text-muted-foreground">Genera asiento</div>
            </div>
          </Button>

          <Button
            onClick={simulateBankMovement}
            disabled={isExecuting}
            className="h-auto py-4 flex-col items-start gap-2"
            variant="outline"
          >
            <Building2 className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Mov. Bancario</div>
              <div className="text-xs text-muted-foreground">Simula transacción</div>
            </div>
          </Button>
        </div>

        {/* Rollback */}
        <div className="pt-4 border-t">
          <Button
            onClick={rollbackLastOperations}
            disabled={isExecuting}
            variant="destructive"
            className="w-full"
          >
            {isExecuting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="mr-2 h-4 w-4" />
            )}
            Rollback - Eliminar Pruebas
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
