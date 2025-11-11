// ============================================================================
// MAP AP TESTS - Tests unitarios del mapeo contable
// ============================================================================

import { describe, it, expect } from 'vitest';
import { mapAP } from '../composers/map-ap';
import { PGC_ACCOUNTS } from '../core/accounts';

describe('mapAP', () => {
  it('mapea proveedor MAKRO correctamente', () => {
    const result = mapAP({
      issuer: { name: 'MAKRO S.A.' },
      lines: []
    });
    
    expect(result.account_suggestion).toBe(PGC_ACCOUNTS.PURCHASES.FOOD_MAKRO);
    expect(result.rationale).toContain('Proveedor');
  });
  
  it('mapea proveedor EUROPASTRY correctamente', () => {
    const result = mapAP({
      issuer: { name: 'Europastry España' },
      lines: []
    });
    
    expect(result.account_suggestion).toBe(PGC_ACCOUNTS.PURCHASES.FOOD_EUROPASTRY);
    expect(result.rationale).toContain('Proveedor');
  });
  
  it('keywords de PAPEL override proveedor', () => {
    const result = mapAP({
      issuer: { name: 'MAKRO S.A.' },
      lines: [
        { description: 'Papel higiénico' },
        { description: 'Servilletas' }
      ]
    });
    
    expect(result.account_suggestion).toBe(PGC_ACCOUNTS.PURCHASES.PAPER);
    expect(result.rationale).toContain('Keywords');
  });
  
  it('keywords de PACKAGING override proveedor', () => {
    const result = mapAP({
      issuer: { name: 'Europastry España' },
      lines: [
        { description: 'Envases plástico' }
      ]
    });
    
    expect(result.account_suggestion).toBe(PGC_ACCOUNTS.PURCHASES.PAPER);
    expect(result.rationale).toContain('Keywords');
  });
  
  it('usa cuenta fallback si no hay match', () => {
    const result = mapAP({
      issuer: { name: 'Proveedor Desconocido' },
      lines: [{ description: 'Servicio genérico' }]
    });
    
    expect(result.account_suggestion).toBe(PGC_ACCOUNTS.PURCHASES.SERVICES);
    expect(result.rationale).toContain('genérica');
  });
  
  it('siempre retorna cuentas de IVA y AP', () => {
    const result = mapAP({
      issuer: { name: 'Test' },
      lines: []
    });
    
    expect(result.tax_account).toBe(PGC_ACCOUNTS.VAT.DEDUCTIBLE);
    expect(result.ap_account).toBe(PGC_ACCOUNTS.SUPPLIERS.PAYABLE);
  });
  
  it('preserva centre_id si existe', () => {
    const centreId = '12345-67890';
    const result = mapAP({
      issuer: { name: 'MAKRO' },
      lines: [],
      centre_id: centreId
    });
    
    expect(result.centre_id).toBe(centreId);
  });
  
  it('centre_id null si no existe', () => {
    const result = mapAP({
      issuer: { name: 'MAKRO' },
      lines: []
    });
    
    expect(result.centre_id).toBeNull();
  });
});
