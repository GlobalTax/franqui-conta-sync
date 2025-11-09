// ============================================================================
// SERVICIO DE DOMINIO: PGCValidator
// Validación de estructura y reglas del Plan General Contable Español
// ============================================================================

import { AccountCode } from '../value-objects/AccountCode';
import { ValidationResult } from '../types';

export class PGCValidator {
  // Grupos PGC válidos (1-9)
  private static readonly VALID_GROUPS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  // Grupos de balance (1-5)
  private static readonly BALANCE_GROUPS = [1, 2, 3, 4, 5];

  // Grupos de PyG (6-7)
  private static readonly PNL_GROUPS = [6, 7];

  /**
   * Valida que un código de cuenta pertenezca a un grupo PGC válido
   */
  static validateAccountGroup(accountCode: string): ValidationResult {
    try {
      const account = AccountCode.create(accountCode);
      const group = account.getGroup();

      if (!this.VALID_GROUPS.includes(group)) {
        return {
          valid: false,
          error: 'INVALID_PGC_GROUP',
          details: `El grupo ${group} no es válido en el PGC. Debe ser entre 1 y 9`,
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: 'INVALID_ACCOUNT_CODE',
        details: error instanceof Error ? error.message : 'Código de cuenta inválido',
      };
    }
  }

  /**
   * Valida que una cuenta sea de balance (grupos 1-5)
   */
  static isBalanceAccount(accountCode: string): boolean {
    try {
      const account = AccountCode.create(accountCode);
      return this.BALANCE_GROUPS.includes(account.getGroup());
    } catch {
      return false;
    }
  }

  /**
   * Valida que una cuenta sea de PyG (grupos 6-7)
   */
  static isPnLAccount(accountCode: string): boolean {
    try {
      const account = AccountCode.create(accountCode);
      return this.PNL_GROUPS.includes(account.getGroup());
    } catch {
      return false;
    }
  }

  /**
   * Valida que una cuenta sea de activo (grupos 2, 3, 5)
   */
  static isAssetAccount(accountCode: string): boolean {
    try {
      const account = AccountCode.create(accountCode);
      const group = account.getGroup();
      return [2, 3, 5].includes(group);
    } catch {
      return false;
    }
  }

  /**
   * Valida que una cuenta sea de pasivo (grupo 4)
   */
  static isLiabilityAccount(accountCode: string): boolean {
    try {
      const account = AccountCode.create(accountCode);
      return account.getGroup() === 4;
    } catch {
      return false;
    }
  }

  /**
   * Valida que una cuenta sea de patrimonio neto (grupo 1)
   */
  static isEquityAccount(accountCode: string): boolean {
    try {
      const account = AccountCode.create(accountCode);
      return account.getGroup() === 1;
    } catch {
      return false;
    }
  }

  /**
   * Valida que una cuenta sea de gastos (grupo 6)
   */
  static isExpenseAccount(accountCode: string): boolean {
    try {
      const account = AccountCode.create(accountCode);
      return account.getGroup() === 6;
    } catch {
      return false;
    }
  }

  /**
   * Valida que una cuenta sea de ingresos (grupo 7)
   */
  static isIncomeAccount(accountCode: string): boolean {
    try {
      const account = AccountCode.create(accountCode);
      return account.getGroup() === 7;
    } catch {
      return false;
    }
  }

  /**
   * Obtiene el nombre descriptivo del grupo PGC
   */
  static getGroupName(group: number): string {
    const groupNames: Record<number, string> = {
      1: 'Financiación Básica',
      2: 'Activo No Corriente',
      3: 'Existencias',
      4: 'Acreedores y Deudores',
      5: 'Cuentas Financieras',
      6: 'Compras y Gastos',
      7: 'Ventas e Ingresos',
      8: 'Gastos Imputados al Patrimonio Neto',
      9: 'Ingresos Imputados al Patrimonio Neto',
    };

    return groupNames[group] || 'Grupo Desconocido';
  }

  /**
   * Valida la longitud del código de cuenta
   */
  static validateAccountLength(accountCode: string): ValidationResult {
    const length = accountCode.length;

    if (length < 1 || length > 7) {
      return {
        valid: false,
        error: 'INVALID_ACCOUNT_LENGTH',
        details: `El código de cuenta debe tener entre 1 y 7 dígitos. Longitud actual: ${length}`,
      };
    }

    return { valid: true };
  }
}
