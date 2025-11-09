import { describe, it, expect } from 'vitest';
import { EntryMapper } from '../EntryMapper';
import type { JournalEntry } from '@/domain/accounting/types';

describe('EntryMapper', () => {
  describe('toDomain', () => {
    it('should convert DB entry to domain entity with transactions', () => {
      const dbEntry = {
        id: 'entry-123',
        entry_number: 42,
        entry_date: '2024-03-15',
        description: 'Venta de mercancía',
        centro_code: '001',
        fiscal_year_id: 'fy-2024',
        status: 'posted',
        total_debit: 1000,
        total_credit: 1000,
        created_by: 'user-123',
        created_at: '2024-03-15T10:00:00Z',
        updated_at: '2024-03-15T11:00:00Z',
        accounting_transactions: [
          {
            id: 'trans-1',
            entry_id: 'entry-123',
            account_code: '4300000',
            movement_type: 'debit',
            amount: 1000,
            description: 'Cliente X',
            document_ref: null,
            line_number: 1,
            created_at: '2024-03-15T10:00:00Z',
          },
          {
            id: 'trans-2',
            entry_id: 'entry-123',
            account_code: '7000000',
            movement_type: 'credit',
            amount: 1000,
            description: 'Venta producto Y',
            document_ref: null,
            line_number: 2,
            created_at: '2024-03-15T10:00:00Z',
          },
        ],
      };

      const result = EntryMapper.toDomain(dbEntry as any);

      expect(result).toMatchObject({
        id: 'entry-123',
        entryNumber: 42,
        entryDate: '2024-03-15',
        description: 'Venta de mercancía',
        centroCode: '001',
        fiscalYearId: 'fy-2024',
        status: 'posted',
        totalDebit: 1000,
        totalCredit: 1000,
        createdBy: 'user-123',
      });

      expect(result.transactions).toHaveLength(2);
      expect(result.transactions[0]).toMatchObject({
        id: 'trans-1',
        accountCode: '4300000',
        movementType: 'debit',
        amount: 1000,
        description: 'Cliente X',
        lineNumber: 1,
      });
    });

    it('should handle entry without transactions', () => {
      const dbEntry = {
        id: 'entry-123',
        entry_number: 42,
        entry_date: '2024-03-15',
        description: 'Asiento sin transacciones',
        centro_code: '001',
        fiscal_year_id: null,
        status: 'draft',
        total_debit: 0,
        total_credit: 0,
        created_by: null,
        created_at: '2024-03-15T10:00:00Z',
        updated_at: '2024-03-15T10:00:00Z',
      };

      const result = EntryMapper.toDomain(dbEntry as any);

      expect(result.transactions).toEqual([]);
      expect(result.fiscalYearId).toBeUndefined();
      expect(result.createdBy).toBeUndefined();
    });

    it('should sort transactions by line_number', () => {
      const dbEntry = {
        id: 'entry-123',
        entry_number: 1,
        entry_date: '2024-01-01',
        description: 'Test',
        centro_code: '001',
        fiscal_year_id: null,
        status: 'draft',
        total_debit: 0,
        total_credit: 0,
        created_by: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        accounting_transactions: [
          {
            id: 'trans-3',
            entry_id: 'entry-123',
            account_code: '6000000',
            movement_type: 'debit',
            amount: 100,
            description: 'Line 3',
            document_ref: null,
            line_number: 3,
            created_at: '2024-01-01T00:00:00Z',
          },
          {
            id: 'trans-1',
            entry_id: 'entry-123',
            account_code: '4300000',
            movement_type: 'debit',
            amount: 100,
            description: 'Line 1',
            document_ref: null,
            line_number: 1,
            created_at: '2024-01-01T00:00:00Z',
          },
          {
            id: 'trans-2',
            entry_id: 'entry-123',
            account_code: '5720000',
            movement_type: 'credit',
            amount: 200,
            description: 'Line 2',
            document_ref: null,
            line_number: 2,
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
      };

      const result = EntryMapper.toDomain(dbEntry as any);

      expect(result.transactions[0].lineNumber).toBe(1);
      expect(result.transactions[1].lineNumber).toBe(2);
      expect(result.transactions[2].lineNumber).toBe(3);
      expect(result.transactions[0].description).toBe('Line 1');
    });
  });

  describe('toDatabase', () => {
    it('should convert domain entry to DB format', () => {
      const domainEntry: Partial<JournalEntry> = {
        entryDate: '2024-03-15',
        description: 'Compra de material',
        centroCode: '001',
        fiscalYearId: 'fy-2024',
        status: 'draft',
        totalDebit: 500,
        totalCredit: 500,
        createdBy: 'user-456',
        transactions: [
          {
            accountCode: '6000000',
            movementType: 'debit',
            amount: 500,
            description: 'Compra proveedor Z',
            lineNumber: 1,
          },
          {
            accountCode: '4000000',
            movementType: 'credit',
            amount: 500,
            description: 'Proveedor Z',
            lineNumber: 2,
          },
        ],
      };

      const result = EntryMapper.toDatabase(domainEntry, 10);

      expect(result.entry).toEqual({
        entry_number: 10,
        entry_date: '2024-03-15',
        description: 'Compra de material',
        centro_code: '001',
        fiscal_year_id: 'fy-2024',
        status: 'draft',
        total_debit: 500,
        total_credit: 500,
        created_by: 'user-456',
      });

      expect(result.transactions).toHaveLength(2);
      expect(result.transactions[0]).toEqual({
        account_code: '6000000',
        movement_type: 'debit',
        amount: 500,
        description: 'Compra proveedor Z',
        line_number: 1,
      });
    });

    it('should handle partial entry for updates', () => {
      const partialEntry: Partial<JournalEntry> = {
        description: 'Descripción actualizada',
        status: 'posted',
      };

      const result = EntryMapper.toDatabase(partialEntry, 5);

      expect(result.entry).toEqual({
        entry_number: 5,
        description: 'Descripción actualizada',
        status: 'posted',
      });
      expect(result.transactions).toEqual([]);
    });

    it('should handle entry without transactions', () => {
      const domainEntry: Partial<JournalEntry> = {
        entryDate: '2024-01-01',
        description: 'Test',
        centroCode: '001',
      };

      const result = EntryMapper.toDatabase(domainEntry, 1);

      expect(result.transactions).toEqual([]);
    });

    it('should map null description to null in transactions', () => {
      const domainEntry: Partial<JournalEntry> = {
        transactions: [
          {
            accountCode: '4300000',
            movementType: 'debit',
            amount: 100,
            description: '',
            lineNumber: 1,
          },
        ],
      };

      const result = EntryMapper.toDatabase(domainEntry);

      expect(result.transactions[0].description).toBeNull();
    });
  });

  describe('toDomainList', () => {
    it('should convert array of DB entries', () => {
      const dbEntries = [
        {
          id: 'entry-1',
          entry_number: 1,
          entry_date: '2024-01-01',
          description: 'Entry 1',
          centro_code: '001',
          fiscal_year_id: null,
          status: 'posted',
          total_debit: 100,
          total_credit: 100,
          created_by: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          accounting_transactions: [],
        },
        {
          id: 'entry-2',
          entry_number: 2,
          entry_date: '2024-01-02',
          description: 'Entry 2',
          centro_code: '001',
          fiscal_year_id: null,
          status: 'draft',
          total_debit: 200,
          total_credit: 200,
          created_by: null,
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          accounting_transactions: [],
        },
      ];

      const result = EntryMapper.toDomainList(dbEntries as any);

      expect(result).toHaveLength(2);
      expect(result[0].entryNumber).toBe(1);
      expect(result[1].entryNumber).toBe(2);
    });

    it('should handle empty array', () => {
      const result = EntryMapper.toDomainList([]);
      expect(result).toEqual([]);
    });
  });
});
