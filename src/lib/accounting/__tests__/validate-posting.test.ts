// ============================================================================
// VALIDATE POSTING TESTS - Tests unitarios de validación de asientos
// ============================================================================

import { describe, it, expect } from 'vitest';
import { validatePosting } from '../composers/validate-posting';
import { mapAP } from '../composers/map-ap';

describe('validatePosting', () => {
  it('asiento válido con centro asignado', () => {
    const invoice = {
      totals: {
        base_21: 100,
        vat_21: 21,
        total: 121
      }
    };
    
    const mapping = mapAP({
      issuer: { name: 'MAKRO' },
      lines: [],
      centre_id: 'M001'
    });
    
    const result = validatePosting(invoice, mapping);
    
    expect(result.ready_to_post).toBe(true);
    expect(result.blocking_issues).toEqual([]);
    expect(result.post_preview).toHaveLength(3);
    
    // Verificar estructura del asiento
    expect(result.post_preview[0].debit).toBe(100);   // Base
    expect(result.post_preview[1].debit).toBe(21);    // IVA
    expect(result.post_preview[2].credit).toBe(121);  // Proveedor
  });
  
  it('asiento válido con ambos tipos de IVA', () => {
    const invoice = {
      totals: {
        base_10: 50,
        vat_10: 5,
        base_21: 100,
        vat_21: 21,
        total: 176
      }
    };
    
    const mapping = mapAP({
      issuer: { name: 'EUROPASTRY' },
      lines: [],
      centre_id: 'M002'
    });
    
    const result = validatePosting(invoice, mapping);
    
    expect(result.ready_to_post).toBe(true);
    expect(result.post_preview[0].debit).toBe(150);  // 50 + 100
    expect(result.post_preview[1].debit).toBe(26);   // 5 + 21
    expect(result.post_preview[2].credit).toBe(176);
  });
  
  it('detecta falta de centro', () => {
    const invoice = {
      totals: {
        base_21: 100,
        vat_21: 21,
        total: 121
      }
    };
    
    const mapping = mapAP({
      issuer: { name: 'MAKRO' },
      lines: []
      // Sin centre_id
    });
    
    const result = validatePosting(invoice, mapping);
    
    expect(result.ready_to_post).toBe(false);
    expect(result.blocking_issues).toContain('Falta centro');
  });
  
  it('detecta Debe ≠ Haber', () => {
    const invoice = {
      totals: {
        base_21: 100,
        vat_21: 21,
        total: 125  // ❌ Total incorrecto (debería ser 121)
      }
    };
    
    const mapping = mapAP({
      issuer: { name: 'MAKRO' },
      lines: [],
      centre_id: 'M001'
    });
    
    const result = validatePosting(invoice, mapping);
    
    expect(result.ready_to_post).toBe(false);
    expect(result.blocking_issues).toContain('Debe ≠ Haber');
  });
  
  it('detecta múltiples issues', () => {
    const invoice = {
      totals: {
        base_21: 100,
        vat_21: 21,
        total: 125  // ❌ Incorrecto
      }
    };
    
    const mapping = mapAP({
      issuer: { name: 'MAKRO' },
      lines: []
      // ❌ Sin centre_id
    });
    
    const result = validatePosting(invoice, mapping);
    
    expect(result.ready_to_post).toBe(false);
    expect(result.blocking_issues).toHaveLength(2);
    expect(result.blocking_issues).toContain('Falta centro');
    expect(result.blocking_issues).toContain('Debe ≠ Haber');
  });
  
  it('tolera diferencia de redondeo < 0.01€', () => {
    const invoice = {
      totals: {
        base_21: 100.005,  // Redondeo
        vat_21: 21.001,    // Redondeo
        total: 121.006     // Suma con redondeo
      }
    };
    
    const mapping = mapAP({
      issuer: { name: 'MAKRO' },
      lines: [],
      centre_id: 'M001'
    });
    
    const result = validatePosting(invoice, mapping);
    
    expect(result.ready_to_post).toBe(true);
    expect(result.blocking_issues).toEqual([]);
  });
  
  it('preview incluye centre_id en línea de gasto', () => {
    const invoice = {
      totals: {
        base_21: 100,
        vat_21: 21,
        total: 121
      }
    };
    
    const mapping = mapAP({
      issuer: { name: 'MAKRO' },
      lines: [],
      centre_id: 'M001'
    });
    
    const result = validatePosting(invoice, mapping);
    
    expect(result.post_preview[0].centre_id).toBe('M001');
    expect(result.post_preview[1].centre_id).toBeUndefined();
    expect(result.post_preview[2].centre_id).toBeUndefined();
  });
});
