import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileCheck, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MindeeMetricsCardProps {
  mindeeDocumentId: string | null;
  mindeeConfidence: number | null;
  mindeeCostEuros: number | null;
  mindeeProcessingTime: number | null;
  mindeePages: number | null;
  ocrFallbackUsed: boolean;
  fieldConfidenceScores: Record<string, number> | null;
}

export function MindeeMetricsCard({
  mindeeDocumentId,
  mindeeConfidence,
  mindeeCostEuros,
  mindeeProcessingTime,
  mindeePages,
  ocrFallbackUsed,
  fieldConfidenceScores
}: MindeeMetricsCardProps) {
  if (!mindeeDocumentId) return null;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileCheck className="h-5 w-5" />
          Métricas de Procesamiento (Mindee)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* General Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <MetricItem 
            label="Confianza General" 
            value={`${Math.round(mindeeConfidence || 0)}%`}
            color={getConfidenceColor(mindeeConfidence)}
          />
          <MetricItem 
            label="Coste Procesamiento" 
            value={`${mindeeCostEuros?.toFixed(4) || '0.0000'}€`}
          />
          <MetricItem 
            label="Tiempo Procesamiento" 
            value={`${((mindeeProcessingTime || 0) / 1000).toFixed(2)}s`}
          />
          <MetricItem 
            label="Páginas" 
            value={mindeePages || 0}
          />
        </div>
        
        {/* Fallback Warning */}
        {ocrFallbackUsed && (
          <Alert className="border-orange-500/50 bg-orange-500/10">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-900 dark:text-orange-100">
              Parsers de Respaldo Activados
            </AlertTitle>
            <AlertDescription className="text-orange-800 dark:text-orange-200">
              Mindee no pudo extraer todos los campos. Se utilizaron parsers custom para
              números europeos, datos de cliente y desglose de impuestos.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Field Confidence Scores */}
        {fieldConfidenceScores && Object.keys(fieldConfidenceScores).length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Confianza por Campo</h4>
            <div className="space-y-2">
              {Object.entries(fieldConfidenceScores)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 8)
                .map(([field, score]) => (
                  <FieldConfidenceBar key={field} field={field} score={score} />
                ))}
            </div>
          </div>
        )}
        
        {/* Document ID */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground font-mono">
            Document ID: {mindeeDocumentId}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper components
function MetricItem({ 
  label, 
  value, 
  color 
}: { 
  label: string; 
  value: string | number; 
  color?: string;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-semibold", color)}>{value}</p>
    </div>
  );
}

function FieldConfidenceBar({ 
  field, 
  score 
}: { 
  field: string; 
  score: number;
}) {
  const color = score >= 80 
    ? 'bg-green-500' 
    : score >= 50 
      ? 'bg-yellow-500' 
      : 'bg-red-500';
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-32 truncate" title={formatFieldName(field)}>
        {formatFieldName(field)}
      </span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn("h-full transition-all", color)} 
          style={{ width: `${score}%` }} 
        />
      </div>
      <span className="text-xs w-12 text-right">{Math.round(score)}%</span>
    </div>
  );
}

function getConfidenceColor(confidence: number | null): string {
  if (!confidence) return 'text-muted-foreground';
  if (confidence >= 80) return 'text-green-600 dark:text-green-400';
  if (confidence >= 70) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

function formatFieldName(field: string): string {
  return field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}
