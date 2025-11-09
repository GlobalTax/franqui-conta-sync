import { describe, it, expect } from 'vitest';
import { ImportNorma43FileUseCase } from '../ImportNorma43File';

describe('ImportNorma43FileUseCase', () => {
  const validNorma43Content = `11000012341234567890250101250131000000000000000000000000000000000000000000000000000000000000000000000001
220001234567890250115251151001000000010000120000000001234REF1234567890
23  PAGO FACTURA FRA-2025-001              PROVEEDOR TEST SA                
220001234567890250116251161001000000005000220000000001235REF2345678901
88000000020000000001600012000000000005000021
`;

  it('debe importar archivo Norma43 válido', () => {
    const useCase = new ImportNorma43FileUseCase();
    
    const result = useCase.execute({
      bankAccountId: 'acc-1',
      centroCode: 'centro-1',
      fileName: 'extracto.n43',
      fileContent: validNorma43Content,
    });

    expect(result.success).toBe(true);
    expect(result.transactionsImported).toBe(2);
    expect(result.transactions).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });

  it('debe calcular totales correctamente', () => {
    const useCase = new ImportNorma43FileUseCase();
    
    const result = useCase.execute({
      bankAccountId: 'acc-1',
      centroCode: 'centro-1',
      fileName: 'extracto.n43',
      fileContent: validNorma43Content,
    });

    expect(result.totalCredits).toBe(100.00);
    expect(result.totalDebits).toBe(50.00);
  });

  it('debe rechazar formato inválido', () => {
    const useCase = new ImportNorma43FileUseCase();
    
    const result = useCase.execute({
      bankAccountId: 'acc-1',
      centroCode: 'centro-1',
      fileName: 'invalido.txt',
      fileContent: 'Este no es un archivo Norma43',
    });

    expect(result.success).toBe(false);
    expect(result.transactionsImported).toBe(0);
    expect(result.errors).toContain('El archivo no tiene formato Norma 43 válido');
  });

  it('debe transformar transacciones correctamente', () => {
    const useCase = new ImportNorma43FileUseCase();
    
    const result = useCase.execute({
      bankAccountId: 'acc-123',
      centroCode: 'centro-456',
      fileName: 'extracto.n43',
      fileContent: validNorma43Content,
    });

    const tx = result.transactions[0];
    expect(tx.bankAccountId).toBe('acc-123');
    expect(tx.status).toBe('pending');
    expect(tx.importBatchId).toBeDefined();
    expect(tx.transactionDate).toBe('2025-01-15');
    expect(tx.amount).toBe(100.00);
  });
});
