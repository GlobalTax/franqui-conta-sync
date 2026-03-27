import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sparkles, AlertTriangle } from "lucide-react";

interface Props {
  ocrEngine: "claude" | "manual_review";
  mergeNotes: string[];
  confidence: number;
  metrics?: {
    pages?: number;
    tokens_in?: number;
    tokens_out?: number;
    cost_estimate_eur?: number;
    processing_time_ms?: number;
  };
}

export function OCREngineIndicator({ ocrEngine, mergeNotes, confidence, metrics }: Props) {
  
  const engineConfig = {
    claude: {
      label: 'Claude Vision',
      icon: Sparkles,
      color: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700'
    },
    manual_review: {
      label: 'Revisión Manual Requerida',
      icon: AlertTriangle,
      color: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700'
    }
  };

  const config = engineConfig[ocrEngine] || engineConfig.claude;
  const Icon = config.icon;

  const getConfidenceBadge = () => {
    const confidencePercent = Math.round(confidence * 100);
    if (confidencePercent >= 80) return { color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", label: `${confidencePercent}% - Alta` };
    if (confidencePercent >= 50) return { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300", label: `${confidencePercent}% - Media` };
    return { color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", label: `${confidencePercent}% - Baja` };
  };

  const confidenceBadge = getConfidenceBadge();

  return (
    <Alert className={`${config.color} border-2`}>
      <Icon className="h-5 w-5" />
      <AlertTitle className="flex items-center gap-2 flex-wrap">
        <span className="font-semibold">Motor OCR:</span>
        <Badge className={config.color}>{config.label}</Badge>
        <Badge variant="outline" className={confidenceBadge.color}>
          Confianza: {confidenceBadge.label}
        </Badge>
      </AlertTitle>
      <AlertDescription>
        {mergeNotes.length > 0 && (
          <ul className="mt-3 space-y-1.5 text-sm">
            {mergeNotes.map((note, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="opacity-60">•</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        )}
        
        {metrics && (
          <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2 text-xs">
            {metrics.pages && (
              <div className="flex justify-between">
                <span className="opacity-70">Páginas:</span>
                <span className="font-medium">{metrics.pages}</span>
              </div>
            )}
            {metrics.tokens_in && (
              <div className="flex justify-between">
                <span className="opacity-70">Tokens (in/out):</span>
                <span className="font-medium">{metrics.tokens_in.toLocaleString()}/{metrics.tokens_out?.toLocaleString()}</span>
              </div>
            )}
            {metrics.cost_estimate_eur && (
              <div className="flex justify-between">
                <span className="opacity-70">Coste estimado:</span>
                <span className="font-medium">€{metrics.cost_estimate_eur.toFixed(4)}</span>
              </div>
            )}
            {metrics.processing_time_ms && (
              <div className="flex justify-between">
                <span className="opacity-70">Tiempo:</span>
                <span className="font-medium">{metrics.processing_time_ms}ms</span>
              </div>
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
