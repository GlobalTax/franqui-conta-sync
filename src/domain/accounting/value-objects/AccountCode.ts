// ============================================================================
// VALUE OBJECT: AccountCode (Código de Cuenta PGC)
// Representa un código de cuenta del Plan General Contable Español
// ============================================================================

export class AccountCode {
  private readonly code: string;

  private constructor(code: string) {
    this.code = code;
  }

  static create(code: string): AccountCode {
    const normalized = code.trim();
    
    if (!normalized) {
      throw new Error('Account code cannot be empty');
    }

    // Validar formato PGC (1-7 dígitos)
    if (!/^\d{1,7}$/.test(normalized)) {
      throw new Error('Invalid PGC account code format. Must be 1-7 digits');
    }

    return new AccountCode(normalized);
  }

  getValue(): string {
    return this.code;
  }

  // Obtener grupo PGC (primer dígito)
  getGroup(): number {
    return parseInt(this.code.charAt(0));
  }

  // Obtener subgrupo PGC (primeros 2 dígitos)
  getSubGroup(): string {
    return this.code.substring(0, 2);
  }

  // Validar si pertenece a un grupo específico
  belongsToGroup(group: number): boolean {
    return this.getGroup() === group;
  }

  // Validar si es cuenta de balance (grupos 1-5)
  isBalanceAccount(): boolean {
    const group = this.getGroup();
    return group >= 1 && group <= 5;
  }

  // Validar si es cuenta de PyG (grupos 6-7)
  isPnLAccount(): boolean {
    const group = this.getGroup();
    return group === 6 || group === 7;
  }

  equals(other: AccountCode): boolean {
    return this.code === other.getValue();
  }

  toString(): string {
    return this.code;
  }
}
