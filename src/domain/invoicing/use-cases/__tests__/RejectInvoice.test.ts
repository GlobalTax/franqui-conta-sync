import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RejectInvoiceUseCase } from '../RejectInvoice';
import * as InvoiceQueries from '@/infrastructure/persistence/supabase/queries/InvoiceQueries';
import type { RejectInvoiceInput } from '../RejectInvoice';
import type { InvoiceReceived } from '../../types';

vi.mock('@/infrastructure/persistence/supabase/queries/InvoiceQueries');

describe('RejectInvoiceUseCase', () => {
  let useCase: RejectInvoiceUseCase;

  beforeEach(() => {
    useCase = new RejectInvoiceUseCase();
    vi.clearAllMocks();
  });

  const createPendingInvoice = (): InvoiceReceived => ({
    id: 'invoice-123',
    supplierId: 'supplier-123',
    centroCode: 'C001',
    invoiceNumber: 'F2025-001',
    invoiceDate: '2025-01-15',
    dueDate: null,
    subtotal: 100,
    taxTotal: 21,
    total: 121,
    status: 'pending',
    approvalStatus: 'pending_manager',
    requiresManagerApproval: true,
    requiresAccountingApproval: true,
    documentPath: null,
    entryId: null,
    paymentTransactionId: null,
    ocrConfidence: null,
    rejectedBy: null,
    rejectedAt: null,
    rejectedReason: null,
    notes: null,
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-15T10:00:00Z',
    createdBy: null,
  });

  it('debe rechazar factura correctamente', async () => {
    const invoice = createPendingInvoice();
    const input: RejectInvoiceInput = {
      invoice,
      rejectorUserId: 'user-123',
      rejectorRole: 'manager',
      reason: 'Importe no coincide con pedido',
      comments: 'Revisar con proveedor',
    };

    const mockUpdated = {
      ...invoice,
      approvalStatus: 'rejected',
      status: 'rejected',
      rejectedBy: 'user-123',
    };
    vi.mocked(InvoiceQueries.updateInvoiceReceived).mockResolvedValue(
      mockUpdated as any
    );

    const result = await useCase.execute(input);

    expect(result.updatedInvoice.approvalStatus).toBe('rejected');
    expect(InvoiceQueries.updateInvoiceReceived).toHaveBeenCalledWith(
      invoice.id,
      expect.objectContaining({
        approvalStatus: 'rejected',
        status: 'rejected',
        rejectedBy: 'user-123',
        rejectedReason: 'Importe no coincide con pedido',
      })
    );
  });

  it('debe rechazar si no se proporciona razón', async () => {
    const invoice = createPendingInvoice();
    const input: RejectInvoiceInput = {
      invoice,
      rejectorUserId: 'user-123',
      rejectorRole: 'manager',
      reason: '', // Razón vacía
    };

    await expect(useCase.execute(input)).rejects.toThrow(/Debe proporcionar una razón/);
    expect(InvoiceQueries.updateInvoiceReceived).not.toHaveBeenCalled();
  });

  it('debe rechazar si factura ya está aprobada', async () => {
    const invoice = {
      ...createPendingInvoice(),
      approvalStatus: 'approved' as const,
    };
    const input: RejectInvoiceInput = {
      invoice,
      rejectorUserId: 'user-123',
      rejectorRole: 'manager',
      reason: 'Razón de prueba',
    };

    await expect(useCase.execute(input)).rejects.toThrow(/ya aprobada/);
    expect(InvoiceQueries.updateInvoiceReceived).not.toHaveBeenCalled();
  });

  it('debe rechazar si factura ya está rechazada', async () => {
    const invoice = {
      ...createPendingInvoice(),
      approvalStatus: 'rejected' as const,
    };
    const input: RejectInvoiceInput = {
      invoice,
      rejectorUserId: 'user-123',
      rejectorRole: 'manager',
      reason: 'Razón de prueba',
    };

    await expect(useCase.execute(input)).rejects.toThrow(/ya rechazada/);
    expect(InvoiceQueries.updateInvoiceReceived).not.toHaveBeenCalled();
  });

  it('debe validar permisos del usuario', async () => {
    const invoice = createPendingInvoice();
    const input: RejectInvoiceInput = {
      invoice,
      rejectorUserId: 'user-123',
      rejectorRole: 'viewer', // Viewer no puede rechazar
      reason: 'Razón de prueba',
    };

    await expect(useCase.execute(input)).rejects.toThrow(/no tiene permisos/);
    expect(InvoiceQueries.updateInvoiceReceived).not.toHaveBeenCalled();
  });

  it('debe agregar comentarios a notas existentes', async () => {
    const invoice = {
      ...createPendingInvoice(),
      notes: 'Notas previas',
    };
    const input: RejectInvoiceInput = {
      invoice,
      rejectorUserId: 'user-123',
      rejectorRole: 'manager',
      reason: 'Motivo del rechazo',
      comments: 'Comentarios adicionales',
    };

    const mockUpdated = { ...invoice, approvalStatus: 'rejected' };
    vi.mocked(InvoiceQueries.updateInvoiceReceived).mockResolvedValue(
      mockUpdated as any
    );

    await useCase.execute(input);

    expect(InvoiceQueries.updateInvoiceReceived).toHaveBeenCalledWith(
      invoice.id,
      expect.objectContaining({
        notes: expect.stringContaining('Notas previas'),
      })
    );
  });
});
