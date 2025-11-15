import { ArrowLeft, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountingEntryForm } from "@/components/accounting/AccountingEntryForm";
import { useCreateAccountingEntry } from "@/hooks/useAccountingEntries";
import { useOrganization } from "@/hooks/useOrganization";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { RestaurantFilter } from "@/components/RestaurantFilter";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { EntryTemplateSelector } from "@/components/accounting/EntryTemplateSelector";
import { EntryTemplateWithLines } from "@/types/entry-templates";
import { useFiscalYears } from "@/hooks/useFiscalYears";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function NewAccountingEntry() {
  const navigate = useNavigate();
  const { currentMembership } = useOrganization();
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>(
    currentMembership?.restaurant?.codigo || ""
  );
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [initialFormData, setInitialFormData] = useState<any>(null);
  const createEntry = useCreateAccountingEntry();
  const { data: fiscalYears } = useFiscalYears(selectedRestaurant || undefined);
  
  const hasOpenFiscalYear = fiscalYears?.some(fy => fy.status === 'open');

  const handleTemplateSelect = (template: EntryTemplateWithLines, amounts: Record<string, number>) => {
    const evaluateFormula = (formula: string | null): number => {
      if (!formula) return 0;
      
      try {
        // Replace formula variables with actual amounts
        let expression = formula;
        Object.entries(amounts).forEach(([key, value]) => {
          expression = expression.replace(new RegExp(key, 'g'), value.toString());
        });
        
        // Evaluate the expression safely
        return Function(`'use strict'; return (${expression})`)();
      } catch (e) {
        console.error('Error evaluating formula:', formula, e);
        return 0;
      }
    };

    const transactions = template.entry_template_lines.map(line => ({
      account_code: line.account_code,
      movement_type: line.movement_type,
      amount: evaluateFormula(line.amount_formula),
      description: line.description || '',
    }));

    setInitialFormData({
      entry_date: new Date().toISOString().split('T')[0],
      description: template.name,
      transactions,
    });
  };

  const handleSubmit = async (formData: any) => {
    if (!selectedRestaurant) {
      return;
    }

    await createEntry.mutateAsync({
      centroCode: selectedRestaurant,
      formData,
    });

    navigate("/contabilidad/apuntes");
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/contabilidad/apuntes")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Nuevo Asiento Contable</h1>
            <p className="text-muted-foreground">
              Crea un nuevo asiento con apuntes debe y haber
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => setTemplateDialogOpen(true)}
          disabled={!selectedRestaurant}
        >
          <FileText className="mr-2 h-4 w-4" />
          Usar Plantilla
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-6 max-w-xs">
            <Label>Centro</Label>
            <RestaurantFilter
              value={selectedRestaurant}
              onChange={setSelectedRestaurant}
            />
          </div>

          {selectedRestaurant ? (
            <>
              {!hasOpenFiscalYear && (
                <Alert className="mb-6 border-amber-500/50 bg-amber-50 dark:bg-amber-950">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <AlertTitle className="text-amber-900 dark:text-amber-100">
                    No hay ejercicio fiscal abierto
                  </AlertTitle>
                  <AlertDescription className="text-amber-800 dark:text-amber-200">
                    Para crear asientos contables, primero debes{' '}
                    <Link 
                      to="/contabilidad/ejercicios-fiscales" 
                      className="underline font-semibold hover:text-amber-900 dark:hover:text-amber-100"
                    >
                      crear un ejercicio fiscal
                    </Link>{' '}
                    para este centro.
                  </AlertDescription>
                </Alert>
              )}
              <AccountingEntryForm
                onSubmit={handleSubmit}
                isLoading={createEntry.isPending}
                organizationId={currentMembership?.organization?.id}
                initialData={initialFormData}
              />
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Selecciona un centro para comenzar
            </div>
          )}
        </CardContent>
      </Card>

      <EntryTemplateSelector
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        onSelectTemplate={handleTemplateSelect}
      />
    </div>
  );
}
