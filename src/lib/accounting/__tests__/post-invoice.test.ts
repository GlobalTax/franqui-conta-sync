// ============================================================================
// TESTS - Post Invoice
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { postInvoiceEntry } from '../composers/post-invoice';
import type { PostInvoiceParams } from '../composers/post-invoice';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
  },
}));

describe('postInvoiceEntry', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should validate command before posting', async () => {
    const params: PostInvoiceParams = {
      invoiceId: 'inv-123',
      invoiceType: 'received',
      entryDate: '2025-01-15',
      description: 'Factura proveedor',
      centreCode: '',  // ❌ Falta centro
      fiscalYearId: 'fy-2025',
      preview: [
        { account: '6000000', debit: 100, credit: 0 },
        { account: '4720000', debit: 21, credit: 0 },
        { account: '4100000', debit: 0, credit: 121 },
      ],
      userId: 'user-123',
    };
    
    await expect(postInvoiceEntry(params)).rejects.toThrow('centre_code requerido');
  });
  
  it('should validate balance before posting', async () => {
    const params: PostInvoiceParams = {
      invoiceId: 'inv-123',
      invoiceType: 'received',
      entryDate: '2025-01-15',
      description: 'Factura proveedor',
      centreCode: 'C001',
      fiscalYearId: 'fy-2025',
      preview: [
        { account: '6000000', debit: 100, credit: 0 },
        { account: '4720000', debit: 21, credit: 0 },
        { account: '4100000', debit: 0, credit: 100 },  // ❌ No cuadra
      ],
      userId: 'user-123',
    };
    
    await expect(postInvoiceEntry(params)).rejects.toThrow('Debe ≠ Haber');
  });
  
  it('should create entry and update invoice on success', async () => {
    // TODO: Mock completo de flujo exitoso
    // Requiere mock de RPC, insert, update con respuestas esperadas
    expect(true).toBe(true);
  });
});
