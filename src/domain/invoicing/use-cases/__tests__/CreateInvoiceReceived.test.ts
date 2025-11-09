import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateInvoiceReceivedUseCase } from '../CreateInvoiceReceived';
import { InvoiceCommands } from '@/infrastructure/persistence/supabase/commands/InvoiceCommands';
import type { CreateInvoiceReceivedInput } from '../CreateInvoiceReceived';

describe('CreateInvoiceReceivedUseCase', () => {
  let useCase: CreateInvoiceReceivedUseCase;

  beforeEach(() => {
    useCase = new CreateInvoiceReceivedUseCase();
    vi.clearAllMocks();
  });

  const createValidInput = (): CreateInvoiceReceivedInput => ({
    supplierId: 'supplier-123',
    centroCode: 'C001',
    invoiceNumber: 'F2025-001',
    invoiceDate: '2025-01-15',
    lines: [
      {
        lineNumber: 1,
        description: 'Producto de prueba',
        quantity: 1,
        unitPrice: 100,
        discountPercentage: 0,
        discountAmount: 0,
        subtotal: 100,
        taxRate: 21,
        taxAmount: 21,
        total: 121,
        accountCode: '6000000',
      },
    ],
  });

  it('debe crear factura correctamente con totales calculados', async () => {
    const input = createValidInput();
    const mockCreatedInvoice = { id: 'invoice-123', ...input };

    const createSpy = vi.spyOn(InvoiceCommands, 'createInvoiceReceived').mockResolvedValue(
      mockCreatedInvoice as any
    );

    const result = await useCase.execute(input);

    expect(result.invoice).toBeDefined();
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        invoice: expect.objectContaining({
          subtotal: 100,
          taxTotal: 21,
          total: 121,
        }),
        lines: input.lines
      })
    );
  });

  it('debe determinar aprobaciones para factura < 500€', async () => {
    const input = createValidInput();
    const mockCreatedInvoice = { id: 'invoice-123', ...input };

    const createSpy = vi.spyOn(InvoiceCommands, 'createInvoiceReceived').mockResolvedValue(
      mockCreatedInvoice as any
    );

    await useCase.execute(input);

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        invoice: expect.objectContaining({
          requiresManagerApproval: false,
          requiresAccountingApproval: true,
          approvalStatus: 'pending_accounting',
        }),
        lines: input.lines
      })
    );
  });

  it('debe determinar aprobaciones para factura > 500€', async () => {
    const input = createValidInput();
    input.lines[0].unitPrice = 600; // Total = 726€ con IVA
    const mockCreatedInvoice = { id: 'invoice-123', ...input };

    const createSpy = vi.spyOn(InvoiceCommands, 'createInvoiceReceived').mockResolvedValue(
      mockCreatedInvoice as any
    );

    await useCase.execute(input);

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        invoice: expect.objectContaining({
          requiresManagerApproval: true,
          requiresAccountingApproval: true,
          approvalStatus: 'pending_manager',
        }),
        lines: input.lines
      })
    );
  });

  it('debe rechazar factura sin proveedor', async () => {
    const input = { ...createValidInput(), supplierId: '' };
    const createSpy = vi.spyOn(InvoiceCommands, 'createInvoiceReceived');

    await expect(useCase.execute(input)).rejects.toThrow(/Validación fallida/);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('debe rechazar factura sin líneas', async () => {
    const input = { ...createValidInput(), lines: [] };
    const createSpy = vi.spyOn(InvoiceCommands, 'createInvoiceReceived');

    await expect(useCase.execute(input)).rejects.toThrow(/al menos una línea/);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('debe rechazar factura con línea inválida', async () => {
    const input = createValidInput();
    input.lines[0].quantity = -1; // Cantidad negativa
    const createSpy = vi.spyOn(InvoiceCommands, 'createInvoiceReceived');

    await expect(useCase.execute(input)).rejects.toThrow(/Validación fallida/);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('debe calcular múltiples líneas correctamente', async () => {
    const input = createValidInput();
    input.lines.push({
      lineNumber: 2,
      description: 'Producto 2',
      quantity: 2,
      unitPrice: 50,
      discountPercentage: 10,
      discountAmount: 10,
      subtotal: 90,
      taxRate: 10,
      taxAmount: 9,
      total: 99,
      accountCode: '6000001',
    });

    const mockCreatedInvoice = { id: 'invoice-123', ...input };
    const createSpy = vi.spyOn(InvoiceCommands, 'createInvoiceReceived').mockResolvedValue(
      mockCreatedInvoice as any
    );

    await useCase.execute(input);

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        invoice: expect.objectContaining({
          subtotal: 190, // 100 + 90
          taxTotal: 30, // 21 + 9
          total: 220, // 121 + 99
        }),
        lines: input.lines
      })
    );
  });
});
