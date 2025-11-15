import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GlobalBalanceValidation {
  valid: boolean;
  totalDebit: number;
  totalCredit: number;
  difference: number;
  errorMessage?: string;
}

export interface TrialBalanceAccount {
  accountCode: string;
  accountName: string;
  balance: number;
  balanceType: string;
  expectedBalanceType: string;
  isValid: boolean;
  warning?: string;
}

export interface TrialBalanceValidation {
  valid: boolean;
  invalidAccounts: TrialBalanceAccount[];
  totalInvalidAccounts: number;
}

export interface VATReconciliationDetail {
  vatType: string;
  vatRate: number;
  vatIssued: number;
  vatReceived: number;
  vatInAccounting: number;
  difference: number;
  isValid: boolean;
  errorMessage?: string;
}

export interface VATReconciliationValidation {
  valid: boolean;
  details: VATReconciliationDetail[];
  totalErrors: number;
}

export interface EntrySequenceValidation {
  minEntryNumber: number;
  maxEntryNumber: number;
  expectedCount: number;
  actualCount: number;
  missingNumbers: number[];
  duplicateNumbers: number[];
  hasGaps: boolean;
  hasDuplicates: boolean;
  isValid: boolean;
  warningMessage?: string;
}

export interface AdvancedValidationResults {
  globalBalance: GlobalBalanceValidation;
  trialBalance: TrialBalanceValidation;
  vatReconciliation: VATReconciliationValidation;
  entrySequence: EntrySequenceValidation;
  overallValid: boolean;
  criticalErrors: number;
  warnings: number;
}

export function useAdvancedValidations(fiscalYearId: string, centroCode: string) {
  return useQuery({
    queryKey: ["advanced-validations", fiscalYearId, centroCode],
    queryFn: async (): Promise<AdvancedValidationResults> => {
      console.log('[useAdvancedValidations] Starting validations...', { fiscalYearId, centroCode });

      // Execute all 4 validations in parallel (with type casting until migration is applied)
      const [
        globalBalanceResult,
        trialBalanceResult,
        vatReconciliationResult,
        entrySequenceResult,
      ] = await Promise.all([
        // 1. Global Balance
        (supabase as any).rpc('validate_fiscal_year_balance', {
          p_fiscal_year_id: fiscalYearId,
        }),
        
        // 2. Trial Balance
        (supabase as any).rpc('validate_trial_balance', {
          p_fiscal_year_id: fiscalYearId,
        }),
        
        // 3. VAT Reconciliation
        (supabase as any).rpc('validate_vat_reconciliation', {
          p_fiscal_year_id: fiscalYearId,
          p_centro_code: centroCode,
        }),
        
        // 4. Entry Sequence
        (supabase as any).rpc('validate_entry_sequence', {
          p_fiscal_year_id: fiscalYearId,
        }),
      ]);

      // Check for RPC errors
      if (globalBalanceResult.error) throw globalBalanceResult.error;
      if (trialBalanceResult.error) throw trialBalanceResult.error;
      if (vatReconciliationResult.error) throw vatReconciliationResult.error;
      if (entrySequenceResult.error) throw entrySequenceResult.error;

      // Process Global Balance (single row)
      const gbData = globalBalanceResult.data?.[0] || {
        valid: false,
        total_debit: 0,
        total_credit: 0,
        difference: 0,
        error_message: 'No data',
      };

      const globalBalance: GlobalBalanceValidation = {
        valid: gbData.valid,
        totalDebit: gbData.total_debit,
        totalCredit: gbData.total_credit,
        difference: gbData.difference,
        errorMessage: gbData.error_message,
      };

      // Process Trial Balance (array of accounts)
      const tbData = (trialBalanceResult.data || []) as any[];
      const invalidAccounts = tbData
        .filter((acc: any) => !acc.is_valid)
        .map((acc: any) => ({
          accountCode: acc.account_code,
          accountName: acc.account_name || 'Sin nombre',
          balance: acc.balance,
          balanceType: acc.balance_type,
          expectedBalanceType: acc.expected_balance_type,
          isValid: acc.is_valid,
          warning: acc.warning,
        }));

      const trialBalance: TrialBalanceValidation = {
        valid: invalidAccounts.length === 0,
        invalidAccounts,
        totalInvalidAccounts: invalidAccounts.length,
      };

      // Process VAT Reconciliation (array by VAT type)
      const vatData = vatReconciliationResult.data || [];
      const vatDetails = vatData.map((vat: any) => ({
        vatType: vat.vat_type,
        vatRate: vat.vat_rate,
        vatIssued: vat.vat_issued,
        vatReceived: vat.vat_received,
        vatInAccounting: vat.vat_in_accounting,
        difference: vat.difference,
        isValid: vat.is_valid,
        errorMessage: vat.error_message,
      }));

      const vatReconciliation: VATReconciliationValidation = {
        valid: vatDetails.every(v => v.isValid),
        details: vatDetails,
        totalErrors: vatDetails.filter(v => !v.isValid).length,
      };

      // Process Entry Sequence (single row)
      const esData = entrySequenceResult.data?.[0] || {
        min_entry_number: 0,
        max_entry_number: 0,
        expected_count: 0,
        actual_count: 0,
        missing_numbers: [],
        duplicate_numbers: [],
        has_gaps: false,
        has_duplicates: false,
        is_valid: true,
        warning_message: null,
      };

      const entrySequence: EntrySequenceValidation = {
        minEntryNumber: esData.min_entry_number,
        maxEntryNumber: esData.max_entry_number,
        expectedCount: esData.expected_count,
        actualCount: esData.actual_count,
        missingNumbers: esData.missing_numbers || [],
        duplicateNumbers: esData.duplicate_numbers || [],
        hasGaps: esData.has_gaps,
        hasDuplicates: esData.has_duplicates,
        isValid: esData.is_valid,
        warningMessage: esData.warning_message,
      };

      // Calculate critical errors and warnings
      const criticalErrors = [
        !globalBalance.valid,
        !vatReconciliation.valid,
      ].filter(Boolean).length;

      const warnings = [
        !trialBalance.valid,
        !entrySequence.isValid,
      ].filter(Boolean).length;

      // Overall valid = no critical errors
      const overallValid = criticalErrors === 0;

      console.log('[useAdvancedValidations] Results:', {
        overallValid,
        criticalErrors,
        warnings,
      });

      return {
        globalBalance,
        trialBalance,
        vatReconciliation,
        entrySequence,
        overallValid,
        criticalErrors,
        warnings,
      };
    },
    enabled: !!fiscalYearId && !!centroCode,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}
