// ============================================================================
// DEMO DATA HELPERS v2.0
// Helper functions for generating realistic demo data
// ============================================================================

import { addDays, addMonths } from "date-fns";

/**
 * Generate a random Spanish IBAN
 */
export function generateRandomIBAN(countryCode: string = 'ES'): string {
  const bankCode = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const branchCode = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const controlDigits = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  const accountNumber = Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
  
  return `${countryCode}${controlDigits}${bankCode}${branchCode}${controlDigits}${accountNumber}`;
}

/**
 * Generate a random date within a year
 */
export function randomDateInYear(year: number, month?: number): Date {
  if (month !== undefined) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    return new Date(
      startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime())
    );
  }
  
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);
  return new Date(
    startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime())
  );
}

/**
 * Generate realistic McDonald's sales channels data
 */
export const MCDONALDS_CHANNELS = [
  { code: 'drive_thru', name: 'Drive Thru', weight: 0.45 },
  { code: 'dine_in', name: 'Comedor', weight: 0.30 },
  { code: 'delivery', name: 'Delivery', weight: 0.15 },
  { code: 'takeaway', name: 'Para llevar', weight: 0.10 },
];

/**
 * Generate realistic supplier categories
 */
export const SUPPLIER_CATEGORIES = [
  { 
    type: 'food', 
    name: 'Alimentación',
    accountCode: '6000000',
    suppliers: [
      'Distribuidora Alimentaria Central SA',
      'Productos Frescos del Norte SL',
      'Suministros McDonald\'s Iberia',
    ]
  },
  { 
    type: 'paper', 
    name: 'Papel y Embalajes',
    accountCode: '6060000',
    suppliers: [
      'Envases y Embalajes Pro SL',
      'Packaging Solutions España',
    ]
  },
  { 
    type: 'services', 
    name: 'Servicios',
    accountCode: '6280000',
    suppliers: [
      'Limpieza Industrial Fast SL',
      'Mantenimiento Técnico 24h',
      'Seguridad y Vigilancia Plus',
    ]
  },
  { 
    type: 'utilities', 
    name: 'Suministros',
    accountCode: '6280000',
    suppliers: [
      'Iberdrola Energía SA',
      'Gas Natural Fenosa',
      'Aguas Municipales',
    ]
  },
];

/**
 * Generate realistic bank transaction descriptions
 */
export const BANK_TRANSACTION_TYPES = [
  // Ingresos
  {
    type: 'income',
    patterns: [
      'COBRO TPV {date} LOTE {batch}',
      'INGRESO EFECTIVO DIA {date}',
      'TRANSFERENCIA VENTA {date}',
    ],
    amountRange: [500, 5000],
  },
  // Pagos proveedores
  {
    type: 'supplier_payment',
    patterns: [
      'PAGO {supplier} FACT {invoice}',
      'TRANSFERENCIA {supplier}',
      'DOMICILIACION {supplier}',
    ],
    amountRange: [-5000, -100],
  },
  // Gastos fijos
  {
    type: 'fixed_expense',
    patterns: [
      'ALQUILER LOCAL MES {month}',
      'NOMINAS MES {month}',
      'SEGURIDAD SOCIAL {month}',
      'SUMINISTRO ELECTRICO',
      'SUMINISTRO AGUA',
      'SUMINISTRO GAS',
    ],
    amountRange: [-3000, -200],
  },
  // Comisiones bancarias
  {
    type: 'bank_fees',
    patterns: [
      'COMISION MANTENIMIENTO',
      'COMISION TPV',
      'COMISION TRANSFERENCIA',
    ],
    amountRange: [-100, -5],
  },
];

/**
 * Generate a random bank transaction
 */
export function generateBankTransaction(
  type: 'income' | 'supplier_payment' | 'fixed_expense' | 'bank_fees',
  date: Date,
  options: {
    supplier?: string;
    invoice?: string;
    batch?: string;
    month?: string;
  } = {}
): { description: string; amount: number; reference: string } {
  const transactionType = BANK_TRANSACTION_TYPES.find(t => t.type === type);
  if (!transactionType) throw new Error(`Unknown transaction type: ${type}`);

  const pattern = transactionType.patterns[
    Math.floor(Math.random() * transactionType.patterns.length)
  ];

  let description = pattern
    .replace('{date}', date.toISOString().split('T')[0])
    .replace('{supplier}', options.supplier || 'PROVEEDOR')
    .replace('{invoice}', options.invoice || `INV${Math.floor(Math.random() * 10000)}`)
    .replace('{batch}', options.batch || `${Math.floor(Math.random() * 1000)}`)
    .replace('{month}', options.month || date.toLocaleString('es-ES', { month: 'long' }).toUpperCase());

  const [min, max] = transactionType.amountRange;
  const amount = Math.random() * (max - min) + min;

  const reference = `REF${Math.floor(Math.random() * 1000000)}`;

  return { description, amount: parseFloat(amount.toFixed(2)), reference };
}

/**
 * Generate realistic invoice lines
 */
export function generateInvoiceLines(category: string, totalAmount: number): Array<{
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  account_code: string;
}> {
  const supplierCategory = SUPPLIER_CATEGORIES.find(c => c.type === category);
  if (!supplierCategory) {
    return [{
      description: 'Producto/Servicio',
      quantity: 1,
      unit_price: totalAmount,
      tax_rate: 0.21,
      account_code: '6000000',
    }];
  }

  const lineCount = Math.floor(Math.random() * 3) + 1; // 1-3 lines
  const lines = [];
  let remainingAmount = totalAmount;

  for (let i = 0; i < lineCount; i++) {
    const isLast = i === lineCount - 1;
    const lineAmount = isLast ? remainingAmount : (totalAmount / lineCount) * (0.8 + Math.random() * 0.4);
    
    const quantity = Math.floor(Math.random() * 50) + 1;
    const unit_price = lineAmount / quantity;

    lines.push({
      description: `${supplierCategory.name} - Item ${i + 1}`,
      quantity,
      unit_price: parseFloat(unit_price.toFixed(2)),
      tax_rate: 0.21,
      account_code: supplierCategory.accountCode,
    });

    remainingAmount -= lineAmount;
  }

  return lines;
}

/**
 * Calculate invoice totals including VAT
 */
export function calculateInvoiceTotals(baseAmount: number, vatRate: number = 0.21): {
  base: number;
  vat: number;
  total: number;
} {
  const base = parseFloat(baseAmount.toFixed(2));
  const vat = parseFloat((base * vatRate).toFixed(2));
  const total = parseFloat((base + vat).toFixed(2));
  
  return { base, vat, total };
}

/**
 * Generate daily sales by channel (McDonald's specific)
 */
export function generateDailySales(date: Date, centreCapacity: number): Array<{
  channel: string;
  amount: number;
}> {
  // Base daily sales: 50€ per seat
  const baseSales = centreCapacity * 50;
  
  // Add randomness ±20%
  const dailySales = baseSales * (0.8 + Math.random() * 0.4);
  
  // Distribute by channel
  return MCDONALDS_CHANNELS.map(channel => ({
    channel: channel.code,
    amount: parseFloat((dailySales * channel.weight).toFixed(2)),
  }));
}

/**
 * Format currency for demo data
 */
export function formatDemoCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

/**
 * Generate a batch ID for imports
 */
export function generateBatchId(): string {
  return `DEMO-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
}

/**
 * Generate OCR confidence score (realistic distribution)
 */
export function generateOCRConfidence(): number {
  // Most OCR results are good (70-100), some are medium (50-70), few are poor (0-50)
  const random = Math.random();
  
  if (random < 0.7) {
    // 70% high confidence (85-100)
    return 85 + Math.random() * 15;
  } else if (random < 0.9) {
    // 20% medium confidence (70-85)
    return 70 + Math.random() * 15;
  } else {
    // 10% low confidence (50-70)
    return 50 + Math.random() * 20;
  }
}
