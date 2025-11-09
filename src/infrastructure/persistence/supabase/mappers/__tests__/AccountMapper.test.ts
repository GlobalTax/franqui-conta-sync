import { describe, it, expect } from 'vitest';
import { AccountMapper } from '../AccountMapper';

describe('AccountMapper', () => {
  describe('toDomain', () => {
    it('should convert DB account to domain entity', () => {
      const dbAccount = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        code: '4300000',
        name: 'Clientes',
        account_type: 'asset',
        centro_code: '001',
        company_id: 'comp-123',
        parent_code: '430',
        level: 2,
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      const result = AccountMapper.toDomain(dbAccount as any);

      expect(result).toEqual({
        id: '123e4567-e89b-12d3-a456-426614174000',
        code: '4300000',
        name: 'Clientes',
        accountType: 'asset',
        centroCode: '001',
        companyId: 'comp-123',
        parentCode: '430',
        level: 2,
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      });
    });

    it('should handle null optional fields', () => {
      const dbAccount = {
        id: '123',
        code: '6000000',
        name: 'Compras',
        account_type: 'expense',
        centro_code: '001',
        company_id: null,
        parent_code: null,
        level: 1,
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const result = AccountMapper.toDomain(dbAccount as any);

      expect(result.companyId).toBeNull();
      expect(result.parentCode).toBeNull();
    });

    it('should default level to 0 if null', () => {
      const dbAccount = {
        id: '123',
        code: '7',
        name: 'Ventas',
        account_type: 'revenue',
        centro_code: '001',
        company_id: null,
        parent_code: null,
        level: null,
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const result = AccountMapper.toDomain(dbAccount as any);

      expect(result.level).toBe(0);
    });
  });

  describe('toDatabase', () => {
    it('should convert domain entity to DB format', () => {
      const domainAccount = {
        code: '4300000',
        name: 'Clientes',
        accountType: 'asset',
        centroCode: '001',
        companyId: 'comp-123',
        parentCode: '430',
        level: 2,
        active: true,
      };

      const result = AccountMapper.toDatabase(domainAccount as any);

      expect(result).toEqual({
        code: '4300000',
        name: 'Clientes',
        account_type: 'asset',
        centro_code: '001',
        company_id: 'comp-123',
        parent_code: '430',
        level: 2,
        active: true,
      });
    });

    it('should handle partial updates', () => {
      const partialAccount = {
        name: 'Clientes Nacionales',
        active: false,
      };

      const result = AccountMapper.toDatabase(partialAccount as any);

      expect(result).toEqual({
        name: 'Clientes Nacionales',
        active: false,
      });
      expect(result.code).toBeUndefined();
    });

    it('should map null values correctly', () => {
      const domainAccount = {
        code: '6000000',
        name: 'Compras',
        accountType: 'expense',
        centroCode: '001',
        companyId: null,
        parentCode: null,
        level: 1,
        active: true,
      };

      const result = AccountMapper.toDatabase(domainAccount as any);

      expect(result.company_id).toBeNull();
      expect(result.parent_code).toBeNull();
    });
  });

  describe('toDomainList', () => {
    it('should convert array of DB accounts', () => {
      const dbAccounts = [
        {
          id: '1',
          code: '4300000',
          name: 'Clientes',
          account_type: 'asset',
          centro_code: '001',
          company_id: null,
          parent_code: '430',
          level: 2,
          active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          code: '7000000',
          name: 'Ventas',
          account_type: 'revenue',
          centro_code: '001',
          company_id: null,
          parent_code: '700',
          level: 2,
          active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      const result = AccountMapper.toDomainList(dbAccounts as any);

      expect(result).toHaveLength(2);
      expect(result[0].code).toBe('4300000');
      expect(result[1].code).toBe('7000000');
    });

    it('should handle empty array', () => {
      const result = AccountMapper.toDomainList([]);
      expect(result).toEqual([]);
    });
  });
});
