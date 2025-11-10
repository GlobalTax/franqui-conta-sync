// ============================================================================
// EXPENSE CATEGORIES
// Categorías de gasto para clasificación contable
// ============================================================================

export const EXPENSE_CATEGORIES = [
  { value: 'rent', label: 'Renta base' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'paper', label: 'Papelería' },
  { value: 'food', label: 'Comida' },
  { value: 'beverage', label: 'Bebida' },
  { value: 'packaging', label: 'Embalajes' },
  { value: 'utilities', label: 'Suministros' },
  { value: 'maintenance', label: 'Mantenimiento' },
  { value: 'services', label: 'Servicios' },
  { value: 'insurance', label: 'Seguros' },
  { value: 'taxes', label: 'Impuestos' },
  { value: 'salaries', label: 'Salarios' },
  { value: 'other', label: 'Otros gastos' }
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number]['value'];
