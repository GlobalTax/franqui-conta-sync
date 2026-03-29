// ============================================================================
// PDF TO IMAGE CONVERTER - Deno-compatible version
// Uses pdfjs-dist with Deno-targeted imports and OffscreenCanvas
// ============================================================================

import { logger } from '../logger.ts';

// Type declarations for OffscreenCanvas (available in Deno 1.30+)
declare class OffscreenCanvas {
  constructor(width: number, height: number);
  getContext(contextId: '2d'): OffscreenCanvasRenderingContext2D | null;
  convertToBlob(options?: { type?: string }): Promise<Blob>;
}

declare class OffscreenCanvasRenderingContext2D {
  // Basic context methods needed by pdfjs
  [key: string]: any;
}

/**
 * Check if OffscreenCanvas is available in the current runtime
 */
function checkOffscreenCanvasSupport(): void {
  if (typeof OffscreenCanvas === 'undefined') {
    const errorMsg = 'OffscreenCanvas is not available in this Deno runtime. PDF conversion must be done on client side.';
    logger.error('pdf-to-image', errorMsg);
    throw new Error(errorMsg);
  }
  logger.info('pdf-to-image', 'OffscreenCanvas is available');
}

/**
 * Converts a base64-encoded PDF to a PNG image data URI
 * Only processes the first page (sufficient for most invoices)
 * 
 * @param base64Pdf - Base64-encoded PDF content (without data URI prefix)
 * @returns Data URI string: data:image/png;base64,...
 */
export async function convertPdfToImage(base64Pdf: string): Promise<string> {
  logger.info('pdf-to-image', 'Starting conversion with Deno-compatible renderer');
  
  try {
    // 0. Check runtime support
    checkOffscreenCanvasSupport();

    // 1. Decode base64 to bytes
    const binaryString = atob(base64Pdf);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    logger.debug('pdf-to-image', 'Decoded bytes', { size: bytes.length });

    // 2. Load PDF using pdfjs-dist with Deno target
    logger.info('pdf-to-image', 'Loading pdfjs-dist with Deno target');
    const pdfjsLib = await import('https://esm.sh/pdfjs-dist@4.0.379?target=deno&bundle');
    
    // Configure worker with Deno target
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs?target=deno&bundle';
    logger.info('pdf-to-image', 'Worker configured');

    const loadingTask = pdfjsLib.getDocument({ data: bytes });
    const pdfDocument = await loadingTask.promise;
    logger.info('pdf-to-image', 'Loaded PDF', { pages: pdfDocument.numPages });

    // 3. Get first page
    const page = await pdfDocument.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });

    logger.debug('pdf-to-image', 'Page dimensions', { width: viewport.width, height: viewport.height });

    // 4. Create offscreen canvas (available in Deno runtime)
    const canvas = new OffscreenCanvas(
      Math.floor(viewport.width),
      Math.floor(viewport.height)
    );
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Failed to get 2D context from OffscreenCanvas');
    }

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    await page.render(renderContext).promise;
    logger.info('pdf-to-image', 'Page rendered to canvas');

    // 5. Convert canvas to PNG blob
    logger.info('pdf-to-image', 'Converting canvas to PNG blob');
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    logger.debug('pdf-to-image', 'Blob created', { size: blob.size });
    
    // 6. Convert blob to base64
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const base64 = btoa(String.fromCharCode(...uint8Array));
    const pngDataUrl = `data:image/png;base64,${base64}`;
    
    logger.info('pdf-to-image', 'Conversion complete', { data_uri_length: pngDataUrl.length, image_size: blob.size });

    return pngDataUrl;

  } catch (error) {
    logger.error('pdf-to-image', 'Conversion error', error);
    
    // Enhanced error message with full stack trace and context
    const errorMsg = error instanceof Error 
      ? `${error.message}${error.stack ? `\n\nStack Trace:\n${error.stack}` : ''}`
      : String(error);
    
    const contextInfo = `\nRuntime: Deno ${Deno.version.deno}\nOffscreenCanvas available: ${typeof OffscreenCanvas !== 'undefined'}`;
    
    throw new Error(`PDF to image conversion failed: ${errorMsg}${contextInfo}`);
  }
}
