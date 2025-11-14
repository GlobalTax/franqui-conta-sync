/**
 * Client-side PDF to PNG converter using pdfjs-dist
 * Converts PDF pages to PNG data URLs for OCR processing
 */

import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure worker using local file
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const DEFAULT_SCALE = 2.0; // 2x for good quality OCR
const MAX_DIMENSION = 1920; // Prevent huge images

/**
 * Convert PDF file to PNG data URL (first page only)
 * @param file PDF file to convert
 * @returns PNG data URL (data:image/png;base64,...)
 */
export async function convertPdfToPngClient(file: File): Promise<string> {
  console.log('[PDF→PNG Client] Starting conversion...');
  const startTime = Date.now();

  try {
    // Load PDF
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    console.log(`[PDF→PNG Client] Loaded PDF with ${pdf.numPages} page(s)`);

    // Get first page
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: DEFAULT_SCALE });

    // Calculate dimensions (limit max size)
    let { width, height } = viewport;
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      const scale = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
      width *= scale;
      height *= scale;
    }

    console.log(`[PDF→PNG Client] Rendering at ${Math.round(width)}x${Math.round(height)}`);

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width);
    canvas.height = Math.round(height);
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Could not get 2D context from canvas');
    }

    // Render PDF page to canvas
    const renderContext = {
      canvasContext: context,
      viewport: page.getViewport({ scale: width / viewport.width }),
      canvas: canvas
    };

    await page.render(renderContext).promise;

    // Convert to PNG data URL
    const dataUrl = canvas.toDataURL('image/png', 0.92);
    const elapsed = Date.now() - startTime;

    console.log(`[PDF→PNG Client] ✓ Conversion complete in ${elapsed}ms`);
    console.log(`[PDF→PNG Client] Output size: ${Math.round(dataUrl.length / 1024)}KB`);

    return dataUrl;

  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[PDF→PNG Client] ✗ Conversion failed after ${elapsed}ms:`, error);
    throw new Error(`Failed to convert PDF to image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert multiple PDF pages to PNG data URLs
 * @param file PDF file to convert
 * @param maxPages Maximum number of pages to convert (default: 1)
 * @returns Array of PNG data URLs
 */
export async function convertPdfPagesToPng(file: File, maxPages: number = 1): Promise<string[]> {
  console.log('[PDF→PNG Client] Starting multi-page conversion...');
  const startTime = Date.now();

  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    const pagesToConvert = Math.min(maxPages, pdf.numPages);
    console.log(`[PDF→PNG Client] Converting ${pagesToConvert} of ${pdf.numPages} page(s)`);

    const dataUrls: string[] = [];

    for (let pageNum = 1; pageNum <= pagesToConvert; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: DEFAULT_SCALE });

      let { width, height } = viewport;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const scale = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width *= scale;
        height *= scale;
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width);
      canvas.height = Math.round(height);
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error(`Could not get 2D context for page ${pageNum}`);
      }

      const renderContext = {
        canvasContext: context,
        viewport: page.getViewport({ scale: width / viewport.width }),
        canvas: canvas
      };

      await page.render(renderContext).promise;
      const dataUrl = canvas.toDataURL('image/png', 0.92);
      dataUrls.push(dataUrl);

      console.log(`[PDF→PNG Client] ✓ Page ${pageNum} converted (${Math.round(dataUrl.length / 1024)}KB)`);
    }

    const elapsed = Date.now() - startTime;
    console.log(`[PDF→PNG Client] ✓ Multi-page conversion complete in ${elapsed}ms`);

    return dataUrls;

  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[PDF→PNG Client] ✗ Multi-page conversion failed after ${elapsed}ms:`, error);
    throw new Error(`Failed to convert PDF pages: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
