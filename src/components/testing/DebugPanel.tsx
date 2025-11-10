import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useTestingMode } from "@/hooks/useTestingMode";
import { 
  Bug, 
  Minimize2, 
  Maximize2, 
  Trash2, 
  ChevronDown,
  ChevronUp,
  Circle,
  CheckCircle2,
  AlertCircle,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function DebugPanel() {
  const { isTestingMode, logs, clearLogs, activeOperations } = useTestingMode();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isTestingMode) return null;

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'success':
        return <CheckCircle2 className="h-3 w-3 text-success" />;
      case 'error':
        return <AlertCircle className="h-3 w-3 text-destructive" />;
      case 'warning':
        return <AlertCircle className="h-3 w-3 text-warning" />;
      default:
        return <Info className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getLogColor = (level: string) => {
    switch (level) {
      case 'success':
        return 'border-l-success';
      case 'error':
        return 'border-l-destructive';
      case 'warning':
        return 'border-l-warning';
      default:
        return 'border-l-muted-foreground';
    }
  };

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 shadow-2xl transition-all duration-300",
        isExpanded ? "w-[800px]" : "w-[400px]",
        isMinimized && "w-auto"
      )}
    >
      <Card className="border-2 border-primary/20 bg-background/95 backdrop-blur">
        <CardHeader className="p-3 cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bug className="h-4 w-4 text-primary" />
              Debug Panel
              {activeOperations.size > 0 && (
                <Badge variant="secondary" className="ml-2">
                  <Circle className="h-2 w-2 mr-1 fill-primary animate-pulse" />
                  {activeOperations.size} activas
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
              >
                {isExpanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  clearLogs();
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => e.stopPropagation()}
              >
                {isMinimized ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-3 pt-0">
            <ScrollArea className={cn("rounded-md", isExpanded ? "h-[500px]" : "h-[300px]")}>
              <div className="space-y-1">
                {logs.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    No hay logs disponibles
                  </div>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className={cn(
                        "p-2 rounded-md border-l-2 text-xs bg-muted/30",
                        getLogColor(log.level)
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {getLogIcon(log.level)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {log.timestamp.toLocaleTimeString()}
                            </span>
                            <Badge variant="outline" className="text-[10px] py-0 px-1">
                              {log.category}
                            </Badge>
                          </div>
                          <p className="text-foreground break-words">{log.message}</p>
                          {log.details && (
                            <pre className="mt-1 p-2 bg-background/50 rounded text-[10px] overflow-x-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
