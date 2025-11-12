import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Brain, Cpu, Euro, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface OCREngineSelectorProps {
  value: 'openai' | 'mindee';
  onChange: (value: 'openai' | 'mindee') => void;
  estimatedPages?: number;
}

const ENGINE_SPECS = {
  openai: {
    name: 'OpenAI GPT-4o',
    icon: Brain,
    costPerInvoice: 0.08,
    expectedConfidence: 85,
    description: 'Mejor en documentos complejos y variados',
    pros: ['Flexible con formatos no estándar', 'Buena comprensión contextual'],
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-green-200 dark:border-green-800',
  },
  mindee: {
    name: 'Mindee',
    icon: Cpu,
    costPerPage: 0.055,
    expectedConfidence: 92,
    description: 'Especializado en facturas estándar',
    pros: ['Mayor precisión en facturas', 'Optimizado para documentos fiscales'],
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
};

export function OCREngineSelector({ 
  value, 
  onChange, 
  estimatedPages = 1 
}: OCREngineSelectorProps) {
  const calculateCost = (engine: 'openai' | 'mindee') => {
    if (engine === 'openai') {
      return ENGINE_SPECS.openai.costPerInvoice;
    }
    return ENGINE_SPECS.mindee.costPerPage * estimatedPages;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Motor OCR</Label>
        <span className="text-xs text-muted-foreground">
          Páginas estimadas: {estimatedPages}
        </span>
      </div>

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
