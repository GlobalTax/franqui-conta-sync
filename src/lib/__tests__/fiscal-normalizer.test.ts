import { describe, it, expect, vi, beforeEach } from 'vitest';
import { stripAndNormalize } from '../fiscal-normalizer';

// Mock ocr-utils
vi.mock('../ocr-utils', () => ({
  validateSpanishVAT: (vat: string | null) => {
    if (!vat) return false;
    // Validación simplificada para tests
    return /^[A-Z]\d{8}$|^\d{8}[A-Z]$/.test(vat);
  },
  round2: (num: number) => Math.round(num * 100) / 100,
  round4: (num: number) => Math.round(num * 10000) / 10000,
}));

describe('fiscal-normalizer', () => {
  describe('Normalización de NIF/CIF', () => {
    it('debe normalizar NIF con espacios y guiones', () => {
      // Arrange
      const invoice = {
        issuer_vat_id: ' B-12345678 ',
        receiver_vat_id: '  12345678-A  ',
      };

      // Act
      const result = stripAndNormalize(invoice);

      // Assert
      expect(result.normalized.issuer_vat_id).toBe('B12345678');
      expect(result.normalized.receiver_vat_id).toBe('12345678A');
      expect(result.changes.some(c => c.field === 'issuer_vat_id')).toBe(true);
    });

    it('debe normalizar CIF a uppercase', () => {
      // Arrange
      const invoice = {
        issuer_vat_id: 'a12345678',
        receiver_vat_id: 'b98765432',
      };

      // Act
      const result = stripAndNormalize(invoice);

      // Assert
      expect(result.normalized.issuer_vat_id).toBe('A12345678');
      expect(result.normalized.receiver_vat_id).toBe('B98765432');
    });

    it('debe detectar NIF inválido y añadir warning', () => {
      // Arrange
      const invoice = {
        issuer_vat_id: 'INVALID123',
        receiver_vat_id: 'B12345678',
      };

      // Act
      const result = stripAndNormalize(invoice);

      // Assert
      expect(result.warnings.some(w => w.includes('NIF/CIF emisor inválido'))).toBe(true);
    });

    it('debe normalizar emisor y receptor simultáneamente', () => {
      // Arrange
      const invoice = {
        issuer_vat_id: ' B-12345678 ',
        receiver_vat_id: ' 12345678-A ',
      };

      // Act
      const result = stripAndNormalize(invoice);

      // Assert
      expect(result.normalized.issuer_vat_id).toBe('B12345678');
      expect(result.normalized.receiver_vat_id).toBe('12345678A');
      expect(result.changes.length).toBeGreaterThanOrEqual(2);
    });

    it('debe añadir warning si falta NIF del emisor', () => {
      // Arrange
      const invoice = {
        issuer_vat_id: null,
        receiver_vat_id: 'B12345678',
      };

      // Act
      const result = stripAndNormalize(invoice);

      // Assert
      expect(result.warnings.some(w => w.includes('NIF/CIF emisor requerido'))).toBe(true);
    });
  });

  describe('Normalización de Número de Factura', () => {
    it('debe quitar prefijo "Factura:"', () => {
      // Arrange
      const invoice = {
        invoice_number: 'Factura: 2024-001',
      };

      // Act
      const result = stripAndNormalize(invoice);

      // Assert
      expect(result.normalized.invoice_number).toBe('2024-001');
      expect(result.changes.some(c => c.field === 'invoice_number')).toBe(true);
    });

    it('debe quitar prefijo "Nº", "#", "N°"', () => {
      // Arrange
      const testCases = [
        { input: 'Nº 2024-001', expected: '2024-001' },
        { input: '# 2024-002', expected: '2024-002' },
        { input: 'N° 2024-003', expected: '2024-003' },
      ];

      testCases.forEach(({ input, expected }) => {
        // Act
        const result = stripAndNormalize({ invoice_number: input });

        // Assert
        expect(result.normalized.invoice_number).toBe(expected);
      });
    });

    it('debe normalizar espacios múltiples', () => {
      // Arrange
      const invoice = {
        invoice_number: '  2024   -   001  ',
      };

      // Act
      const result = stripAndNormalize(invoice);

      // Assert
      expect(result.normalized.invoice_number).toBe('2024 - 001');
    });

    it('debe añadir warning si queda vacío después de normalizar', () => {
      // Arrange
      const invoice = {
        invoice_number: '   ',
      };

      // Act
      const result = stripAndNormalize(invoice);

      // Assert
      expect(result.warnings.some(w => w.includes('Número de factura requerido'))).toBe(true);
    });
  });

  describe('Validación de Fechas', () => {
    it('debe aprobar fecha válida dentro de rango', () => {
      // Arrange
      const currentYear = new Date().getFullYear();
      const invoice = {
        issue_date: `${currentYear}-06-15`,
      };

      // Act
      const result = stripAndNormalize(invoice);

      // Assert
      expect(result.warnings.some(w => w.includes('fecha'))).toBe(false);
    });

    it('debe rechazar fecha fuera de rango (±5 años)', () => {
      // Arrange
      const invoice = {
        issue_date: '2010-01-01', // Más de 5 años atrás
      };

      // Act
      const result = stripAndNormalize(invoice);

      // Assert
      expect(result.warnings.some(w => w.includes('fecha') && w.includes('fuera de rango'))).toBe(true);
    });

    it('debe rechazar formato de fecha inválido', () => {
      // Arrange
      const invoice = {
        issue_date: 'invalid-date',
      };

      // Act
      const result = stripAndNormalize(invoice);

      // Assert
      expect(result.warnings.some(w => w.includes('fecha') && w.includes('inválida'))).toBe(true);
    });

    it('debe rechazar due_date anterior a issue_date', () => {
      // Arrange
      const invoice = {
        issue_date: '2024-12-31',
        due_date: '2024-06-01', // Anterior a issue_date
      };

      // Act
      const result = stripAndNormalize(invoice);

      // Assert
      expect(result.warnings.some(w => w.includes('vencimiento anterior'))).toBe(true);
    });

    it('debe añadir warning si falta issue_date', () => {
      // Arrange
      const invoice = {
        issue_date: null,
      };

      // Act
      const result = stripAndNormalize(invoice);

      // Assert
      expect(result.warnings.some(w => w.includes('Fecha de emisión requerida'))).toBe(true);
    });
  });

  describe('Normalización de Importes', () => {
    it('debe redondear importes a 2 decimales (base, VAT, total)', () => {
      // Arrange
      const invoice = {
        subtotal: 100.999,
        tax_total: 21.009,
        total: 122.008,
      };

      // Act
      const result = stripAndNormalize(invoice);

      // Assert
      expect(result.normalized.subtotal).toBe(101.00);
      expect(result.normalized.tax_total).toBe(21.01);
      expect(result.normalized.total).toBe(122.01);
      expect(result.changes.some(c => c.field === 'subtotal')).toBe(true);
    });

    it('debe añadir EUR como moneda por defecto', () => {
      // Arrange
      const invoice = {
        currency: null,
        total: 100,
      };

      // Act
      const result = stripAndNormalize(invoice);

      // Assert
      expect(result.normalized.currency).toBe('EUR');
      expect(result.changes.some(c => c.field === 'currency')).toBe(true);
    });

    it('debe redondear other_taxes', () => {
      // Arrange
      const invoice = {
        other_taxes: 5.999,
      };

      // Act
      const result = stripAndNormalize(invoice);

      // Assert
      expect(result.normalized.other_taxes).toBe(6.00);
    });

    it('debe redondear líneas de factura (quantity, unit_price, amount)', () => {
      // Arrange
      const invoice = {
        lines: [
          {
            description: 'Producto 1',
            quantity: 2.555,
            unit_price: 10.999,
            amount: 28.123,
          },
        ],
      };

      // Act
      const result = stripAndNormalize(invoice);

      // Assert
      expect(result.normalized.lines![0].quantity).toBe(2.56);
      expect(result.normalized.lines![0].unit_price).toBe(11.00);
      expect(result.normalized.lines![0].amount).toBe(28.12);
    });

    it('debe añadir warning si cantidad×precio ≠ importe (línea)', () => {
      // Arrange
      const invoice = {
        lines: [
          {
            description: 'Producto 1',
            quantity: 2,
            unit_price: 10,
            amount: 25, // Incorrecto, debería ser 20
          },
        ],
      };

      // Act
      const result = stripAndNormalize(invoice);

      // Assert
      expect(result.warnings.some(w => w.includes('cantidad × precio'))).toBe(true);
    });

    it('debe registrar cambios en changes array', () => {
      // Arrange
      const invoice = {
        subtotal: 100.999,
        tax_total: 21.009,
      };

      // Act
      const result = stripAndNormalize(invoice);

      // Assert
      expect(result.changes.length).toBeGreaterThan(0);
      expect(result.changes.every(c => c.before !== undefined)).toBe(true);
      expect(result.changes.every(c => c.after !== undefined)).toBe(true);
    });
  });

  describe('Normalización de Razón Social', () => {
    it('debe quitar sufijos "S.A.", "S.L.", "S.L.L."', () => {
      // Arrange
      const testCases = [
        { input: 'ACME Corporation S.A.', expected: 'ACME Corporation' },
        { input: 'Tech Company S.L.', expected: 'Tech Company' },
        { input: 'Business Group S.L.L.', expected: 'Business Group' },
      ];

      testCases.forEach(({ input, expected }) => {
        // Act
        const result = stripAndNormalize({ issuer_legal_name: input });

        // Assert
        expect(result.normalized.issuer_legal_name).toBe(expected);
      });
    });

    it('debe quitar "SOCIEDAD ANÓNIMA", "COMUNIDAD DE BIENES"', () => {
      // Arrange
      const testCases = [
        { input: 'ACME SOCIEDAD ANÓNIMA', expected: 'ACME' },
        { input: 'Partners COMUNIDAD DE BIENES', expected: 'Partners' },
      ];

      testCases.forEach(({ input, expected }) => {
        // Act
        const result = stripAndNormalize({ issuer_legal_name: input });

        // Assert
        expect(result.normalized.issuer_legal_name).toBe(expected);
      });
    });

    it('debe normalizar emisor y receptor simultáneamente', () => {
      // Arrange
      const invoice = {
        issuer_legal_name: 'Company A S.A.',
        receiver_legal_name: 'Company B S.L.',
      };

      // Act
      const result = stripAndNormalize(invoice);

      // Assert
      expect(result.normalized.issuer_legal_name).toBe('Company A');
      expect(result.normalized.receiver_legal_name).toBe('Company B');
    });
  });

  describe('Extracción de Centro', () => {
    it('debe extraer código "M001" de texto', () => {
      // Arrange
      const invoice = {
        issuer_legal_name: "McDonald's M001 Barcelona",
      };

      // Act
      const result = stripAndNormalize(invoice);

      // Assert
      expect(result.normalized.centre_code).toBe('M001');
    });

    it('debe extraer código "MC-001" de texto', () => {
      // Arrange
      const invoice = {
        issuer_legal_name: 'Centro MC-001',
      };

      // Act
      const result = stripAndNormalize(invoice);

      // Assert
      expect(result.normalized.centre_code).toBe('MC-001');
    });

    it('debe extraer código de patrones "CENTRO 001", "TIENDA M001"', () => {
      // Arrange
      const testCases = [
        { input: 'CENTRO 001 Madrid', expected: '001' },
        { input: 'TIENDA M001', expected: 'M001' },
      ];

      testCases.forEach(({ input, expected }) => {
        // Act
        const result = stripAndNormalize({ issuer_legal_name: input });

        // Assert
        expect(result.normalized.centre_code).toBe(expected);
      });
    });
  });

  describe('Validación de Estructura', () => {
    it('debe retornar objeto con normalized, changes, warnings', () => {
      // Arrange
      const invoice = {
        issuer_vat_id: ' B-12345678 ',
        total: 100.999,
      };

      // Act
      const result = stripAndNormalize(invoice);

      // Assert
      expect(result).toHaveProperty('normalized');
      expect(result).toHaveProperty('changes');
      expect(result).toHaveProperty('warnings');
      expect(Array.isArray(result.changes)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('debe preservar datos originales no modificados', () => {
      // Arrange
      const invoice = {
        issuer_vat_id: 'B12345678',
        invoice_number: '2024-001',
        custom_field: 'should_be_preserved',
      };

      // Act
      const result = stripAndNormalize(invoice);

      // Assert
      expect(result.normalized.custom_field).toBe('should_be_preserved');
    });
  });
});
