import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sparkles, Eye, Layers, AlertTriangle } from "lucide-react";

interface Props {
  ocrEngine: "openai" | "mindee" | "merged" | "manual_review" | "google_vision";
  mergeNotes: string[];
  confidence: number;
}

export function OCREngineIndicator({ ocrEngine, mergeNotes, confidence }: Props) {
  
  const engineConfig = {
    openai: {
      label: 'OpenAI Vision',
      icon: Sparkles,
      color: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700'
    },
    mindee: {
      label: 'Mindee',
      icon: Eye,
      color: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700'
    },
    merged: {
      label: 'Fusión Inteligente',
      icon: Layers,
      color: 'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-700'
    },
    google_vision: {
      label: 'Google Vision',
      icon: Eye,
      color: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700'
    },
    manual_review: {
      label: 'Revisión Manual Requerida',
      icon: AlertTriangle,
      color: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700'
    }
  };

  const config = engineConfig[ocrEngine];
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
      </AlertDescription>
    </Alert>
  );
}
