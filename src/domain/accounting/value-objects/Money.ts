// ============================================================================
// VALUE OBJECT: Money (Importe Monetario)
// Representa un importe con precisión decimal para cálculos contables
// ============================================================================

export class Money {
  private readonly amount: number;
  private static readonly PRECISION = 2;
  private static readonly TOLERANCE = 0.01; // Tolerancia para comparaciones

  private constructor(amount: number) {
    this.amount = this.round(amount);
  }

  static create(amount: number): Money {
    if (isNaN(amount)) {
      throw new Error('Amount must be a valid number');
    }

    if (!isFinite(amount)) {
      throw new Error('Amount must be finite');
    }

    return new Money(amount);
  }

  static zero(): Money {
    return new Money(0);
  }

  getValue(): number {
    return this.amount;
  }

  add(other: Money): Money {
    return new Money(this.amount + other.amount);
  }

  subtract(other: Money): Money {
    return new Money(this.amount - other.amount);
  }

  multiply(factor: number): Money {
    return new Money(this.amount * factor);
  }

  isPositive(): boolean {
    return this.amount > 0;
  }

  isNegative(): boolean {
    return this.amount < 0;
  }

  isZero(): boolean {
    return Math.abs(this.amount) < Money.TOLERANCE;
  }

  equals(other: Money): boolean {
    return Math.abs(this.amount - other.amount) < Money.TOLERANCE;
  }

  greaterThan(other: Money): boolean {
    return this.amount - other.amount > Money.TOLERANCE;
  }

  lessThan(other: Money): boolean {
    return other.amount - this.amount > Money.TOLERANCE;
  }

  abs(): Money {
    return new Money(Math.abs(this.amount));
  }

  private round(value: number): number {
    const factor = Math.pow(10, Money.PRECISION);
    return Math.round(value * factor) / factor;
  }

  toString(): string {
    return this.amount.toFixed(Money.PRECISION);
  }
}
