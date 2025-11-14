// ============================================================================
// PDF TO IMAGE CONVERTER
// Converts PDF documents to PNG images for OpenAI Vision API compatibility
// ============================================================================

import { createCanvas } from "https://deno.land/x/canvas@v1.4.1/mod.ts";

/**
 * Converts a base64-encoded PDF to a PNG image data URI
 * Only processes the first page (sufficient for most invoices)
 * 
 * @param base64Pdf - Base64-encoded PDF content (without data URI prefix)
 * @returns Data URI string: data:image/png;base64,...
 */
export async function convertPdfToImage(base64Pdf: string): Promise<string> {
  console.log('[PDF→PNG] Starting conversion...');
  
  try {
    // 1. Decode base64 to bytes
    const binaryString = atob(base64Pdf);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    console.log(`[PDF→PNG] Decoded ${bytes.length} bytes`);

    // 2. Load PDF using pdfjs-dist
    const pdfjsLib = await import('https://esm.sh/pdfjs-dist@4.0.379');
    
    // Configure worker (required for pdfjs)
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.js';

    const loadingTask = pdfjsLib.getDocument({ data: bytes });
    const pdfDocument = await loadingTask.promise;
    console.log(`[PDF→PNG] Loaded PDF with ${pdfDocument.numPages} page(s)`);

    // 3. Get first page
    const page = await pdfDocument.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 }); // 2x scale for better quality

    console.log(`[PDF→PNG] Page dimensions: ${viewport.width}x${viewport.height}`);

    // 4. Create canvas and render
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    await page.render(renderContext).promise;
    console.log('[PDF→PNG] Page rendered to canvas');

    // 5. Convert canvas to PNG base64
    const pngDataUrl = canvas.toDataURL('image/png');
    console.log(`[PDF→PNG] Conversion complete. PNG size: ${pngDataUrl.length} chars`);

    return pngDataUrl; // Returns: data:image/png;base64,...

  } catch (error) {
    console.error('[PDF→PNG] Conversion error:', error);
    throw new Error(`Failed to convert PDF to image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
