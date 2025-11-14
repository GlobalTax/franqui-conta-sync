// ============================================================================
// PDF TO IMAGE CONVERTER - Deno-compatible version
// Uses pdfjs-dist with canvas polyfill
// ============================================================================

// Type declaration for OffscreenCanvas (available in Deno runtime)
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
 * Converts a base64-encoded PDF to a PNG image data URI
 * Only processes the first page (sufficient for most invoices)
 * 
 * @param base64Pdf - Base64-encoded PDF content (without data URI prefix)
 * @returns Data URI string: data:image/png;base64,...
 */
export async function convertPdfToImage(base64Pdf: string): Promise<string> {
  console.log('[PDF→PNG] Starting conversion with Deno-compatible renderer...');
  
  try {
    // 1. Decode base64 to bytes
    const binaryString = atob(base64Pdf);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    console.log(`[PDF→PNG] Decoded ${bytes.length} bytes`);

    // 2. Load PDF using pdfjs-dist (Deno-compatible)
    const pdfjsLib = await import('https://esm.sh/pdfjs-dist@4.0.379');
    
    // Configure worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';

    const loadingTask = pdfjsLib.getDocument({ data: bytes });
    const pdfDocument = await loadingTask.promise;
    console.log(`[PDF→PNG] Loaded PDF with ${pdfDocument.numPages} page(s)`);

    // 3. Get first page
    const page = await pdfDocument.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });

    console.log(`[PDF→PNG] Page dimensions: ${viewport.width}x${viewport.height}`);

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
    console.log('[PDF→PNG] Page rendered to canvas');

    // 5. Convert canvas to PNG blob
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    
    // 6. Convert blob to base64
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const base64 = btoa(String.fromCharCode(...uint8Array));
    const pngDataUrl = `data:image/png;base64,${base64}`;
    
    console.log(`[PDF→PNG] Conversion complete. PNG size: ${pngDataUrl.length} chars`);

    return pngDataUrl;

  } catch (error) {
    console.error('[PDF→PNG] Conversion error:', error);
    
    // Enhanced error message with stack trace
    const errorMsg = error instanceof Error 
      ? `${error.message}${error.stack ? `\nStack: ${error.stack}` : ''}` 
      : String(error);
    
    throw new Error(`Failed to convert PDF to image: ${errorMsg}`);
  }
}
