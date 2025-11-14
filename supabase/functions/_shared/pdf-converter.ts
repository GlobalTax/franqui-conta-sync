// ============================================================================
// PDF CONVERTER - Placeholder for PDF to image conversion
// TODO: Implement proper canvas-based conversion for Deno
// ============================================================================

/**
 * TEMPORARY: PDF conversion not fully implemented yet
 * For PDFs, the system will automatically fallback to Mindee
 */
export async function convertPdfToImages(
  pdfBytes: Uint8Array,
  maxPages: number = 3
): Promise<{ images: string[]; mimeType: string }> {
  
  console.log(`[PDF Converter] PDF to image conversion requested but not yet fully implemented`);
  console.log(`[PDF Converter] Will fallback to Mindee for PDF processing`);
  
  // Throw error to trigger fallback to Mindee
  throw new Error('PDF to image conversion not yet available in Deno - use Mindee for PDF files');
}
