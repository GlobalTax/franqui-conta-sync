import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, Check, X, Lightbulb, Loader2 } from 'lucide-react';
import { useAnalyzePatterns, type RuleSuggestion } from '@/hooks/useReconciliationAssistant';
import { useCreateReconciliationRule } from '@/hooks/useReconciliationRules';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface ReconciliationAssistantProps {
  centroCode?: string;
  bankAccountId?: string;
}

export function ReconciliationAssistant({ centroCode, bankAccountId }: ReconciliationAssistantProps) {
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
  
  const { data, isLoading, refetch } = useAnalyzePatterns(centroCode, bankAccountId);
  const createRule = useCreateReconciliationRule();

  const handleAnalyze = () => {
    if (!centroCode) {
      toast.error('Selecciona un centro para analizar patrones');
      return;
    }
    refetch();
  };

  const toggleSuggestion = (index: number) => {
    const newSet = new Set(selectedSuggestions);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedSuggestions(newSet);
  };

  const handleCreateRules = async () => {
    if (!centroCode || !bankAccountId) {
      toast.error('Selecciona un centro y cuenta bancaria');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const index of selectedSuggestions) {
      const suggestion = data?.suggestions[index];
      if (!suggestion) continue;

      try {
        await createRule.mutateAsync({
          centro_code: centroCode,
          bank_account_id: bankAccountId,
          rule_name: suggestion.suggested_rule_name,
          transaction_type: suggestion.transaction_type,
          description_pattern: suggestion.description_pattern,
          amount_min: suggestion.amount_min,
          amount_max: suggestion.amount_max,
          auto_match_type: suggestion.auto_match_type,
          confidence_threshold: suggestion.confidence_threshold,
          priority: suggestion.priority,
          active: true,
        });
        successCount++;
      } catch (error) {
        console.error('[ReconciliationAssistant] Error creating rule:', error);
        errorCount++;
      }
    }

    setSelectedSuggestions(new Set());
    
    if (successCount > 0) {
      toast.success(`${successCount} regla${successCount > 1 ? 's' : ''} creada${successCount > 1 ? 's' : ''} exitosamente`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} regla${errorCount > 1 ? 's' : ''} fallaron`);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Asistente Inteligente de Reglas
            </CardTitle>
            <CardDescription>
              Analiza transacciones conciliadas y sugiere reglas automáticamente
            </CardDescription>
          </div>
          <Button onClick={handleAnalyze} disabled={isLoading || !centroCode}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analizando...
              </>
            ) : (
              'Analizar Patrones'
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {!data && !isLoading && (
          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertDescription>
              Haz clic en "Analizar Patrones" para que el asistente revise tus transacciones conciliadas
              y sugiera reglas automáticamente.
            </AlertDescription>
          </Alert>
        )}

        {data && data.suggestions.length === 0 && (
          <Alert>
            <AlertDescription>
              No se encontraron patrones suficientes. Necesitas al menos 3 transacciones conciliadas
              con características similares.
            </AlertDescription>
          </Alert>
        )}

        {data && data.suggestions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {data.suggestions_count} patrón{data.suggestions_count > 1 ? 'es' : ''} detectado{data.suggestions_count > 1 ? 's' : ''} · {selectedSuggestions.size} seleccionado{selectedSuggestions.size !== 1 ? 's' : ''}
              </p>
              {selectedSuggestions.size > 0 && (
                <Button 
                  onClick={handleCreateRules} 
                  disabled={createRule.isPending || !bankAccountId}
                >
                  {createRule.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Crear {selectedSuggestions.size} Regla{selectedSuggestions.size > 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              )}
            </div>

            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-3">
                {data.suggestions.map((suggestion, index) => (
                  <Card 
                    key={index}
                    className={`cursor-pointer transition-all ${
                      selectedSuggestions.has(index) 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:border-muted-foreground/50'
                    }`}
                    onClick={() => toggleSuggestion(index)}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm mb-1">
                            {suggestion.suggested_rule_name}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            Patrón: <code className="bg-muted px-1 py-0.5 rounded">
                              {suggestion.description_pattern}
                            </code>
                          </p>
                        </div>
                        <Badge variant={selectedSuggestions.has(index) ? 'default' : 'outline'}>
                          {selectedSuggestions.has(index) ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                        <div>
                          <p className="text-muted-foreground">Ocurrencias</p>
                          <p className="font-semibold flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {suggestion.evidence.occurrences}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Importe Promedio</p>
                          <p className="font-semibold">
                            {formatCurrency(suggestion.evidence.avg_amount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Consistencia</p>
                          <div className="flex items-center gap-2">
                            <Progress value={suggestion.evidence.consistency_score} className="h-2" />
                            <span className="font-semibold">
                              {suggestion.evidence.consistency_score}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          {suggestion.transaction_type === 'credit' ? 'Ingreso' : 'Gasto'}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {suggestion.auto_match_type}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {formatCurrency(suggestion.amount_min)} - {formatCurrency(suggestion.amount_max)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Prioridad: {suggestion.priority}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
