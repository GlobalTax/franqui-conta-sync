/**
 * Storage Utilities para Supabase Edge Functions (Deno)
 * Compatible con Web Crypto API y estructura de carpetas del proyecto
 */

/**
 * Genera una ruta estructurada para almacenar PDFs de facturas en Supabase Storage
 * 
 * @example
 * buildInvoicePath({
 *   invoiceType: 'received',
 *   centroCode: '1252',
 *   originalName: 'factura_proveedor.pdf',
 *   date: new Date()
 * })
 * // => "received/1252/2025/01/550e8400-e29b-41d4-a716-446655440000_factura_proveedor.pdf"
 */
export function buildInvoicePath(params: {
  invoiceType: 'received' | 'issued';
  centroCode?: string;     // Opcional - prioridad #1
  companyId?: string;      // Opcional - prioridad #2
  originalName?: string;
  invoiceId?: string;
  date?: Date;
}): string {
  const date = params.date ?? new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  
  // Web Crypto API (compatible Deno y navegador)
  const uid = crypto.randomUUID();
  
  // Sanitizar nombre del archivo original
  const baseName = params.originalName 
    ? params.originalName.replace(/[^\w.-]/g, '_').slice(0, 50)
    : params.invoiceId 
    ? `invoice_${params.invoiceId}`
    : 'document';
  
  // Prioridad: centroCode > companyId > 'unassigned'
  const identifier = params.centroCode || params.companyId || 'unassigned';
  
  return `${params.invoiceType}/${identifier}/${yyyy}/${mm}/${uid}_${baseName}.pdf`;
}

/**
 * Valida que una ruta sea un PDF válido
 * 
 * @throws {Error} Si la ruta es inválida o no es PDF
 */
export function ensurePdfPath(path?: string | null): string {
  if (!path || typeof path !== 'string') {
    throw new Error('OCR: ruta de archivo requerida');
  }
  
  if (!/\.pdf$/i.test(path)) {
    throw new Error(`OCR: el archivo debe ser PDF (recibido: ${path})`);
  }
  
  return path;
}

/**
 * Extrae metadata de una ruta de PDF de invoice
 * 
 * @example
 * parseInvoicePath('received/1252/2025/01/uuid_factura.pdf')
 * // => { type: 'received', centroCode: '1252', year: 2025, month: 1, filename: 'uuid_factura.pdf' }
 */
export function parseInvoicePath(path: string): {
  type: 'received' | 'issued';
  centroCode: string;
  year: number;
  month: number;
  filename: string;
  uuid?: string;
  originalName?: string;
} | null {
  const regex = /^(received|issued)\/([^/]+)\/(\d{4})\/(\d{2})\/(.+)\.pdf$/i;
  const match = path.match(regex);
  
  if (!match) return null;
  
  const [, type, centroCode, yearStr, monthStr, filename] = match;
  const [uuid, ...nameParts] = filename.split('_');
  
  return {
    type: type as 'received' | 'issued',
    centroCode,
    year: parseInt(yearStr, 10),
    month: parseInt(monthStr, 10),
    filename: `${filename}.pdf`,
    uuid: uuid.length === 36 ? uuid : undefined,
    originalName: nameParts.length > 0 ? nameParts.join('_') : undefined,
  };
}

/**
 * Genera hash SHA-256 de un path para cacheo y validación
 * 
 * @example
 * await hashFilePath('received/1252/2025/01/uuid_factura.pdf')
 * // => "a3f5b2c1d4e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2"
 */
export async function hashFilePath(path: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(path);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Valida y normaliza un path de PDF, extrayendo metadata
 * 
 * @throws {Error} Si el path es inválido
 * @returns Path validado y metadata extraída
 */
export function validateAndNormalizePath(path: string): {
  validPath: string;
  metadata: ReturnType<typeof parseInvoicePath>;
} {
  // Validar que sea PDF
  const validPath = ensurePdfPath(path);
  
  // Extraer metadata
  const metadata = parseInvoicePath(validPath);
  
  if (!metadata) {
    throw new Error(`OCR: formato de path inválido. Esperado: {type}/{centro}/{yyyy}/{mm}/{uuid}_{nombre}.pdf, recibido: ${path}`);
  }
  
  return { validPath, metadata };
}
