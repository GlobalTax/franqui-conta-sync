// ============================================================================
// OCR DEBUG BADGE
// Badge con Popover mostrando timeline del orchestrator
// ============================================================================

import { useState } from 'react';
import { Code, Zap, Shield, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

interface OrchestratorLog {
  timestamp: number;
  stage: string;
  action: string;
  decision?: string;
  reason?: string;
  metrics?: {
    duration_ms?: number;
    confidence?: number;
    engine?: string;
    [key: string]: any;
  };
}

interface OCRDebugBadgeProps {
  logs: OrchestratorLog[];
  engine?: string;
  confidence?: number;
  processingTimeMs?: number;
}

export function OCRDebugBadge({
  logs,
  engine,
  confidence,
  processingTimeMs
}: OCRDebugBadgeProps) {
  const [open, setOpen] = useState(false);

  if (!logs || logs.length === 0) return null;

  const startTime = logs[0]?.timestamp || 0;

  const getStageIcon = (stage: string) => {
    const icons: Record<string, string> = {
      'INIT': '🚀',
      'ROUTING': '🛤️',
      'EXECUTION': '⚙️',
      'VALIDATION': '✅',
      'DECISION': '🎯',
      'MERGE': '🔀',
      'CACHE': '💾',
      'PERFORMANCE': '⏱️'
    };
    return icons[stage] || '📌';
  };

  const getStageColor = (stage: string, decision?: string) => {
    if (decision?.includes('FAILED') || decision?.includes('failed')) {
      return 'text-red-600 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800';
    }
    if (stage === 'DECISION') {
      return 'text-blue-600 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800';
    }
    if (stage === 'MERGE') {
      return 'text-purple-600 bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800';
    }
    return 'text-muted-foreground bg-muted/30 border-border';
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-7 gap-2 text-xs"
        >
          <Code className="h-3 w-3" />
          Debug Timeline
          <Badge variant="secondary" className="h-4 px-1 text-[10px]">
            {logs.length}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[500px] p-0" 
        align="start"
        side="bottom"
      >
        {/* Header */}
        <div className="p-4 border-b bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              🔍 OCR Orchestrator Timeline
            </h4>
            <div className="flex items-center gap-2">
              {engine === 'openai' && (
                <Badge variant="secondary" className="gap-1">
                  <Zap className="h-3 w-3 text-green-600" />
                  OpenAI
                </Badge>
              )}
              {engine === 'merged' && (
                <Badge variant="secondary">🔀 Multi-Motor</Badge>
              )}
            </div>
          </div>
          
          {/* Métricas resumen */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {processingTimeMs && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {processingTimeMs}ms
              </div>
            )}
            {confidence && (
              <div>
                Confianza: <span className="font-medium text-foreground">
                  {Math.round(confidence * 100)}%
                </span>
              </div>
            )}
            <div>
              {logs.length} etapas
            </div>
          </div>
        </div>

        {/* Timeline */}
        <ScrollArea className="h-[400px]">
          <div className="p-4 space-y-2">
            {logs.map((log, index) => {
              const elapsedMs = startTime > 0 ? log.timestamp - startTime : 0;
              const stageColor = getStageColor(log.stage, log.decision);
              
              return (
                <div 
                  key={index} 
                  className={`border rounded-md p-3 ${stageColor}`}
                >
                  {/* Header de la etapa */}
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getStageIcon(log.stage)}</span>
                      <div>
                        <div className="font-mono text-xs font-semibold">
                          [{log.stage}] {log.action}
                        </div>
                        <div className="text-[10px] opacity-70">
                          +{elapsedMs}ms
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Decisión */}
                  {log.decision && (
                    <div className="text-xs font-medium mt-1 pl-7">
                      → {log.decision}
                    </div>
                  )}

                  {/* Razón */}
                  {log.reason && (
                    <div className="text-xs opacity-80 mt-1 pl-7">
                      ℹ️ {log.reason}
                    </div>
                  )}

                  {/* Métricas */}
                  {log.metrics && Object.keys(log.metrics).length > 0 && (
                    <div className="mt-2 pl-7">
                      <div className="text-[10px] opacity-70 mb-1">📊 Metrics:</div>
                      <div className="grid grid-cols-2 gap-1 text-xs font-mono">
                        {Object.entries(log.metrics).map(([key, value]) => (
                          <div key={key} className="truncate">
                            <span className="opacity-70">{key}:</span>{' '}
                            <span className="font-medium">{JSON.stringify(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t bg-muted/30 text-center">
          <p className="text-xs text-muted-foreground">
            💡 Usa la consola del navegador para ver más detalles técnicos
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
