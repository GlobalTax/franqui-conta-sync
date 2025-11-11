// ============================================================================
// HOOK: Invoice Stripper
// Manejo del módulo de limpieza y normalización de datos OCR
// ============================================================================

import { useState, useCallback } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { normalizeFull, type NormalizationChange } from '@/lib/fiscal';
import { toast } from 'sonner';

export interface StripperState {
  isNormalized: boolean;
  changes: NormalizationChange[];
  warnings: string[];
  appliedAt: Date | null;
}

export const useInvoiceStripper = (form: UseFormReturn<any>) => {
  const [stripperState, setStripperState] = useState<StripperState>({
    isNormalized: false,
    changes: [],
    warnings: [],
    appliedAt: null
  });

  const applyStripper = useCallback(() => {
    const currentValues = form.getValues();
    
    // Construir objeto similar a OCRInvoiceData para normalizar
    const dataToNormalize = {
      supplier_tax_id: currentValues.supplier_tax_id,
      supplier_name: currentValues.supplier_name,
      invoice_number: currentValues.invoice_number,
      issue_date: currentValues.invoice_date,
      due_date: currentValues.due_date,
      subtotal: currentValues.subtotal,
      tax_total: currentValues.tax_total,
      total: currentValues.total,
      currency: currentValues.currency,
      tax_breakdown: currentValues.tax_lines?.map((line: any) => ({
        base: line.tax_base,
        vat: line.tax_amount,
        rate: line.tax_rate
      })) || [],
      line_items: []
    };

    const { normalized, changes, warnings } = normalizeFull(dataToNormalize);

    // Aplicar valores normalizados al formulario
    if (normalized.supplier_tax_id) {
      form.setValue('supplier_tax_id', normalized.supplier_tax_id, { shouldDirty: true });
    }
    if (normalized.supplier_name) {
      form.setValue('supplier_name', normalized.supplier_name, { shouldDirty: true });
    }
    if (normalized.invoice_number) {
      form.setValue('invoice_number', normalized.invoice_number, { shouldDirty: true });
    }
    if (normalized.issue_date) {
      form.setValue('invoice_date', normalized.issue_date, { shouldDirty: true });
    }
    if (normalized.due_date) {
      form.setValue('due_date', normalized.due_date, { shouldDirty: true });
    }
    if (normalized.subtotal !== undefined) {
      form.setValue('subtotal', normalized.subtotal, { shouldDirty: true });
    }
    if (normalized.tax_total !== undefined) {
      form.setValue('tax_total', normalized.tax_total, { shouldDirty: true });
    }
    if (normalized.total !== undefined) {
      form.setValue('total', normalized.total, { shouldDirty: true });
    }

    // Actualizar tax_lines si hay breakdown normalizado
    if (normalized.tax_breakdown && normalized.tax_breakdown.length > 0) {
      const normalizedTaxLines = normalized.tax_breakdown.map((item: any, idx: number) => {
        const existingLine = currentValues.tax_lines?.[idx] || {};
        return {
          ...existingLine,
          tax_base: item.base,
          tax_amount: item.vat,
          tax_rate: item.rate,
          account_code: existingLine.account_code || ''
        };
      });
      form.setValue('tax_lines', normalizedTaxLines, { shouldDirty: true });
    }

    setStripperState({
      isNormalized: true,
      changes,
      warnings,
      appliedAt: new Date()
    });

    const changesCount = changes.length;
    const warningsCount = warnings.length;

    toast.success('Datos normalizados', {
      description: `${changesCount} cambio${changesCount !== 1 ? 's' : ''} aplicado${changesCount !== 1 ? 's' : ''}${warningsCount > 0 ? ` • ${warningsCount} advertencia${warningsCount !== 1 ? 's' : ''}` : ''}`
    });

    return { normalized, changes, warnings };
  }, [form]);

  const resetStripper = useCallback(() => {
    setStripperState({
      isNormalized: false,
      changes: [],
      warnings: [],
      appliedAt: null
    });
  }, []);

  const getFieldChange = useCallback((fieldName: string): NormalizationChange | undefined => {
    return stripperState.changes.find(change => change.field === fieldName);
  }, [stripperState.changes]);

  return {
    stripperState,
    applyStripper,
    resetStripper,
    getFieldChange
  };
};
