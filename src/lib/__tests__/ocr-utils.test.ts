import { describe, it, expect } from 'vitest';
import { validateSpanishVAT, parseSpanishAmount, estimateOCRCost, quickValidateInvoice, formatDateES } from '../ocr-utils';

describe('validateSpanishVAT', () => {
  it('should validate correct NIF', () => {
    expect(validateSpanishVAT('12345678Z')).toBe(true);
  });

  it('should reject invalid NIF', () => {
    expect(validateSpanishVAT('12345678X')).toBe(false);
  });

  it('should validate correct CIF', () => {
    expect(validateSpanishVAT('B12345678')).toBe(true);
  });

  it('should reject null VAT', () => {
    expect(validateSpanishVAT(null)).toBe(false);
  });

  it('should reject empty VAT', () => {
    expect(validateSpanishVAT('')).toBe(false);
  });
});

describe('parseSpanishAmount', () => {
  it('should parse Spanish format correctly', () => {
    expect(parseSpanishAmount('1.234,56')).toBe(1234.56);
    expect(parseSpanishAmount('123,45')).toBe(123.45);
  });

  it('should handle amounts without thousands separator', () => {
    expect(parseSpanishAmount('999,99')).toBe(999.99);
  });

  it('should handle large amounts', () => {
    expect(parseSpanishAmount('12.345.678,90')).toBe(12345678.90);
  });
});

describe('formatDateES', () => {
  it('should format date correctly', () => {
    expect(formatDateES('2025', '11', '10')).toBe('2025-11-10');
  });

  it('should pad single digits', () => {
    expect(formatDateES('2025', '1', '5')).toBe('2025-01-05');
  });
});

describe('estimateOCRCost', () => {
  it('should estimate OpenAI cost with tokens', () => {
    const result = estimateOCRCost({
      engine: 'openai',
      tokens_in: 1000,
      tokens_out: 500
    });
    expect(result.cost_openai).toBeGreaterThan(0);
    expect(result.cost_mindee).toBe(0);
  });

  it('should estimate OpenAI cost without tokens (average)', () => {
    const result = estimateOCRCost({
      engine: 'openai'
    });
    expect(result.cost_openai).toBe(0.08);
  });

  it('should estimate Mindee cost', () => {
    const result = estimateOCRCost({
      engine: 'mindee',
      pages: 3
    });
    expect(result.cost_mindee).toBe(0.06);
    expect(result.cost_openai).toBe(0);
  });

  it('should estimate merged cost (max of both)', () => {
    const result = estimateOCRCost({
      engine: 'merged',
      pages: 2,
      tokens_in: 1000,
      tokens_out: 500
    });
    expect(result.cost_total).toBe(Math.max(result.cost_openai, result.cost_mindee));
  });
});

describe('quickValidateInvoice', () => {
  it('should return high confidence for complete invoice', () => {
    const result = quickValidateInvoice({
      vat_id: 'B12345678',
      invoice_number: 'FAC-2025-001',
      issue_date: '2025-11-10',
      total: 1234.56
    });
    expect(result.estimated_confidence).toBeGreaterThan(80);
    expect(result.warnings.length).toBe(0);
    expect(result.vat_valid).toBe(true);
    expect(result.has_invoice_number).toBe(true);
    expect(result.has_date).toBe(true);
    expect(result.has_total).toBe(true);
  });

  it('should return low confidence for incomplete invoice', () => {
    const result = quickValidateInvoice({
      vat_id: null,
      invoice_number: null,
      issue_date: null,
      total: 0
    });
    expect(result.estimated_confidence).toBeLessThan(50);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('should detect missing fields', () => {
    const result = quickValidateInvoice({
      vat_id: 'B12345678',
      invoice_number: null,
      issue_date: '2025-11-10',
      total: 100
    });
    expect(result.has_invoice_number).toBe(false);
    expect(result.warnings).toContain('Número de factura faltante');
  });

  it('should validate VAT correctly', () => {
    const result = quickValidateInvoice({
      vat_id: 'INVALID',
      invoice_number: 'FAC-001',
      issue_date: '2025-11-10',
      total: 100
    });
    expect(result.vat_valid).toBe(false);
    expect(result.warnings).toContain('NIF/CIF inválido o faltante');
  });
});
