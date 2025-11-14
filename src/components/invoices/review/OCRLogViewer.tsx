import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger 
} from "@/components/ui/accordion";
import { useOCRProcessingLogs, type OCRProcessingLog } from "@/hooks/useOCRProcessingLogs";
import { 
  Zap, 
  AlertCircle, 
  Bot, 
  Brain, 
  FileText,
  Clock,
  Coins,
  Database,
  CheckCircle2
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface OCRLogViewerProps {
  invoiceId: string;
}

export function OCRLogViewer({ invoiceId }: OCRLogViewerProps) {
  const { data: logs, isLoading } = useOCRProcessingLogs(invoiceId);

  if (isLoading) {
    return <Skeleton className="h-64 w-full rounded-lg" />;
  }

  if (!logs || logs.length === 0) {
    return (
      <Card className="p-6 bg-muted/30 border-border/40">
        <p className="text-sm text-muted-foreground text-center">
          No hay logs de procesamiento OCR disponibles
        </p>
      </Card>
    );
  }

  // Calcular métricas agregadas
  const totalTime = logs.reduce((acc, log) => 
    acc + (log.processing_time_ms || log.ms_openai || 0), 0
  );
  const totalTokens = logs.reduce((acc, log) => 
    acc + (log.tokens_in || 0) + (log.tokens_out || 0), 0
  );
  const totalCost = logs.reduce((acc, log) => 
    acc + (log.cost_estimate_eur || 0), 0
  );
  const finalEngine = logs[logs.length - 1]?.engine || "unknown";

  // Función para obtener el icono y color según el proveedor OCR
  const getEventIcon = (log: OCRProcessingLog) => {
    if (log.engine === "openai") {
      return { icon: Bot, color: "text-blue-600", bg: "bg-blue-100" };
    }
    if (log.engine === "mindee") {
      return { icon: Brain, color: "text-purple-600", bg: "bg-purple-100" };
    }
    if (log.ocr_provider === "openai") {
      return { icon: Bot, color: "text-blue-600", bg: "bg-blue-100" };
    }
    if (log.ocr_provider === "mindee") {
      return { icon: Brain, color: "text-purple-600", bg: "bg-purple-100" };
    }
    if (log.confidence && log.confidence > 0.9) {
      return { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100" };
    }
    return { icon: FileText, color: "text-gray-600", bg: "bg-gray-100" };
  };

  // Función para obtener el label del evento
  const getEventLabel = (log: OCRProcessingLog) => {
    const engine = log.engine || log.ocr_provider || "unknown";
    return `${engine.toUpperCase()} OCR procesando`;
  };

  return (
    <section>
      <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
        <Database className="h-5 w-5 text-primary" />
        Logs de Procesamiento OCR
      </h3>

      {/* Métricas generales */}
      <Card className="p-4 mb-4 bg-accent/30 border-border/40">
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
              <Bot className="h-3 w-3" />
              Motor
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {finalEngine}
            </Badge>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
              <Clock className="h-3 w-3" />
              Tiempo
            </div>
            <p className="font-semibold text-sm">
              {(totalTime / 1000).toFixed(2)}s
            </p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
              <FileText className="h-3 w-3" />
              Tokens
            </div>
            <p className="font-semibold text-sm">
              {totalTokens.toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
              <Coins className="h-3 w-3" />
              Coste
            </div>
            <p className="font-semibold text-sm">
              €{totalCost.toFixed(4)}
            </p>
          </div>
        </div>
      </Card>

      {/* Timeline de eventos */}
      <Card className="p-4 bg-card border-border/40">
        <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Timeline de Procesamiento
        </h4>
        <div className="space-y-3">
          {logs.map((log, index) => {
            const { icon: Icon, color, bg } = getEventIcon(log);
            const label = getEventLabel(log);
            const time = format(new Date(log.created_at), "HH:mm:ss", { locale: es });

            return (
              <div key={log.id} className="flex gap-3">
                {/* Icono del evento */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full ${bg} flex items-center justify-center`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>

                {/* Detalles del evento */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {time}
                    </span>
                    <span className="text-sm font-medium">{label}</span>
                  </div>

                  {/* Información adicional */}
                  <div className="mt-1 text-xs text-muted-foreground">
                    {log.confidence && (
                      <span className="inline-block mr-3">
                        Confianza: {Math.round(log.confidence * 100)}%
                      </span>
                    )}
                    {log.processing_time_ms && (
                      <span className="inline-block mr-3">
                        Duración: {log.processing_time_ms}ms
                      </span>
                    )}
                    {log.ms_openai && (
                      <span className="inline-block mr-3">
                        Tiempo OpenAI: {log.ms_openai}ms
                      </span>
                    )}
                    {log.pages && (
                      <span className="inline-block">
                        Páginas: {log.pages}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Respuestas Raw - Acordeón */}
      <Accordion type="single" collapsible className="mt-4">
        <AccordionItem value="raw-responses" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm hover:no-underline">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Ver Respuestas Raw (JSON)
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              {logs.map((log, index) => (
                <div key={log.id}>
                  {log.raw_response && (
                    <div className="mb-3">
                      <p className="text-xs font-medium mb-2 flex items-center gap-1">
                        <Bot className="h-3 w-3" />
                        Raw Response ({log.engine || log.ocr_provider})
                      </p>
                      <pre className="text-xs bg-muted p-3 rounded overflow-x-auto max-h-64 overflow-y-auto">
                        {JSON.stringify(log.raw_response, null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.extracted_data && (
                    <div className="mb-3">
                      <p className="text-xs font-medium mb-2 flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        Extracted Data
                      </p>
                      <pre className="text-xs bg-muted p-3 rounded overflow-x-auto max-h-64 overflow-y-auto">
                        {JSON.stringify(log.extracted_data, null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.user_corrections && (
                    <div className="mb-3">
                      <p className="text-xs font-medium mb-2 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        User Corrections
                      </p>
                      <pre className="text-xs bg-muted p-3 rounded overflow-x-auto max-h-64 overflow-y-auto">
                        {JSON.stringify(log.user_corrections, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
}
