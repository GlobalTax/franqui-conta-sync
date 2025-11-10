/**
 * Hash Utilities for OCR Cache System
 * Provides SHA-256 hashing and structural hashing for multi-level cache
 */

/**
 * Create SHA-256 hash of PDF content for L1 exact cache matching
 */
export async function createDocumentHash(base64Content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(base64Content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Create structural hash based on key invoice fields for L2 cache matching
 * This allows matching invoices with same NIF + Number + Date even if PDF differs
 */
export function createStructuralHash(
  supplierVat: string | null,
  invoiceNumber: string | null,
  invoiceDate: string | null
): string {
  const normalized = `${(supplierVat || '').toUpperCase().trim()}|${(invoiceNumber || '').trim()}|${invoiceDate || ''}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  
  // Simple hash for cache key (not cryptographic)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data[i];
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Extract quick metadata from PDF content
 * Used for cache statistics and page count estimation
 */
export function extractQuickMetadata(base64Content: string): {
  fileSize: number;
  pageCount: number;
} {
  const sizeBytes = Math.ceil(base64Content.length * 0.75); // Base64 → bytes approximation
  
  // Count pages by searching for "/Type /Page" in PDF
  try {
    const decoded = atob(base64Content);
    const pageMatches = decoded.match(/\/Type\s*\/Page[^s]/g);
    const pageCount = pageMatches ? pageMatches.length : 1;
    
    return {
      fileSize: sizeBytes,
      pageCount
    };
  } catch (error) {
    // Fallback if decoding fails
    return {
      fileSize: sizeBytes,
      pageCount: 1
    };
  }
}
