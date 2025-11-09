// ============================================================================
// SERVICIO DE DOMINIO - ReconciliationEngine
// Motor de matching y scoring para conciliación bancaria
// Responsabilidad: Calcular matches y confidence scores sin efectos secundarios
// ============================================================================

import type { BankTransaction, ReconciliationRule } from '../types';
import type { InvoiceReceived } from '@/domain/invoicing/types';

export interface ReconciliationMatch {
  matchType: 'invoice_received' | 'invoice_issued' | 'entry' | 'daily_closure' | 'manual';
  matchedId: string;
  confidenceScore: number;
  matchReasons: string[];
  metadata?: Record<string, any>;
}

export interface MatchCriteria {
  amountTolerance: number; // En euros (ej: 0.01)
  dateTolerance: number; // En días (ej: 3)
  requireExactAmount: boolean;
  checkDescription: boolean;
  checkReference: boolean;
}

/**
 * Motor de conciliación bancaria
 * Responsabilidad: Calcular matches y confidence scores sin efectos secundarios
 */
export class ReconciliationEngine {
  private static readonly DEFAULT_CRITERIA: MatchCriteria = {
    amountTolerance: 0.01,
    dateTolerance: 3,
    requireExactAmount: false,
    checkDescription: true,
    checkReference: true,
  };

  /**
   * Busca matches entre una transacción y facturas recibidas
   */
  static findInvoiceMatches(
    transaction: BankTransaction,
    invoices: any[],
    criteria: Partial<MatchCriteria> = {}
  ): ReconciliationMatch[] {
    const fullCriteria = { ...this.DEFAULT_CRITERIA, ...criteria };
    const matches: ReconciliationMatch[] = [];

    for (const invoice of invoices) {
      const score = this.calculateInvoiceMatchScore(transaction, invoice, fullCriteria);
      
      if (score.total >= 70) {
        matches.push({
          matchType: 'invoice_received',
          matchedId: invoice.id,
          confidenceScore: score.total,
          matchReasons: score.reasons,
          metadata: {
            invoiceNumber: invoice.invoiceNumber,
            supplierName: invoice.supplier?.name,
          },
        });
      }
    }

    return matches.sort((a, b) => b.confidenceScore - a.confidenceScore);
  }

  /**
   * Calcula score de matching entre transacción y factura
   */
  private static calculateInvoiceMatchScore(
    transaction: BankTransaction,
    invoice: InvoiceReceived,
    criteria: MatchCriteria
  ): { total: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    // 1. Matching por importe (peso: 40%)
    const amountDiff = Math.abs(Math.abs(transaction.amount) - invoice.total);
    if (amountDiff <= criteria.amountTolerance) {
      score += 40;
      reasons.push(`Importe coincide exactamente (${invoice.total}€)`);
    } else if (amountDiff <= 5) {
      score += 30;
      reasons.push(`Importe muy cercano (diff: ${amountDiff.toFixed(2)}€)`);
    } else if (amountDiff <= 20) {
      score += 15;
      reasons.push(`Importe cercano (diff: ${amountDiff.toFixed(2)}€)`);
    }

    // 2. Matching por fecha (peso: 30%)
    const daysDiff = this.daysBetween(transaction.transactionDate, invoice.invoiceDate);
    if (daysDiff === 0) {
      score += 30;
      reasons.push('Fecha exacta');
    } else if (daysDiff <= criteria.dateTolerance) {
      score += 20;
      reasons.push(`Fecha cercana (${daysDiff} días)`);
    } else if (daysDiff <= 7) {
      score += 10;
      reasons.push(`Fecha en misma semana (${daysDiff} días)`);
    }

    // 3. Matching por referencia/descripción (peso: 30%)
    if (criteria.checkReference) {
      const refMatch = this.checkReferenceMatch(
        transaction.reference || '',
        transaction.description,
        invoice.invoiceNumber
      );
      
      if (refMatch.exact) {
        score += 30;
        reasons.push('Referencia coincide exactamente');
      } else if (refMatch.partial) {
        score += 15;
        reasons.push('Referencia coincide parcialmente');
      }
    }

    return { total: Math.round(score), reasons };
  }

  /**
   * Calcula días entre dos fechas
   */
  private static daysBetween(date1: string, date2: string): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Verifica matching de referencias
   */
  private static checkReferenceMatch(
    transactionRef: string,
    transactionDesc: string,
    invoiceNumber: string
  ): { exact: boolean; partial: boolean } {
    const refUpper = transactionRef.toUpperCase();
    const descUpper = transactionDesc.toUpperCase();
    const invoiceUpper = invoiceNumber.toUpperCase();

    const exact = refUpper === invoiceUpper || descUpper.includes(invoiceUpper);
    const partial = refUpper.includes(invoiceUpper) || invoiceUpper.includes(refUpper.substring(0, 6));

    return { exact, partial };
  }

  /**
   * Aplica reglas de conciliación automática
   */
  static applyReconciliationRules(
    transaction: BankTransaction,
    rules: ReconciliationRule[]
  ): ReconciliationRule | null {
    const activeRules = rules
      .filter(r => r.active)
      .sort((a, b) => b.priority - a.priority);

    for (const rule of activeRules) {
      if (this.matchesRule(transaction, rule)) {
        return rule;
      }
    }

    return null;
  }

  /**
   * Verifica si una transacción coincide con una regla
   */
  private static matchesRule(transaction: BankTransaction, rule: ReconciliationRule): boolean {
    // 1. Verificar tipo de transacción (débito/crédito)
    if (rule.transactionType) {
      const isDebit = transaction.amount < 0;
      if (rule.transactionType === 'debit' && !isDebit) return false;
      if (rule.transactionType === 'credit' && isDebit) return false;
    }

    // 2. Verificar rango de importe
    const absAmount = Math.abs(transaction.amount);
    if (rule.amountMin !== null && absAmount < rule.amountMin) return false;
    if (rule.amountMax !== null && absAmount > rule.amountMax) return false;

    // 3. Verificar patrón de descripción
    if (rule.descriptionPattern) {
      const regex = new RegExp(rule.descriptionPattern, 'i');
      if (!regex.test(transaction.description)) return false;
    }

    return true;
  }
}
