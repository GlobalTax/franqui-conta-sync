import { describe, it, expect } from 'vitest';
import { ApprovalEngine } from '../ApprovalEngine';
import type { InvoiceReceived } from '../../types';

describe('ApprovalEngine', () => {
  describe('determineApprovalRequirements', () => {
    it('facturas < 500€ solo requieren contabilidad', () => {
      const reqs = ApprovalEngine.determineApprovalRequirements(450);

      expect(reqs.requiresManagerApproval).toBe(false);
      expect(reqs.requiresAccountingApproval).toBe(true);
      expect(reqs.nextApprovalLevel).toBe('accounting');
    });

    it('facturas entre 500€ y 2000€ requieren ambas aprobaciones', () => {
      const reqs = ApprovalEngine.determineApprovalRequirements(1000);

      expect(reqs.requiresManagerApproval).toBe(true);
      expect(reqs.requiresAccountingApproval).toBe(true);
      expect(reqs.nextApprovalLevel).toBe('manager');
    });

    it('facturas > 2000€ requieren ambas aprobaciones', () => {
      const reqs = ApprovalEngine.determineApprovalRequirements(2500);

      expect(reqs.requiresManagerApproval).toBe(true);
      expect(reqs.requiresAccountingApproval).toBe(true);
      expect(reqs.nextApprovalLevel).toBe('manager');
    });

    it('facturas en límites exactos', () => {
      // Límite inferior: 500€
      const reqs1 = ApprovalEngine.determineApprovalRequirements(500);
      expect(reqs1.requiresManagerApproval).toBe(false);
      expect(reqs1.requiresAccountingApproval).toBe(true);

      // Límite superior: 500.01€
      const reqs2 = ApprovalEngine.determineApprovalRequirements(500.01);
      expect(reqs2.requiresManagerApproval).toBe(true);
      expect(reqs2.requiresAccountingApproval).toBe(true);

      // Límite superior: 2000€
      const reqs3 = ApprovalEngine.determineApprovalRequirements(2000);
      expect(reqs3.requiresManagerApproval).toBe(true);
      expect(reqs3.requiresAccountingApproval).toBe(true);

      // Límite superior: 2000.01€
      const reqs4 = ApprovalEngine.determineApprovalRequirements(2000.01);
      expect(reqs4.requiresManagerApproval).toBe(true);
      expect(reqs4.requiresAccountingApproval).toBe(true);
    });

    it('debe usar reglas personalizadas si se proporcionan', () => {
      const customRules = [
        {
          minAmount: 0,
          maxAmount: 1000,
          requiresManager: false,
          requiresAccounting: true,
        },
      ];

      const reqs = ApprovalEngine.determineApprovalRequirements(800, customRules);
      expect(reqs.requiresManagerApproval).toBe(false);
      expect(reqs.requiresAccountingApproval).toBe(true);
    });

    it('debe manejar facturas de 0€', () => {
      const reqs = ApprovalEngine.determineApprovalRequirements(0);
      expect(reqs.requiresAccountingApproval).toBe(true);
    });
  });

  describe('determineNextApprovalStatus', () => {
    it('manager aprueba -> pasar a pending_accounting si requiere contabilidad', () => {
      const invoice = {
        requiresManagerApproval: true,
        requiresAccountingApproval: true,
        approvalStatus: 'pending_manager',
      } as InvoiceReceived;

      const status = ApprovalEngine.determineNextApprovalStatus(
        invoice,
        'manager',
        'approved'
      );

      expect(status).toBe('pending_accounting');
    });

    it('manager aprueba -> approved si no requiere contabilidad', () => {
      const invoice = {
        requiresManagerApproval: true,
        requiresAccountingApproval: false,
        approvalStatus: 'pending_manager',
      } as InvoiceReceived;

      const status = ApprovalEngine.determineNextApprovalStatus(
        invoice,
        'manager',
        'approved'
      );

      expect(status).toBe('approved');
    });

    it('contabilidad aprueba -> approved siempre', () => {
      const invoice = {
        requiresManagerApproval: true,
        requiresAccountingApproval: true,
        approvalStatus: 'pending_accounting',
      } as InvoiceReceived;

      const status = ApprovalEngine.determineNextApprovalStatus(
        invoice,
        'accounting',
        'approved'
      );

      expect(status).toBe('approved');
    });

    it('cualquier rechazo -> rejected siempre', () => {
      const invoice = {
        requiresManagerApproval: true,
        requiresAccountingApproval: true,
        approvalStatus: 'pending_manager',
      } as InvoiceReceived;

      const status = ApprovalEngine.determineNextApprovalStatus(
        invoice,
        'manager',
        'rejected'
      );

      expect(status).toBe('rejected');
    });
  });

  describe('canUserApprove', () => {
    it('admin puede aprobar en cualquier nivel', () => {
      expect(ApprovalEngine.canUserApprove('admin', 'manager')).toBe(true);
      expect(ApprovalEngine.canUserApprove('admin', 'accounting')).toBe(true);
    });

    it('manager solo puede aprobar nivel manager', () => {
      expect(ApprovalEngine.canUserApprove('manager', 'manager')).toBe(true);
      expect(ApprovalEngine.canUserApprove('manager', 'accounting')).toBe(false);
    });

    it('accountant solo puede aprobar nivel accounting', () => {
      expect(ApprovalEngine.canUserApprove('accountant', 'accounting')).toBe(true);
      expect(ApprovalEngine.canUserApprove('accountant', 'manager')).toBe(false);
    });

    it('viewer no puede aprobar nada', () => {
      expect(ApprovalEngine.canUserApprove('viewer', 'manager')).toBe(false);
      expect(ApprovalEngine.canUserApprove('viewer', 'accounting')).toBe(false);
    });
  });

  describe('getPendingApprovalLevel', () => {
    it('debe devolver manager para pending_manager', () => {
      const invoice = {
        approvalStatus: 'pending_manager',
      } as InvoiceReceived;

      expect(ApprovalEngine.getPendingApprovalLevel(invoice)).toBe('manager');
    });

    it('debe devolver accounting para pending_accounting', () => {
      const invoice = {
        approvalStatus: 'pending_accounting',
      } as InvoiceReceived;

      expect(ApprovalEngine.getPendingApprovalLevel(invoice)).toBe('accounting');
    });

    it('debe devolver null para approved', () => {
      const invoice = {
        approvalStatus: 'approved',
      } as InvoiceReceived;

      expect(ApprovalEngine.getPendingApprovalLevel(invoice)).toBe(null);
    });

    it('debe devolver null para rejected', () => {
      const invoice = {
        approvalStatus: 'rejected',
      } as InvoiceReceived;

      expect(ApprovalEngine.getPendingApprovalLevel(invoice)).toBe(null);
    });
  });

  describe('isFullyApproved', () => {
    it('debe devolver true para approved', () => {
      const invoice = {
        approvalStatus: 'approved',
      } as InvoiceReceived;

      expect(ApprovalEngine.isFullyApproved(invoice)).toBe(true);
    });

    it('debe devolver false para pending', () => {
      const invoice = {
        approvalStatus: 'pending_manager',
      } as InvoiceReceived;

      expect(ApprovalEngine.isFullyApproved(invoice)).toBe(false);
    });
  });

  describe('isPendingApproval', () => {
    it('debe devolver true para pending_manager', () => {
      const invoice = {
        approvalStatus: 'pending_manager',
      } as InvoiceReceived;

      expect(ApprovalEngine.isPendingApproval(invoice)).toBe(true);
    });

    it('debe devolver true para pending_accounting', () => {
      const invoice = {
        approvalStatus: 'pending_accounting',
      } as InvoiceReceived;

      expect(ApprovalEngine.isPendingApproval(invoice)).toBe(true);
    });

    it('debe devolver false para approved', () => {
      const invoice = {
        approvalStatus: 'approved',
      } as InvoiceReceived;

      expect(ApprovalEngine.isPendingApproval(invoice)).toBe(false);
    });
  });
});
