/**
 * Centro detection utilities for McDonald's invoices
 * Detects "Site: XXX - Name" patterns and maps to internal centro codes
 */

export interface CentroMapping {
  siteNumber: string;
  centroCode: string;
  restaurantName: string;
}

// Auto-populated from actual database or config
// For now, we'll use a simple 1:1 mapping (site = centro)
const DEFAULT_SITE_TO_CENTRO: Record<string, string> = {
  '707': '707',
  '1252': '1252',
  // Add more mappings as needed
};

/**
 * Extract site number from invoice text
 * Looks for patterns like "Site: 707 - HOSPITALET BELLVITGE"
 */
export function extractSiteNumber(text: string): string | null {
  // Pattern 1: "Site: 707 - NAME"
  const siteMatch = text.match(/Site:\s*(\d+)\s*-/i);
  if (siteMatch) {
    return siteMatch[1];
  }

  // Pattern 2: "707 - HOSPITALET BELLVITGE" (without "Site:" prefix)
  const numberMatch = text.match(/^\s*(\d{3,4})\s*-\s*[A-Z]/m);
  if (numberMatch) {
    return numberMatch[1];
  }

  return null;
}

/**
 * Map site number to centro code
 */
export function mapSiteToCentro(
  siteNumber: string,
  customMappings?: Record<string, string>
): string | null {
  const mappings = customMappings || DEFAULT_SITE_TO_CENTRO;
  return mappings[siteNumber] || siteNumber; // Fallback to site number if no mapping
}

/**
 * Auto-detect centro from invoice OCR data
 */
export function autoDetectCentro(
  ocrText: string,
  ocrData?: any,
  customMappings?: Record<string, string>
): { centroCode: string | null; confidence: 'high' | 'medium' | 'low' } {
  // First try to extract from raw text
  const siteNumber = extractSiteNumber(ocrText);
  
  if (siteNumber) {
    const centroCode = mapSiteToCentro(siteNumber, customMappings);
    return {
      centroCode,
      confidence: 'high',
    };
  }

  // Try to extract from structured OCR data if available
  if (ocrData?.customer_address) {
    const addressSite = extractSiteNumber(ocrData.customer_address);
    if (addressSite) {
      return {
        centroCode: mapSiteToCentro(addressSite, customMappings),
        confidence: 'medium',
      };
    }
  }

  return {
    centroCode: null,
    confidence: 'low',
  };
}

/**
 * Validate centro code exists in database
 */
export async function validateCentroCode(centroCode: string): Promise<boolean> {
  // This would check against actual DB - for now, just basic validation
  return /^\d{3,4}$/.test(centroCode);
}
