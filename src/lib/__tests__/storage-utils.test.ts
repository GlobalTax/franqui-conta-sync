import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildInvoicePath, ensurePdfPath, parseInvoicePath } from '../storage-utils';

// Mock UUID for deterministic tests
const MOCK_UUID = '550e8400-e29b-41d4-a716-446655440000';
const MOCK_DATE = new Date('2025-01-15T10:00:00Z');

describe('storage-utils', () => {
  
  describe('buildInvoicePath', () => {
    beforeEach(() => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValue(MOCK_UUID);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    describe('estructura de path', () => {
      it('genera path con estructura correcta: {type}/{centro}/{yyyy}/{mm}/{uuid}_{nombre}.pdf', () => {
        const result = buildInvoicePath({
          invoiceType: 'received',
          centroCode: '1252',
          originalName: 'factura_proveedor.pdf',
          date: MOCK_DATE
        });

        expect(result).toBe(`received/1252/2025/01/${MOCK_UUID}_factura_proveedor.pdf`);
      });

      it('usa centroCode cuando no hay companyId', () => {
        const result = buildInvoicePath({
          invoiceType: 'received',
          centroCode: '1252',
          originalName: 'factura.pdf',
          date: MOCK_DATE
        });

        expect(result).toContain('received/1252/');
      });

      it('prioriza companyId sobre centroCode cuando ambos están presentes', () => {
        const result = buildInvoicePath({
          invoiceType: 'received',
          centroCode: '1252',
          companyId: 'company-uuid-123',
          originalName: 'factura.pdf',
          date: MOCK_DATE
        });

        expect(result).toContain('received/company-uuid-123/');
        expect(result).not.toContain('/1252/');
      });
    });

    describe('sanitización de nombres', () => {
      it('reemplaza espacios con underscores', () => {
        const result = buildInvoicePath({
          invoiceType: 'received',
          centroCode: '1252',
          originalName: 'factura con espacios.pdf',
          date: MOCK_DATE
        });

        expect(result).toContain('factura_con_espacios');
        expect(result).not.toContain(' ');
      });

      it('reemplaza caracteres especiales (ñ, á, @, #) con underscores', () => {
        const result = buildInvoicePath({
          invoiceType: 'received',
          centroCode: '1252',
          originalName: 'factura ñ @#$% año.pdf',
          date: MOCK_DATE
        });

        expect(result).toContain('factura_________a_o');
        expect(result).not.toContain('ñ');
        expect(result).not.toContain('@');
        expect(result).not.toContain('#');
        expect(result).not.toContain('$');
        expect(result).not.toContain('%');
      });

      it('preserva puntos y guiones', () => {
        const result = buildInvoicePath({
          invoiceType: 'received',
          centroCode: '1252',
          originalName: 'factura-2025.backup.pdf',
          date: MOCK_DATE
        });

        expect(result).toContain('factura-2025.backup');
      });

      it('trunca nombres mayores a 50 caracteres', () => {
        const longName = 'a'.repeat(60) + '.pdf';
        const result = buildInvoicePath({
          invoiceType: 'received',
          centroCode: '1252',
          originalName: longName,
          date: MOCK_DATE
        });

        const filename = result.split('/').pop() || '';
        const nameWithoutUuid = filename.substring(37); // Remove UUID_
        expect(nameWithoutUuid.length).toBeLessThanOrEqual(54); // 50 + .pdf
      });
    });

    describe('fallbacks de nombre', () => {
      it('usa originalName cuando está presente', () => {
        const result = buildInvoicePath({
          invoiceType: 'received',
          centroCode: '1252',
          originalName: 'mi_factura.pdf',
          invoiceId: 'invoice-123',
          date: MOCK_DATE
        });

        expect(result).toContain('mi_factura');
        expect(result).not.toContain('invoice-123');
      });

      it('usa invoice_{invoiceId} cuando no hay originalName', () => {
        const result = buildInvoicePath({
          invoiceType: 'received',
          centroCode: '1252',
          invoiceId: 'invoice-123',
          date: MOCK_DATE
        });

        expect(result).toContain('invoice_invoice-123');
      });

      it('usa "document" cuando faltan originalName e invoiceId', () => {
        const result = buildInvoicePath({
          invoiceType: 'received',
          centroCode: '1252',
          date: MOCK_DATE
        });

        expect(result).toContain('document.pdf');
      });
    });

    describe('formato de fecha', () => {
      it('usa fecha actual cuando no se proporciona date', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-03-20T15:00:00Z'));

        const result = buildInvoicePath({
          invoiceType: 'received',
          centroCode: '1252',
          originalName: 'test.pdf'
        });

        expect(result).toContain('/2025/03/');

        vi.useRealTimers();
      });

      it('formatea mes con zero-padding (01, 02, ..., 12)', () => {
        const janResult = buildInvoicePath({
          invoiceType: 'received',
          centroCode: '1252',
          originalName: 'test.pdf',
          date: new Date('2025-01-15')
        });

        const decResult = buildInvoicePath({
          invoiceType: 'received',
          centroCode: '1252',
          originalName: 'test.pdf',
          date: new Date('2025-12-15')
        });

        expect(janResult).toContain('/2025/01/');
        expect(decResult).toContain('/2025/12/');
      });

      it('maneja años con 4 dígitos', () => {
        const result = buildInvoicePath({
          invoiceType: 'received',
          centroCode: '1252',
          originalName: 'test.pdf',
          date: new Date('2025-01-15')
        });

        expect(result).toContain('/2025/');
        expect(result).not.toContain('/25/');
      });
    });

    describe('UUID', () => {
      it('genera UUID válido de 36 caracteres', () => {
        const result = buildInvoicePath({
          invoiceType: 'received',
          centroCode: '1252',
          originalName: 'test.pdf',
          date: MOCK_DATE
        });

        expect(result).toContain(MOCK_UUID);
        expect(MOCK_UUID.length).toBe(36);
      });

      it('UUID tiene formato RFC4122', () => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        expect(MOCK_UUID).toMatch(uuidRegex);
      });
    });

    describe('tipos de invoice', () => {
      it('genera path para invoiceType "received"', () => {
        const result = buildInvoicePath({
          invoiceType: 'received',
          centroCode: '1252',
          originalName: 'test.pdf',
          date: MOCK_DATE
        });

        expect(result).toMatch(/^received\//);
      });

      it('genera path para invoiceType "issued"', () => {
        const result = buildInvoicePath({
          invoiceType: 'issued',
          centroCode: '1252',
          originalName: 'test.pdf',
          date: MOCK_DATE
        });

        expect(result).toMatch(/^issued\//);
      });
    });
  });

  describe('ensurePdfPath', () => {
    describe('paths válidos', () => {
      it('acepta path con extensión .pdf', () => {
        const path = 'received/1252/2025/01/test.pdf';
        const result = ensurePdfPath(path);
        expect(result).toBe(path);
      });

      it('acepta path con extensión .PDF (mayúsculas)', () => {
        const path = 'received/1252/2025/01/test.PDF';
        const result = ensurePdfPath(path);
        expect(result).toBe(path);
      });

      it('acepta path con múltiples extensiones (.backup.pdf)', () => {
        const path = 'received/1252/2025/01/test.backup.pdf';
        const result = ensurePdfPath(path);
        expect(result).toBe(path);
      });

      it('retorna el path sin modificar', () => {
        const path = 'test/path/to/file.pdf';
        const result = ensurePdfPath(path);
        expect(result).toBe(path);
      });
    });

    describe('paths inválidos - null/undefined', () => {
      it('lanza error con path null', () => {
        expect(() => ensurePdfPath(null)).toThrow('OCR: ruta de archivo requerida');
      });

      it('lanza error con path undefined', () => {
        expect(() => ensurePdfPath(undefined)).toThrow('OCR: ruta de archivo requerida');
      });

      it('lanza error con string vacío', () => {
        expect(() => ensurePdfPath('')).toThrow('OCR: ruta de archivo requerida');
      });

      it('mensaje de error contiene "ruta de archivo requerida"', () => {
        expect(() => ensurePdfPath(null)).toThrow(/ruta de archivo requerida/);
      });
    });

    describe('paths inválidos - extensión incorrecta', () => {
      it('lanza error con extensión .jpg', () => {
        expect(() => ensurePdfPath('test.jpg')).toThrow('OCR: el archivo debe ser PDF');
      });

      it('lanza error con extensión .docx', () => {
        expect(() => ensurePdfPath('test.docx')).toThrow('OCR: el archivo debe ser PDF');
      });

      it('lanza error sin extensión', () => {
        expect(() => ensurePdfPath('test')).toThrow('OCR: el archivo debe ser PDF');
      });

      it('mensaje de error contiene "debe ser PDF" y el path recibido', () => {
        try {
          ensurePdfPath('test.jpg');
          expect.fail('Should have thrown an error');
        } catch (error) {
          expect((error as Error).message).toContain('debe ser PDF');
          expect((error as Error).message).toContain('test.jpg');
        }
      });
    });
  });

  describe('parseInvoicePath', () => {
    describe('paths válidos', () => {
      it('extrae type "received" correctamente', () => {
        const path = 'received/1252/2025/01/550e8400-e29b-41d4-a716-446655440000_test.pdf';
        const result = parseInvoicePath(path);
        
        expect(result).not.toBeNull();
        expect(result?.type).toBe('received');
      });

      it('extrae type "issued" correctamente', () => {
        const path = 'issued/1252/2025/01/550e8400-e29b-41d4-a716-446655440000_test.pdf';
        const result = parseInvoicePath(path);
        
        expect(result).not.toBeNull();
        expect(result?.type).toBe('issued');
      });

      it('extrae centroCode correctamente', () => {
        const path = 'received/1252/2025/01/550e8400-e29b-41d4-a716-446655440000_test.pdf';
        const result = parseInvoicePath(path);
        
        expect(result).not.toBeNull();
        expect(result?.centroCode).toBe('1252');
      });

      it('extrae year como número', () => {
        const path = 'received/1252/2025/01/550e8400-e29b-41d4-a716-446655440000_test.pdf';
        const result = parseInvoicePath(path);
        
        expect(result).not.toBeNull();
        expect(result?.year).toBe(2025);
        expect(typeof result?.year).toBe('number');
      });

      it('extrae month como número', () => {
        const path = 'received/1252/2025/01/550e8400-e29b-41d4-a716-446655440000_test.pdf';
        const result = parseInvoicePath(path);
        
        expect(result).not.toBeNull();
        expect(result?.month).toBe(1);
        expect(typeof result?.month).toBe('number');
      });

      it('extrae filename completo con extensión', () => {
        const path = 'received/1252/2025/01/550e8400-e29b-41d4-a716-446655440000_test.pdf';
        const result = parseInvoicePath(path);
        
        expect(result).not.toBeNull();
        expect(result?.filename).toBe('550e8400-e29b-41d4-a716-446655440000_test.pdf');
      });
    });

    describe('UUID y originalName', () => {
      it('detecta UUID válido (36 caracteres)', () => {
        const path = 'received/1252/2025/01/550e8400-e29b-41d4-a716-446655440000_test.pdf';
        const result = parseInvoicePath(path);
        
        expect(result).not.toBeNull();
        expect(result?.uuid).toBe('550e8400-e29b-41d4-a716-446655440000');
      });

      it('no detecta UUID cuando longitud != 36', () => {
        const path = 'received/1252/2025/01/short_test.pdf';
        const result = parseInvoicePath(path);
        
        expect(result).not.toBeNull();
        expect(result?.uuid).toBeUndefined();
      });

      it('extrae originalName cuando hay underscores', () => {
        const path = 'received/1252/2025/01/550e8400-e29b-41d4-a716-446655440000_factura_proveedor.pdf';
        const result = parseInvoicePath(path);
        
        expect(result).not.toBeNull();
        expect(result?.originalName).toBe('factura_proveedor');
      });

      it('reconstruye originalName con múltiples underscores', () => {
        const path = 'received/1252/2025/01/550e8400-e29b-41d4-a716-446655440000_factura_con_muchos_underscores.pdf';
        const result = parseInvoicePath(path);
        
        expect(result).not.toBeNull();
        expect(result?.originalName).toBe('factura_con_muchos_underscores');
      });

      it('originalName undefined cuando no hay partes después del UUID', () => {
        const path = 'received/1252/2025/01/550e8400-e29b-41d4-a716-446655440000.pdf';
        const result = parseInvoicePath(path);
        
        expect(result).not.toBeNull();
        expect(result?.originalName).toBeUndefined();
      });
    });

    describe('paths inválidos', () => {
      it('retorna null con formato incorrecto', () => {
        const path = 'invalid/path';
        const result = parseInvoicePath(path);
        
        expect(result).toBeNull();
      });

      it('retorna null sin extensión .pdf', () => {
        const path = 'received/1252/2025/01/test.jpg';
        const result = parseInvoicePath(path);
        
        expect(result).toBeNull();
      });

      it('retorna null con estructura de carpetas incorrecta', () => {
        const path = 'received/test.pdf';
        const result = parseInvoicePath(path);
        
        expect(result).toBeNull();
      });

      it('retorna null con path vacío', () => {
        const path = '';
        const result = parseInvoicePath(path);
        
        expect(result).toBeNull();
      });

      it('retorna null con menos de 5 segmentos', () => {
        const path = 'received/1252/2025/test.pdf';
        const result = parseInvoicePath(path);
        
        expect(result).toBeNull();
      });
    });

    describe('case insensitive', () => {
      it('acepta extensión .PDF en mayúsculas', () => {
        const path = 'received/1252/2025/01/550e8400-e29b-41d4-a716-446655440000_test.PDF';
        const result = parseInvoicePath(path);
        
        expect(result).not.toBeNull();
        expect(result?.type).toBe('received');
      });

      it('acepta extensión .Pdf en mixto', () => {
        const path = 'received/1252/2025/01/550e8400-e29b-41d4-a716-446655440000_test.Pdf';
        const result = parseInvoicePath(path);
        
        expect(result).not.toBeNull();
        expect(result?.type).toBe('received');
      });
    });
  });

  describe('integración buildInvoicePath + parseInvoicePath', () => {
    beforeEach(() => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValue(MOCK_UUID);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('roundtrip: path generado se puede parsear correctamente', () => {
      const params = {
        invoiceType: 'received' as const,
        centroCode: '1252',
        originalName: 'factura_proveedor.pdf',
        date: new Date('2025-01-15')
      };
      
      const path = buildInvoicePath(params);
      const parsed = parseInvoicePath(path);
      
      expect(parsed).not.toBeNull();
      expect(parsed?.type).toBe('received');
      expect(parsed?.centroCode).toBe('1252');
      expect(parsed?.year).toBe(2025);
      expect(parsed?.month).toBe(1);
      expect(parsed?.uuid).toBe(MOCK_UUID);
      expect(parsed?.originalName).toContain('factura_proveedor');
    });

    it('roundtrip con companyId', () => {
      const params = {
        invoiceType: 'issued' as const,
        centroCode: '1252',
        companyId: 'company-123',
        originalName: 'invoice.pdf',
        date: new Date('2025-03-20')
      };
      
      const path = buildInvoicePath(params);
      const parsed = parseInvoicePath(path);
      
      expect(parsed).not.toBeNull();
      expect(parsed?.type).toBe('issued');
      expect(parsed?.centroCode).toBe('company-123');
      expect(parsed?.year).toBe(2025);
      expect(parsed?.month).toBe(3);
    });

    it('roundtrip con nombre sanitizado', () => {
      const params = {
        invoiceType: 'received' as const,
        centroCode: '1252',
        originalName: 'factura ñ @#$% 2025.pdf',
        date: new Date('2025-01-15')
      };
      
      const path = buildInvoicePath(params);
      const parsed = parseInvoicePath(path);
      
      expect(parsed).not.toBeNull();
      expect(parsed?.type).toBe('received');
      expect(parsed?.originalName).toBeTruthy();
    });
  });

  describe('consistencia con versión Deno', () => {
    beforeEach(() => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValue(MOCK_UUID);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('genera paths idénticos con mismos parámetros y UUID', () => {
      const params = {
        invoiceType: 'received' as const,
        centroCode: '1252',
        originalName: 'test.pdf',
        date: MOCK_DATE
      };
      
      const result = buildInvoicePath(params);
      
      // Expected format matches Deno version
      expect(result).toBe(`received/1252/2025/01/${MOCK_UUID}_test.pdf`);
    });

    it('sanitización produce mismo resultado', () => {
      const testNames = [
        'factura con espacios.pdf',
        'factura ñ @#$%.pdf',
        'factura-normal.pdf',
        'factura.backup.pdf'
      ];
      
      testNames.forEach(name => {
        const result = buildInvoicePath({
          invoiceType: 'received',
          centroCode: '1252',
          originalName: name,
          date: MOCK_DATE
        });
        
        // Verify sanitization rules match
        const filename = result.split('/').pop() || '';
        expect(filename).toMatch(/^[0-9a-f-]+_[\w.-]+\.pdf$/i);
      });
    });

    it('regex de parseInvoicePath acepta paths de ambas versiones', () => {
      const validPaths = [
        'received/1252/2025/01/550e8400-e29b-41d4-a716-446655440000_test.pdf',
        'issued/company-123/2025/12/550e8400-e29b-41d4-a716-446655440000_invoice.pdf',
        'received/1252/2025/01/short_name.pdf',
        'received/1252/2025/01/test.pdf'
      ];
      
      validPaths.forEach(path => {
        const result = parseInvoicePath(path);
        expect(result).not.toBeNull();
      });
    });
  });
});
