import { describe, it, expect } from 'vitest';
import { Norma43Parser } from '../Norma43Parser';

describe('Norma43Parser', () => {
  describe('isValidFormat', () => {
    it('debe validar formato Norma43 correcto', () => {
      const content = `11000012341234567890250101250131
220001234567890250115251151001000000010000120000000001234REF1234567890
88000000010000000001000012000000000000000001
`;
      expect(Norma43Parser.isValidFormat(content)).toBe(true);
    });

    it('debe rechazar formato inválido sin cabecera', () => {
      const content = `220001234567890250115251151001000000010000120000000001234REF1234567890
88000000010000000001000012000000000000000001
`;
      expect(Norma43Parser.isValidFormat(content)).toBe(false);
    });

    it('debe rechazar formato inválido sin footer', () => {
      const content = `11000012341234567890250101250131
220001234567890250115251151001000000010000120000000001234REF1234567890
`;
      expect(Norma43Parser.isValidFormat(content)).toBe(false);
    });

    it('debe rechazar contenido muy corto', () => {
      const content = `11
22
`;
      expect(Norma43Parser.isValidFormat(content)).toBe(false);
    });
  });

  describe('parse', () => {
    it('debe parsear cabecera válida correctamente', () => {
      const content = `11000012341234567890250101250131000000000000000000000000000000000000000000010000120000000000000000200002101
88000000000000000000000000000000000000000000000001
`;
      const result = Norma43Parser.parse(content);
      
      expect(result.header.bankCode).toBe('0001');
      expect(result.header.officeCode).toBe('2341');
      expect(result.header.accountNumber).toBe('2345678902');
      expect(result.header.startDate).toBe('2025-01-01');
      expect(result.header.endDate).toBe('2025-01-31');
      expect(result.header.initialBalance).toBe(-100.00);
      expect(result.header.finalBalance).toBe(-200.00);
    });

    it('debe parsear transacción con importe positivo (haber)', () => {
      const content = `11000012341234567890250101250131000000000000000000000000000000000000000000000000000000000000000000000001
220001234567890250115251151001000000010000120000000001234REF1234567890
88000000010000000001000012000000000000000001
`;
      const result = Norma43Parser.parse(content);
      
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].amount).toBe(100.00);
      expect(result.transactions[0].transactionDate).toBe('2025-01-15');
    });

    it('debe parsear transacción con importe negativo (debe)', () => {
      const content = `11000012341234567890250101250131000000000000000000000000000000000000000000000000000000000000000000000001
220001234567890250115251151001000000010000220000000001234REF1234567890
88000000010000000001000012000000000000000001
`;
      const result = Norma43Parser.parse(content);
      
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].amount).toBe(-100.00);
    });

    it('debe parsear concepto adicional (tipo 23)', () => {
      const content = `11000012341234567890250101250131000000000000000000000000000000000000000000000000000000000000000000000001
220001234567890250115251151001000000010000120000000001234REF1234567890
23  PAGO FACTURA FRA-2025-001              PROVEEDOR EJEMPLO SA             
88000000010000000001000012000000000000000001
`;
      const result = Norma43Parser.parse(content);
      
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].description).toContain('PAGO FACTURA');
      expect(result.transactions[0].description).toContain('PROVEEDOR EJEMPLO');
    });

    it('debe calcular totales correctamente', () => {
      const content = `11000012341234567890250101250131000000000000000000000000000000000000000000000000000000000000000000000001
220001234567890250115251151001000000010000120000000001234REF1             
220001234567890250116251161001000000005000220000000001235REF2             
220001234567890250117251171001000000015000120000000001236REF3             
88000000030000000005000020000000001600001
`;
      const result = Norma43Parser.parse(content);
      
      expect(result.summary.transactionsCount).toBe(3);
      expect(result.summary.totalCredits).toBe(250.00); // 100 + 150
      expect(result.summary.totalDebits).toBe(50.00);
    });

    it('debe validar count de transacciones en footer', () => {
      const content = `11000012341234567890250101250131000000000000000000000000000000000000000000000000000000000000000000000001
220001234567890250115251151001000000010000120000000001234REF1             
88000000020000000001000012000000000000000001
`;
      const result = Norma43Parser.parse(content);
      
      expect(result.errors).toContain(expect.stringContaining('Total de movimientos no coincide'));
    });

    it('debe manejar líneas mal formateadas', () => {
      const content = `11000012341234567890250101250131000000000000000000000000000000000000000000000000000000000000000000000001
22LINEA_MUY_CORTA
88000000000000000000000000000000000000000001
`;
      const result = Norma43Parser.parse(content);
      
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Línea 2');
    });

    it('debe reportar error si no hay cabecera', () => {
      const content = `220001234567890250115251151001000000010000120000000001234REF1             
88000000010000000001000012000000000000000001
`;
      const result = Norma43Parser.parse(content);
      
      expect(result.errors).toContain('No se encontró registro de cabecera (tipo 11)');
    });
  });
});
