import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Brain, Cpu, Euro, TrendingUp, Sparkles, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { DocumentAnalysis } from '@/hooks/useDocumentAnalyzer';

interface OCREngineSelectorProps {
  value: 'openai';
  onChange: (value: 'openai') => void;
  estimatedPages?: number;
  analysis?: DocumentAnalysis;
  onUseRecommended?: () => void;
}

const ENGINE_SPECS = {
  openai: {
    name: 'OpenAI GPT-4o',
    icon: Brain,
    costPerInvoice: 0.08,
    expectedConfidence: 85,
    description: 'Motor OCR principal',
    pros: ['Flexible con formatos variados', 'Buena comprensión contextual'],
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-green-200 dark:border-green-800',
  },
};

export function OCREngineSelector({ 
  value, 
  onChange, 
  estimatedPages = 1,
  analysis,
  onUseRecommended
}: OCREngineSelectorProps) {
  const calculateCost = (engine: 'openai') => {
    return ENGINE_SPECS.openai.costPerInvoice;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Motor OCR</Label>
        <span className="text-xs text-muted-foreground">
          Páginas estimadas: {analysis?.pages || estimatedPages}
        </span>
      </div>

      {/* AI Recommendation Banner */}
      {analysis && (
        <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h4 className="font-semibold text-sm">Recomendación Inteligente</h4>
                <Badge variant="default" className="bg-purple-600">
                  {analysis.recommended_engine === 'openai' ? 'OpenAI GPT-4o' : 'Mindee'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {analysis.confidence}% confianza
                </span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        Basado en: páginas ({analysis.pages}), calidad ({analysis.quality_score}%), 
                        complejidad ({analysis.complexity})
                        {analysis.supplier_history && `, historial del proveedor (${analysis.supplier_history.total} facturas)`}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              <ul className="text-xs space-y-1 mb-3">
                {analysis.reasoning.map((reason, idx) => (
                  <li key={idx} className="text-muted-foreground flex items-start gap-1.5">
                    <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>

              {/* Use recommended button */}
              {value !== analysis.recommended_engine && onUseRecommended && (
                <Button
                  onClick={onUseRecommended}
                  size="sm"
                  variant="outline"
                  className="w-full border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/50"
                >
                  <Sparkles className="h-3 w-3 mr-2" />
                  Usar motor recomendado
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <RadioGroup value={value} onValueChange={onChange}>
        {(['openai', 'mindee'] as const).map((engine) => {
          const spec = ENGINE_SPECS[engine];
          const Icon = spec.icon;
          const cost = calculateCost(engine);
          const isSelected = value === engine;

          return (
            <Card
              key={engine}
              className={`cursor-pointer transition-all ${
                isSelected
                  ? `${spec.borderColor} ${spec.bgColor} border-2`
                  : 'border border-border hover:border-primary/50'
              }`}
              onClick={() => onChange(engine)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <RadioGroupItem value={engine} id={engine} className="mt-1" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${spec.color}`} />
                      <Label htmlFor={engine} className="font-semibold cursor-pointer">
                        {spec.name}
                      </Label>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {spec.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      {/* Coste estimado */}
                      <div className="flex items-center gap-1.5">
                        <Euro className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-medium">
                          {cost.toFixed(3)}€
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {engine === 'openai' ? '/factura' : '/página'}
                        </span>
                      </div>

                      {/* Confianza esperada */}
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-medium">
                          ~{spec.expectedConfidence}%
                        </span>
                        <span className="text-xs text-muted-foreground">confianza</span>
                      </div>

                      {/* Badge recomendado */}
                      {engine === 'mindee' && (
                        <Badge variant="secondary" className="text-xs">
                          Recomendado
                        </Badge>
                      )}
                    </div>

                    {/* Pros */}
                    <ul className="text-xs text-muted-foreground space-y-0.5 mt-2">
                      {spec.pros.map((pro, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className={`${spec.color} font-bold`}>•</span>
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </RadioGroup>

      <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3">
        <strong>Tip:</strong> Mindee es más preciso para facturas estándar. 
        Usa OpenAI si el documento tiene un formato inusual o está mal escaneado.
      </div>
    </div>
  );
}
