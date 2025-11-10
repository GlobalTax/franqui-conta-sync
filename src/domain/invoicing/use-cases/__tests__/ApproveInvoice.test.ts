import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApproveInvoiceUseCase } from '../ApproveInvoice';
import { InvoiceCommands } from '@/infrastructure/persistence/supabase/commands/InvoiceCommands';
import type { ApproveInvoiceInput } from '../ApproveInvoice';
import type { InvoiceReceived } from '../../types';

describe('ApproveInvoiceUseCase', () => {
  let useCase: ApproveInvoiceUseCase;

  beforeEach(() => {
    useCase = new ApproveInvoiceUseCase();
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
    // Campos OCR
    ocrEngine: null,
    ocrMsOpenai: null,
    ocrMsMindee: null,
    ocrPages: null,
    ocrTokensIn: null,
    ocrTokensOut: null,
    ocrCostEstimateEur: null,
    ocrProcessingTimeMs: null,
    ocrConfidenceNotes: null,
    ocrMergeNotes: null,
    ocrExtractedData: null,
    rejectedBy: null,
    rejectedAt: null,
    rejectedReason: null,
    notes: null,
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-15T10:00:00Z',
    createdBy: null,
  });

  it('debe aprobar factura a nivel manager correctamente', async () => {
    const invoice = createPendingInvoice();
    const input: ApproveInvoiceInput = {
      invoice,
      approverUserId: 'user-123',
      approverRole: 'manager',
      approvalLevel: 'manager',
    };

    const mockUpdated = { ...invoice, approvalStatus: 'pending_accounting' };
    const updateSpy = vi.spyOn(InvoiceCommands, 'updateInvoiceReceived').mockResolvedValue(
      mockUpdated as any
    );

    const result = await useCase.execute(input);

    expect(result.nextApprovalStatus).toBe('pending_accounting');
    expect(updateSpy).toHaveBeenCalledWith(
      invoice.id,
      expect.objectContaining({
        updates: expect.objectContaining({
          approvalStatus: 'pending_accounting',
          status: 'pending',
        })
      })
    );
  });

  it('debe aprobar factura a nivel accounting y marcar como approved', async () => {
    const invoice = {
      ...createPendingInvoice(),
      approvalStatus: 'pending_accounting' as const,
    };
    const input: ApproveInvoiceInput = {
      invoice,
      approverUserId: 'user-123',
      approverRole: 'accountant',
      approvalLevel: 'accounting',
    };

    const mockUpdated = { ...invoice, approvalStatus: 'approved' };
    const updateSpy = vi.spyOn(InvoiceCommands, 'updateInvoiceReceived').mockResolvedValue(
      mockUpdated as any
    );

    const result = await useCase.execute(input);

    expect(result.nextApprovalStatus).toBe('approved');
    expect(updateSpy).toHaveBeenCalledWith(
      invoice.id,
      expect.objectContaining({
        updates: expect.objectContaining({
          approvalStatus: 'approved',
          status: 'approved',
        })
      })
    );
  });

  it('debe rechazar aprobación si usuario no tiene permisos', async () => {
    const invoice = createPendingInvoice();
    const input: ApproveInvoiceInput = {
      invoice,
      approverUserId: 'user-123',
      approverRole: 'viewer',
      approvalLevel: 'manager',
    };

    const updateSpy = vi.spyOn(InvoiceCommands, 'updateInvoiceReceived');

    await expect(useCase.execute(input)).rejects.toThrow(/no tiene permisos/);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('debe rechazar aprobación si factura ya está aprobada', async () => {
    const invoice = {
      ...createPendingInvoice(),
      approvalStatus: 'approved' as const,
    };
    const input: ApproveInvoiceInput = {
      invoice,
      approverUserId: 'user-123',
      approverRole: 'manager',
      approvalLevel: 'manager',
    };

    const updateSpy = vi.spyOn(InvoiceCommands, 'updateInvoiceReceived');

    await expect(useCase.execute(input)).rejects.toThrow(/ya está aprobada/);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('debe rechazar si nivel de aprobación no coincide', async () => {
    const invoice = createPendingInvoice(); // pending_manager
    const input: ApproveInvoiceInput = {
      invoice,
      approverUserId: 'user-123',
      approverRole: 'accountant',
      approvalLevel: 'accounting', // Intenta aprobar accounting cuando está pending_manager
    };

    const updateSpy = vi.spyOn(InvoiceCommands, 'updateInvoiceReceived');

    await expect(useCase.execute(input)).rejects.toThrow(
      /pendiente de aprobación de nivel/
    );
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('admin puede aprobar en cualquier nivel', async () => {
    const invoice = createPendingInvoice();
    const input: ApproveInvoiceInput = {
      invoice,
      approverUserId: 'user-123',
      approverRole: 'admin',
      approvalLevel: 'manager',
    };

    const mockUpdated = { ...invoice, approvalStatus: 'pending_accounting' };
    vi.spyOn(InvoiceCommands, 'updateInvoiceReceived').mockResolvedValue(
      mockUpdated as any
    );

    await expect(useCase.execute(input)).resolves.toBeDefined();
  });
});
