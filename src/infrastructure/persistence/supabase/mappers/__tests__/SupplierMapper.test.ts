import { describe, it, expect } from 'vitest';
import { SupplierMapper } from '../SupplierMapper';
import type { Supplier } from '@/domain/suppliers/types';

describe('SupplierMapper', () => {
  describe('toDomain', () => {
    it('convierte proveedor de DB a dominio correctamente', () => {
      const dbSupplier = {
        id: 'sup-1',
        tax_id: 'B12345678',
        name: 'Proveedor Test',
        commercial_name: 'Test S.L.',
        email: 'proveedor@test.com',
        phone: '+34666777888',
        address: 'Calle Test 123',
        city: 'Madrid',
        postal_code: '28001',
        country: 'España',
        payment_terms: 30,
        default_account_code: '4000000',
        notes: 'Proveedor de confianza',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2025-01-15T10:00:00Z',
      };

      const result = SupplierMapper.toDomain(dbSupplier);

      expect(result).toEqual({
        id: 'sup-1',
        taxId: 'B12345678',
        name: 'Proveedor Test',
        commercialName: 'Test S.L.',
        email: 'proveedor@test.com',
        phone: '+34666777888',
        address: 'Calle Test 123',
        city: 'Madrid',
        postalCode: '28001',
        country: 'España',
        paymentTerms: 30,
        defaultAccountCode: '4000000',
        notes: 'Proveedor de confianza',
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2025-01-15T10:00:00Z',
      });
    });

    it('maneja campos opcionales null correctamente', () => {
      const dbSupplier = {
        id: 'sup-2',
        tax_id: 'B98765432',
        name: 'Proveedor Sin Datos Completos',
        commercial_name: null,
        email: null,
        phone: null,
        address: null,
        city: null,
        postal_code: null,
        country: 'España',
        payment_terms: 0,
        default_account_code: null,
        notes: null,
        active: true,
        created_at: '2024-06-01T00:00:00Z',
        updated_at: '2024-06-01T00:00:00Z',
      };

      const result = SupplierMapper.toDomain(dbSupplier);

      expect(result.commercialName).toBeNull();
      expect(result.email).toBeNull();
      expect(result.phone).toBeNull();
      expect(result.address).toBeNull();
      expect(result.city).toBeNull();
      expect(result.postalCode).toBeNull();
      expect(result.defaultAccountCode).toBeNull();
      expect(result.notes).toBeNull();
    });
  });

  describe('toDatabase', () => {
    it('convierte proveedor de dominio a DB correctamente', () => {
      const domainSupplier: Partial<Supplier> = {
        taxId: 'B12345678',
        name: 'Proveedor Test',
        commercialName: 'Test S.L.',
        email: 'proveedor@test.com',
        phone: '+34666777888',
        address: 'Calle Test 123',
        city: 'Madrid',
        postalCode: '28001',
        country: 'España',
        paymentTerms: 30,
        defaultAccountCode: '4000000',
        notes: 'Proveedor de confianza',
        active: true,
      };

      const result = SupplierMapper.toDatabase(domainSupplier);

      expect(result).toEqual({
        tax_id: 'B12345678',
        name: 'Proveedor Test',
        commercial_name: 'Test S.L.',
        email: 'proveedor@test.com',
        phone: '+34666777888',
        address: 'Calle Test 123',
        city: 'Madrid',
        postal_code: '28001',
        country: 'España',
        payment_terms: 30,
        default_account_code: '4000000',
        notes: 'Proveedor de confianza',
        active: true,
      });
    });

    it('maneja actualizaciones parciales correctamente', () => {
      const partialUpdate: Partial<Supplier> = {
        email: 'nuevoemail@test.com',
        phone: '+34999888777',
        notes: 'Datos de contacto actualizados',
      };

      const result = SupplierMapper.toDatabase(partialUpdate);

      expect(result).toEqual({
        tax_id: undefined,
        name: undefined,
        commercial_name: undefined,
        email: 'nuevoemail@test.com',
        phone: '+34999888777',
        address: undefined,
        city: undefined,
        postal_code: undefined,
        country: undefined,
        payment_terms: undefined,
        default_account_code: undefined,
        notes: 'Datos de contacto actualizados',
        active: undefined,
      });
    });
  });
});
