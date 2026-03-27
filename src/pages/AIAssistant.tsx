// ============================================================================
// AI ASSISTANT PAGE
// Claude-powered accounting assistant with multiple modes
// ============================================================================

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageSquare,
  FileSearch,
  FileBarChart,
  Sparkles,
  Send,
  Trash2,
  Loader2,
  Bot,
  User,
  Brain,
} from "lucide-react";
import { useClaudeAssistant, type AssistantMode, type ChatMessage } from "@/hooks/useClaudeAssistant";
import { useView } from "@/contexts/ViewContext";
import ReactMarkdown from "react-markdown";

const MODE_CONFIG: Record<AssistantMode, { label: string; icon: React.ElementType; description: string; color: string }> = {
  chat: {
    label: "Asistente Contable",
    icon: MessageSquare,
    description: "Consultas sobre PGC, asientos, cierres y P&L",
    color: "text-primary",
  },
  "document-analysis": {
    label: "Análisis Documentos",
    icon: FileSearch,
    description: "Analiza facturas y documentos contables",
    color: "text-amber-500",
  },
  "report-generation": {
    label: "Generación Informes",
    icon: FileBarChart,
    description: "Genera reportes financieros y análisis",
    color: "text-emerald-500",
  },
  "mapping-enhancement": {
    label: "Mejora Mapeo",
    icon: Sparkles,
    description: "Optimiza el mapeo automático de cuentas PGC",
    color: "text-violet-500",
  },
};

const QUICK_PROMPTS: Record<AssistantMode, string[]> = {
  chat: [
    "¿Qué cuenta PGC uso para registrar el royalty de McDonald's?",
    "Explica el asiento de cierre de ejercicio",
    "¿Cómo contabilizo una periodificación de alquiler?",
    "Diferencia entre provisión y periodificación",
  ],
  "document-analysis": [
    "Analiza esta factura de proveedor de alimentación",
    "Verifica el desglose de IVA de este documento",
    "¿Qué datos faltan en esta factura?",
  ],
  "report-generation": [
    "Genera un resumen ejecutivo del P&L del último mes",
    "Compara food cost entre centros",
    "Analiza la evolución de labor cost trimestral",
  ],
  "mapping-enhancement": [
    "Sugiere cuenta PGC para 'Servicio limpieza mensual'",
    "¿Qué cuenta usar para 'Reparación horno industrial'?",
    "Mapea 'Comisión plataforma delivery Glovo'",
  ],
};

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted border border-border"
        }`}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
        <p className={`text-[10px] mt-1 ${isUser ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
          {message.timestamp.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <User className="h-4 w-4 text-primary-foreground" />
        </div>
      )}
    </div>
  );
}

export default function AIAssistant() {
  const [mode, setMode] = useState<AssistantMode>("chat");
  const [input, setInput] = useState("");
  const { selectedCentro } = useView();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, isLoading, sendMessage, clearMessages } = useClaudeAssistant({
    mode,
    context: {
      centro_code: selectedCentro || undefined,
      timestamp: new Date().toISOString(),
    },
  });

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  const currentConfig = MODE_CONFIG[mode];

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Asistente IA Claude</h1>
            <p className="text-sm text-muted-foreground">{currentConfig.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Claude Sonnet 4
          </Badge>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearMessages}>
              <Trash2 className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Mode Tabs */}
      <Tabs value={mode} onValueChange={(v) => setMode(v as AssistantMode)} className="mb-4">
        <TabsList className="grid grid-cols-4 w-full">
          {(Object.entries(MODE_CONFIG) as [AssistantMode, typeof currentConfig][]).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <TabsTrigger key={key} value={key} className="text-xs gap-1.5">
                <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                <span className="hidden sm:inline">{config.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col overflow-hidden border-border">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <currentConfig.icon className={`h-8 w-8 ${currentConfig.color}`} />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{currentConfig.label}</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">{currentConfig.description}</p>

              {/* Quick prompts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg">
                {QUICK_PROMPTS[mode].map((prompt, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="text-xs text-left h-auto py-2 px-3 justify-start"
                    onClick={() => handleQuickPrompt(prompt)}
                    disabled={isLoading}
                  >
                    <Sparkles className="h-3 w-3 mr-2 flex-shrink-0 text-primary" />
                    <span className="line-clamp-2">{prompt}</span>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted border border-border rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Claude está pensando...
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t border-border p-4">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Escribe tu consulta de ${currentConfig.label.toLowerCase()}...`}
              className="min-h-[44px] max-h-[120px] resize-none"
              disabled={isLoading}
              rows={1}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-11 w-11 flex-shrink-0"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
