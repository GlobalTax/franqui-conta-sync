// ============================================================================
// MINDEE CLIENT - HTTP Client for Mindee Invoice API v4
// ============================================================================

import type { MindeeAPIResponse } from './types.ts';
import { MindeeError } from './types.ts';

const MINDEE_API_URL = 'https://api.mindee.net/v1/products/mindee/invoices/v4/predict';
const REQUEST_TIMEOUT_MS = 30000; // 30 segundos

export interface MindeeClientConfig {
  apiKey: string;
  timeout?: number;
}

export interface MindeeExtractionRequest {
  documentBase64: string;
  fileName?: string;
}

export interface MindeeExtractionResult {
  success: boolean;
  data: MindeeAPIResponse;
  processing_time_ms: number;
  error?: string;
}

/**
 * Extrae datos de factura usando Mindee Invoice API v4
 */
export async function extractWithMindee(
  request: MindeeExtractionRequest,
  config: MindeeClientConfig
): Promise<MindeeExtractionResult> {
  const startTime = Date.now();
  
  if (!config.apiKey) {
    throw new MindeeError('MINDEE_API_KEY no configurada', 500);
  }

  console.log('[Mindee Client] Iniciando extracción:', {
    fileName: request.fileName,
    documentSize: request.documentBase64.length,
  });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      config.timeout || REQUEST_TIMEOUT_MS
    );

    const response = await fetch(MINDEE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document: request.documentBase64,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseData = await response.json();

    if (!response.ok) {
      console.error('[Mindee Client] Error API:', {
        status: response.status,
        statusText: response.statusText,
        data: responseData,
      });

      // Clasificar errores
      if (response.status === 401) {
        throw new MindeeError('API Key inválida o expirada', 401, responseData);
      } else if (response.status === 429) {
        throw new MindeeError('Rate limit excedido - demasiadas peticiones', 429, responseData);
      } else if (response.status === 402) {
        throw new MindeeError('Créditos insuficientes en cuenta Mindee', 402, responseData);
      } else if (response.status === 400) {
        throw new MindeeError('Documento inválido o mal formado', 400, responseData);
      } else if (response.status >= 500) {
        throw new MindeeError('Error en servidores de Mindee', response.status, responseData);
      } else {
        throw new MindeeError(
          `Error desconocido de Mindee API: ${response.status}`,
          response.status,
          responseData
        );
      }
    }

    // Validar estructura de respuesta
    if (!responseData.document || !responseData.document.inference) {
      throw new MindeeError('Respuesta de Mindee incompleta o inválida', 500, responseData);
    }

    const processingTime = Date.now() - startTime;

    console.log('[Mindee Client] ✓ Extracción exitosa:', {
      documentId: responseData.document.id,
      confidence: responseData.document.inference.prediction.confidence,
      processingTime: `${processingTime}ms`,
      pages: responseData.document.n_pages,
    });

    return {
      success: true,
      data: responseData,
      processing_time_ms: processingTime,
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;

    // Si ya es un MindeeError, re-lanzarlo
    if (error instanceof MindeeError) {
      throw error;
    }

    // Errores de red
    if (error instanceof Error && error.name === 'AbortError') {
      throw new MindeeError(
        `Timeout después de ${config.timeout || REQUEST_TIMEOUT_MS}ms`,
        408
      );
    }

    // Otros errores
    console.error('[Mindee Client] Error inesperado:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    throw new MindeeError(
      `Error al procesar documento: ${errorMessage}`,
      500,
      { originalError: error }
    );
  }
}

/**
 * Verifica la salud del servicio Mindee
 */
export async function healthCheck(apiKey: string): Promise<boolean> {
  try {
    // Intento ligero de conexión (sin documento real)
    const response = await fetch('https://api.mindee.net/v1/products', {
      method: 'GET',
      headers: {
        'Authorization': `Token ${apiKey}`,
      },
    });
    
    return response.ok;
  } catch (error) {
    console.error('[Mindee Health Check] Error:', error);
    return false;
  }
}
