// ============================================================================
// E2E INTEGRATION TEST: Invoice Approval Flow
// Tests complete flow: Create Invoice → Manager Approval → Accounting Approval → Entry → Post
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateInvoiceReceivedUseCase } from '@/domain/invoicing/use-cases/CreateInvoiceReceived';
import { ApproveInvoiceUseCase } from '@/domain/invoicing/use-cases/ApproveInvoice';
import { RejectInvoiceUseCase } from '@/domain/invoicing/use-cases/RejectInvoice';
import { CreateAccountingEntryUseCase } from '@/domain/accounting/use-cases/CreateAccountingEntry';
import { PostEntryUseCase } from '@/domain/accounting/use-cases/PostEntry';
import { CloseAccountingPeriodUseCase } from '@/domain/accounting/use-cases/CloseAccountingPeriod';
import { InvoiceCommands } from '@/infrastructure/persistence/supabase/commands/InvoiceCommands';
import { AccountingCommands } from '@/infrastructure/persistence/supabase/commands/AccountingCommands';
import { createTestInvoiceReceived, createTestInvoiceLines } from './helpers/test-data-builders';
import type { InvoiceReceived } from '@/domain/invoicing/types';

// Mock infrastructure layer
vi.mock('@/infrastructure/persistence/supabase/commands/InvoiceCommands');
vi.mock('@/infrastructure/persistence/supabase/commands/AccountingCommands');
vi.mock('@/integrations/supabase/client');

describe('E2E: Flujo completo de Factura Recibida → Aprobación → Asiento Contable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe procesar factura desde creación hasta contabilización sin errores', async () => {
    // ========================================================================
    // ARRANGE: Setup test data
    // ========================================================================
    const invoiceData = createTestInvoiceReceived({
      invoiceNumber: 'F2025-001',
      totalAmount: 1000.00,
      vatAmount: 210.00,
      approvalStatus: 'pending_manager' as const,
    });

    const invoiceLines = createTestInvoiceLines(1);

    // Mock create invoice
    let currentInvoice = { ...invoiceData, approvalStatus: 'draft' as const };
    vi.spyOn(InvoiceCommands, 'createInvoiceReceived').mockResolvedValue(currentInvoice as any);

    // ========================================================================
    // ACT + ASSERT: STEP 1 - Create Invoice
    // ========================================================================
    const createUseCase = new CreateInvoiceReceivedUseCase();
    const createResult = await createUseCase.execute({
      invoice: invoiceData,
      lines: invoiceLines,
    });

    expect(createResult.invoice.approvalStatus).toBe('pending_manager');
    expect(createResult.invoice.totalAmount).toBe(1000.00);

    // ========================================================================
    // ACT + ASSERT: STEP 2 - Manager Approval
    // ========================================================================
    currentInvoice = { ...currentInvoice, approvalStatus: 'pending_accounting' as const };
    vi.spyOn(InvoiceCommands, 'updateInvoiceReceived').mockResolvedValue(currentInvoice as any);

    const approveUseCase = new ApproveInvoiceUseCase();
    const managerApproval = await approveUseCase.execute({
      invoice: createResult.invoice,
      approverUserId: 'manager-123',
      approverRole: 'manager',
      approvalLevel: 'manager',
      comments: 'Aprobada por gerente',
    });

    expect(managerApproval.updatedInvoice.approvalStatus).toBe('pending_accounting');

    // ========================================================================
    // ACT + ASSERT: STEP 3 - Accounting Approval
    // ========================================================================
    currentInvoice = { ...currentInvoice, approvalStatus: 'approved' as const };
    vi.spyOn(InvoiceCommands, 'updateInvoiceReceived').mockResolvedValue(currentInvoice as any);

    const accountingApproval = await approveUseCase.execute({
      invoice: managerApproval.updatedInvoice,
      approverUserId: 'accountant-123',
      approverRole: 'accounting',
      approvalLevel: 'accounting',
      comments: 'Aprobada para contabilizar',
    });

    expect(accountingApproval.updatedInvoice.approvalStatus).toBe('approved');

    // ========================================================================
    // ACT + ASSERT: STEP 4 - Generate Accounting Entry
    // ========================================================================
    const mockEntry = {
      id: 'entry-123',
      centroCode: 'C001',
      entryDate: '2025-01-15',
      description: 'Factura F2025-001',
      status: 'draft' as const,
      totalDebit: 1210.00,
      totalCredit: 1210.00,
      createdAt: new Date().toISOString(),
    };

    vi.spyOn(AccountingCommands, 'createEntry').mockResolvedValue(mockEntry as any);

    const createEntryUseCase = new CreateAccountingEntryUseCase();
    const entryResult = await createEntryUseCase.execute({
      centroCode: accountingApproval.updatedInvoice.centroCode,
      entryDate: accountingApproval.updatedInvoice.invoiceDate,
      description: `Factura ${accountingApproval.updatedInvoice.invoiceNumber}`,
      transactions: [
        { accountCode: '6000000', movementType: 'debit' as const, amount: 1000.00, description: 'Compras' },
        { accountCode: '4720001', movementType: 'debit' as const, amount: 210.00, description: 'IVA Soportado' },
        { accountCode: '4000000', movementType: 'credit' as const, amount: 1210.00, description: 'Proveedor' },
      ],
      createdBy: 'accountant-123',
    });

    expect(entryResult.entry.status).toBe('draft');
    expect(entryResult.entry.totalDebit).toBe(1210.00);
    expect(entryResult.entry.totalCredit).toBe(1210.00);

    // ========================================================================
    // ACT + ASSERT: STEP 5 - Post Entry
    // ========================================================================
    const postedEntry = { ...mockEntry, status: 'posted' as const, postedAt: new Date().toISOString() };
    vi.spyOn(AccountingCommands, 'postEntry').mockResolvedValue(postedEntry as any);

    const postUseCase = new PostEntryUseCase();
    await postUseCase.execute({
      entryId: entryResult.entry.id,
      userId: 'accountant-123',
    });

    expect(AccountingCommands.postEntry).toHaveBeenCalledWith('entry-123', 'accountant-123');

    // ========================================================================
    // FINAL VERIFICATION
    // ========================================================================
    expect(accountingApproval.updatedInvoice.approvalStatus).toBe('approved');
    expect(entryResult.isBalanced).toBe(true);
  });

  it('debe rechazar factura correctamente en nivel Manager', async () => {
    // ========================================================================
    // ARRANGE
    // ========================================================================
    const invoice = createTestInvoiceReceived({
      approvalStatus: 'pending_manager',
    });

    vi.spyOn(InvoiceCommands, 'createInvoiceReceived').mockResolvedValue(invoice as any);

    const createUseCase = new CreateInvoiceReceivedUseCase();
    const createResult = await createUseCase.execute({
      invoice,
      lines: createTestInvoiceLines(1),
    });

    // ========================================================================
    // ACT: Reject invoice
    // ========================================================================
    const rejectedInvoice = { ...invoice, approvalStatus: 'rejected' as const };
    vi.spyOn(InvoiceCommands, 'updateInvoiceReceived').mockResolvedValue(rejectedInvoice as any);

    const rejectUseCase = new RejectInvoiceUseCase();
    const rejectResult = await rejectUseCase.execute({
      invoice: createResult.invoice,
      rejectorUserId: 'manager-123',
      rejectorRole: 'manager',
      reason: 'Proveedor no autorizado',
      comments: 'Factura de proveedor sin contrato',
    });

    // ========================================================================
    // ASSERT
    // ========================================================================
    expect(rejectResult.updatedInvoice.approvalStatus).toBe('rejected');
    expect(InvoiceCommands.updateInvoiceReceived).toHaveBeenCalledWith(
      invoice.id,
      expect.objectContaining({
        updates: expect.objectContaining({
          approvalStatus: 'rejected',
        }),
      })
    );
  });

  it('debe fallar al contabilizar asiento en período cerrado', async () => {
    // ========================================================================
    // ARRANGE: Close period first
    // ========================================================================
    vi.mock('@/integrations/supabase/client', () => ({
      supabase: {
        from: vi.fn(() => ({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: {
                  id: 'period-123',
                  centro_code: 'C001',
                  period_type: 'monthly',
                  period_year: 2025,
                  period_month: 1,
                  status: 'closed',
                },
                error: null,
              })),
            })),
          })),
        })),
      },
    }));

    const closeUseCase = new CloseAccountingPeriodUseCase();
    await closeUseCase.execute({
      centroCode: 'C001',
      periodYear: 2025,
      periodMonth: 1,
      userId: 'accountant-123',
    });

    // ========================================================================
    // ACT + ASSERT: Try to create entry in closed period
    // ========================================================================
    const createEntryUseCase = new CreateAccountingEntryUseCase();

    await expect(
      createEntryUseCase.execute({
        centroCode: 'C001',
        entryDate: '2025-01-15', // Within closed period
        description: 'Asiento en período cerrado',
        transactions: [
          { accountCode: '6000000', movementType: 'debit' as const, amount: 100, description: 'Test' },
          { accountCode: '5720000', movementType: 'credit' as const, amount: 100, description: 'Test' },
        ],
        createdBy: 'accountant-123',
      })
    ).rejects.toThrow(/período cerrado/i);
  });
});
