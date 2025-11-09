// ============================================================================
// SERVICIO DE DOMINIO: BalanceCalculator
// Cálculos de balances contables (Trial Balance, Balance Sheet)
// ============================================================================

import { supabase } from "@/integrations/supabase/client";
import { EntryCalculator } from './EntryCalculator';
import type { Transaction } from '../types';

export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  accountType: string;
  level: number;
  parentCode: string | null;
  debitTotal: number;
  creditTotal: number;
  balance: number;
}

export interface BalanceSheetData {
  activo: BalanceSheetSection;
  pasivo: BalanceSheetSection;
  patrimonioNeto: BalanceSheetSection;
  isBalanced: boolean;
  difference: number;
}

export interface BalanceSheetSection {
  total: number;
  groups: { [key: string]: number };
}

export interface AccountBalance {
  accountCode: string;
  debitTotal: number;
  creditTotal: number;
  balance: number;
}

export class BalanceCalculator {
  /**
   * Calcula el balance de comprobación (sumas y saldos)
   */
  static async calculateTrialBalance(
    centroCode: string,
    startDate: string,
    endDate: string
  ): Promise<TrialBalanceRow[]> {
    const { data: transactions, error } = await supabase
      .from('accounting_transactions')
      .select(`
        account_code,
        movement_type,
        amount,
        accounting_entries!inner(
          centro_code,
          entry_date,
          status
        )
      `)
      .eq('accounting_entries.centro_code', centroCode)
      .gte('accounting_entries.entry_date', startDate)
      .lte('accounting_entries.entry_date', endDate)
      .eq('accounting_entries.status', 'posted');

    if (error) throw error;

    // Obtener información de cuentas
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('code, name, account_type, level, parent_code')
      .eq('centro_code', centroCode);

    if (accountsError) throw accountsError;

    // Agrupar por cuenta
    const accountMap = new Map<string, { debit: number; credit: number }>();

    transactions?.forEach((t: any) => {
      const current = accountMap.get(t.account_code) || { debit: 0, credit: 0 };
      if (t.movement_type === 'debit') {
        current.debit += t.amount;
      } else {
        current.credit += t.amount;
      }
      accountMap.set(t.account_code, current);
    });

    // Mapear a resultado
    const result: TrialBalanceRow[] = [];

    accountMap.forEach((totals, accountCode) => {
      const account = accounts?.find(a => a.code === accountCode);
      if (!account) return;

      result.push({
        accountCode,
        accountName: account.name,
        accountType: account.account_type,
        level: account.level || 0,
        parentCode: account.parent_code,
        debitTotal: totals.debit,
        creditTotal: totals.credit,
        balance: totals.debit - totals.credit,
      });
    });

    return result.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
  }

  /**
   * Calcula el balance de situación (activo, pasivo, patrimonio neto)
   */
  static async calculateBalanceSheet(
    centroCode: string,
    asOfDate: string
  ): Promise<BalanceSheetData> {
    const trialBalance = await this.calculateTrialBalance(
      centroCode,
      '1900-01-01', // Desde el inicio
      asOfDate
    );

    const activo: BalanceSheetSection = { total: 0, groups: {} };
    const pasivo: BalanceSheetSection = { total: 0, groups: {} };
    const patrimonioNeto: BalanceSheetSection = { total: 0, groups: {} };

    trialBalance.forEach(row => {
      const group = row.accountCode.charAt(0);

      if (group === '1' || group === '2') {
        // Activo (grupos 1 y 2)
        activo.total += row.balance;
        activo.groups[group] = (activo.groups[group] || 0) + row.balance;
      } else if (group === '4' || group === '5') {
        // Pasivo (grupos 4 y 5)
        pasivo.total += Math.abs(row.balance);
        pasivo.groups[group] = (pasivo.groups[group] || 0) + Math.abs(row.balance);
      } else if (group === '1') {
        // Patrimonio neto (subgrupo específico)
        patrimonioNeto.total += Math.abs(row.balance);
        patrimonioNeto.groups[group] = (patrimonioNeto.groups[group] || 0) + Math.abs(row.balance);
      }
    });

    const difference = activo.total - (pasivo.total + patrimonioNeto.total);
    const isBalanced = Math.abs(difference) < 0.01;

    return {
      activo,
      pasivo,
      patrimonioNeto,
      isBalanced,
      difference,
    };
  }

  /**
   * Calcula el saldo de una cuenta específica
   */
  static async calculateAccountBalance(
    accountCode: string,
    centroCode: string,
    startDate: string,
    endDate: string
  ): Promise<AccountBalance> {
    const { data: transactions, error } = await supabase
      .from('accounting_transactions')
      .select(`
        movement_type,
        amount,
        accounting_entries!inner(
          centro_code,
          entry_date,
          status
        )
      `)
      .eq('account_code', accountCode)
      .eq('accounting_entries.centro_code', centroCode)
      .gte('accounting_entries.entry_date', startDate)
      .lte('accounting_entries.entry_date', endDate)
      .eq('accounting_entries.status', 'posted');

    if (error) throw error;

    let debitTotal = 0;
    let creditTotal = 0;

    transactions?.forEach((t: any) => {
      if (t.movement_type === 'debit') {
        debitTotal += t.amount;
      } else {
        creditTotal += t.amount;
      }
    });

    return {
      accountCode,
      debitTotal,
      creditTotal,
      balance: debitTotal - creditTotal,
    };
  }

  /**
   * Suma saldos por grupo PGC
   */
  static async sumByAccountGroup(
    groupCode: string,
    centroCode: string,
    startDate: string,
    endDate: string
  ): Promise<number> {
    const trialBalance = await this.calculateTrialBalance(
      centroCode,
      startDate,
      endDate
    );

    return trialBalance
      .filter(row => row.accountCode.startsWith(groupCode))
      .reduce((sum, row) => sum + row.balance, 0);
  }

  /**
   * Obtiene saldos de apertura de un ejercicio fiscal
   */
  static async getOpeningBalances(
    centroCode: string,
    fiscalYearId: string
  ): Promise<AccountBalance[]> {
    // Obtener fecha de inicio del ejercicio
    const { data: fiscalYear, error: fyError } = await supabase
      .from('fiscal_years')
      .select('start_date')
      .eq('id', fiscalYearId)
      .single();

    if (fyError) throw fyError;

    if (!fiscalYear) {
      throw new Error('Fiscal year not found');
    }

    // Calcular saldos hasta la fecha de inicio
    const trialBalance = await this.calculateTrialBalance(
      centroCode,
      '1900-01-01',
      fiscalYear.start_date
    );

    return trialBalance.map(row => ({
      accountCode: row.accountCode,
      debitTotal: row.debitTotal,
      creditTotal: row.creditTotal,
      balance: row.balance,
    }));
  }

  /**
   * Calcula saldos de cierre de un ejercicio fiscal
   */
  static async calculateClosingBalances(
    centroCode: string,
    fiscalYearId: string
  ): Promise<AccountBalance[]> {
    // Obtener fecha de fin del ejercicio
    const { data: fiscalYear, error: fyError } = await supabase
      .from('fiscal_years')
      .select('end_date')
      .eq('id', fiscalYearId)
      .single();

    if (fyError) throw fyError;

    if (!fiscalYear) {
      throw new Error('Fiscal year not found');
    }

    // Calcular saldos hasta la fecha de fin
    const trialBalance = await this.calculateTrialBalance(
      centroCode,
      '1900-01-01',
      fiscalYear.end_date
    );

    return trialBalance.map(row => ({
      accountCode: row.accountCode,
      debitTotal: row.debitTotal,
      creditTotal: row.creditTotal,
      balance: row.balance,
    }));
  }
}
