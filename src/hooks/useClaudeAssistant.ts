// ============================================================================
// CLAUDE ASSISTANT HOOK
// React hook for interacting with Claude AI assistant
// Supports streaming and multiple modes
// ============================================================================

import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from '@/lib/logger';

export type AssistantMode = "chat" | "document-analysis" | "report-generation" | "mapping-enhancement";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  mode?: AssistantMode;
}

interface UseClaudeAssistantOptions {
  mode?: AssistantMode;
  context?: Record<string, unknown>;
}

export function useClaudeAssistant(options: UseClaudeAssistantOptions = {}) {
  const { mode = "chat", context } = options;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (userMessage: string) => {
      if (!userMessage.trim() || isLoading) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: userMessage.trim(),
        timestamp: new Date(),
        mode,
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        // Build conversation history for API
        const apiMessages = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const { data, error } = await supabase.functions.invoke("claude-assistant", {
          body: {
            mode,
            messages: apiMessages,
            context,
            stream: false,
          },
        });

        if (error) throw error;

        if (data?.error) {
          throw new Error(data.error);
        }

        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.content,
          timestamp: new Date(),
          mode,
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch (error: unknown) {
        logger.error('useClaudeAssistant', 'Error:', error);
        const errorMessage =
          error instanceof Error ? error.message : "Error al comunicar con el asistente IA";
        toast.error(errorMessage);

        // Add error message to chat
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `⚠️ ${errorMessage}`,
            timestamp: new Date(),
            mode,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, mode, context, isLoading]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const cancelRequest = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    cancelRequest,
    setMessages,
  };
}
