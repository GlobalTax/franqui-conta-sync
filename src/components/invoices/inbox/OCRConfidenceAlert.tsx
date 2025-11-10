import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface OCRConfidenceAlertProps {
  notes: string[];
  mergeNotes?: string[];
  engine: string;
  confidence: number;
}

export function OCRConfidenceAlert({
  notes,
  mergeNotes,
  engine,
  confidence,
}: OCRConfidenceAlertProps) {
  const hasWarnings = notes && notes.length > 0;
  const hasMergeNotes = mergeNotes && mergeNotes.length > 0;

  const getConfidenceLevel = () => {
    if (confidence >= 0.9) return { color: 'text-green-600', label: 'Alta', icon: CheckCircle2 };
    if (confidence >= 0.75) return { color: 'text-blue-600', label: 'Media-Alta', icon: Info };
    if (confidence >= 0.6) return { color: 'text-yellow-600', label: 'Media', icon: AlertTriangle };
    return { color: 'text-red-600', label: 'Baja', icon: AlertTriangle };
  };

  const confidenceLevel = getConfidenceLevel();
  const ConfidenceIcon = confidenceLevel.icon;

  return (
    <div className="space-y-3">
      {/* Confidence Score */}
      <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
        <div className="flex items-center gap-2">
          <ConfidenceIcon className={`h-4 w-4 ${confidenceLevel.color}`} />
          <span className="text-sm font-medium">Confianza OCR</span>
        </div>
        <Badge variant="outline" className={confidenceLevel.color}>
          {Math.round(confidence * 100)}% ({confidenceLevel.label})
        </Badge>
      </div>

      {/* Warnings */}
      {hasWarnings && (
        <Alert variant="destructive" className="border-orange-300 bg-orange-50 text-orange-800 dark:border-orange-700 dark:bg-orange-950 dark:text-orange-300">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-sm font-semibold">
            Revisión Requerida ({notes.length})
          </AlertTitle>
          <AlertDescription className="mt-2 space-y-1.5">
            {notes.map((note, idx) => (
              <div
                key={idx}
                className="text-xs bg-orange-100/50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-md p-2"
              >
                {note}
              </div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Merge Notes */}
      {engine === 'merged' && hasMergeNotes && (
        <Collapsible className="border rounded-lg bg-muted/20">
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/40 transition-colors">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400">
              <Info className="h-4 w-4" />
              Notas de Fusión ({mergeNotes.length})
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform ui-open:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="px-3 pb-3 space-y-1.5">
            {mergeNotes.map((note, idx) => (
              <div
                key={idx}
                className="text-xs bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-2 text-blue-800 dark:text-blue-300"
              >
                {note}
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
