// ============================================================================
// DEMO DATA GENERATORS v2.0
// Core generation functions for transactional demo data
// ============================================================================

import { supabase } from "@/integrations/supabase/client";
import {
  generateRandomIBAN,
  randomDateInYear,
  generateBankTransaction,
  generateInvoiceLines,
  calculateInvoiceTotals,
  generateDailySales,
  generateBatchId,
  generateOCRConfidence,
  SUPPLIER_CATEGORIES,
} from "./demoDataHelpers";
import { addDays } from "date-fns";

/**
 * FASE 1: Generate Bank Accounts & Transactions
 */
export async function generateBankData(
  centres: Array<{ id: string; codigo: string; nombre: string; seating_capacity: number }>,
  year: number,
  volume: 'light' | 'medium' | 'heavy'
) {
  console.log('📊 [FASE 1] Generando datos bancarios...');
  
  const accounts = [];
  const transactions = [];
  
  // Volume determines transaction count
  const transactionCounts = {
    light: 50,
    medium: 150,
    heavy: 500,
  };
  
  const transactionCount = transactionCounts[volume];
  
  // Create bank accounts for each centre
  for (const centre of centres) {
    const iban = generateRandomIBAN('ES');
    
    const { data: account, error } = await supabase
      .from('bank_accounts')
      .insert({
        centro_code: centre.codigo,
        account_name: `Cuenta ${centre.nombre}`,
        iban,
        swift: 'CAIXESBBXXX',
        currency: 'EUR',
        current_balance: Math.random() * 50000 + 10000,
        account_code: '5720000',
        active: true,
      })
      .select()
      .single();
    
    if (error) throw error;
    accounts.push(account);
    
    // Generate transactions for this account
    const batchId = generateBatchId();
    
    for (let i = 0; i < transactionCount; i++) {
      const date = randomDateInYear(year);
      
      // Distribution: 40% income, 40% supplier payments, 15% fixed expenses, 5% fees
      const rand = Math.random();
      let type: 'income' | 'supplier_payment' | 'fixed_expense' | 'bank_fees';
      
      if (rand < 0.4) {
        type = 'income';
      } else if (rand < 0.8) {
        type = 'supplier_payment';
      } else if (rand < 0.95) {
        type = 'fixed_expense';
      } else {
        type = 'bank_fees';
      }
      
      const transaction = generateBankTransaction(type, date, {
        supplier: 'PROVEEDOR SA',
        invoice: `INV${i}`,
        batch: `${i}`,
        month: date.toLocaleString('es-ES', { month: 'long' }),
      });
      
      transactions.push({
        bank_account_id: account.id,
        transaction_date: date.toISOString().split('T')[0],
        description: transaction.description,
        amount: transaction.amount,
        reference: transaction.reference,
        status: 'pending',
        import_batch_id: batchId,
        balance: null,
      });
    }
  }
  
  // Bulk insert transactions
  if (transactions.length > 0) {
    const { error } = await supabase
      .from('bank_transactions')
      .insert(transactions);
    
    if (error) throw error;
  }
  
  console.log(`✅ Creadas ${accounts.length} cuentas bancarias con ${transactions.length} transacciones`);
  
  return { accounts, transactions };
}

/**
 * FASE 2: Generate Invoices (Received & Issued)
 */
export async function generateInvoices(
  centres: Array<{ id: string; codigo: string; nombre: string; seating_capacity: number }>,
  suppliers: Array<{ id: string; name: string; tax_id: string }>,
  year: number,
  volume: 'light' | 'medium' | 'heavy'
) {
  console.log('📄 [FASE 2] Generando facturas...');
  
  // Volume determines invoice count per supplier
  const invoiceCounts = {
    light: 5,
    medium: 15,
    heavy: 50,
  };
  
  const invoiceCountPerSupplier = invoiceCounts[volume];
  
  const invoicesReceived = [];
  const invoicesIssued = [];
  
  // Generate received invoices
  for (const centre of centres) {
    for (const supplier of suppliers) {
      for (let i = 0; i < invoiceCountPerSupplier; i++) {
        const invoiceDate = randomDateInYear(year);
        const dueDate = addDays(invoiceDate, 30);
        
        // Random amount based on supplier category
        const baseAmount = Math.random() * 4000 + 500;
        const totals = calculateInvoiceTotals(baseAmount);
        
        // Random status distribution
        const statusRand = Math.random();
        let status: 'pending' | 'approved' | 'paid';
        if (statusRand < 0.3) status = 'pending';
        else if (statusRand < 0.7) status = 'approved';
        else status = 'paid';
        
        const { data: invoice, error } = await supabase
          .from('invoices_received')
          .insert({
            centro_code: centre.codigo,
            supplier_id: supplier.id,
            invoice_number: `FR-${supplier.tax_id.slice(-4)}-${year}-${i + 1}`,
            invoice_date: invoiceDate.toISOString().split('T')[0],
            due_date: dueDate.toISOString().split('T')[0],
            total_base: totals.base,
            total_iva: totals.vat,
            total: totals.total,
            status,
            ocr_processed: true,
            ocr_confidence: generateOCRConfidence(),
            ocr_engine: 'google-vision',
          })
          .select()
          .single();
        
        if (error) throw error;
        invoicesReceived.push(invoice);
        
        // Generate invoice lines
        const category = SUPPLIER_CATEGORIES[Math.floor(Math.random() * SUPPLIER_CATEGORIES.length)].type;
        const lines = generateInvoiceLines(category, totals.base);
        
        const lineInserts = lines.map((line, idx) => {
          const subtotal = line.quantity * line.unit_price;
          const tax_amount = subtotal * line.tax_rate;
          return {
            invoice_id: invoice.id,
            invoice_type: 'received' as const,
            line_number: idx + 1,
            description: line.description,
            quantity: line.quantity,
            unit_price: line.unit_price,
            subtotal: parseFloat(subtotal.toFixed(2)),
            tax_rate: line.tax_rate,
            tax_amount: parseFloat(tax_amount.toFixed(2)),
            total: parseFloat((subtotal + tax_amount).toFixed(2)),
            account_code: line.account_code,
          };
        });
        
        await supabase.from('invoice_lines').insert(lineInserts);
      }
    }
  }
  
  // Generate issued invoices (daily closures for McDonald's)
  const daysInYear = 365;
  const issueFrequency = volume === 'light' ? 7 : volume === 'medium' ? 3 : 1; // Weekly, every 3 days, or daily
  
  for (const centre of centres) {
    for (let day = 0; day < daysInYear; day += issueFrequency) {
      const date = new Date(year, 0, 1 + day);
      const salesByChannel = generateDailySales(date, centre.seating_capacity);
      
      const totalSales = salesByChannel.reduce((sum, s) => sum + s.amount, 0);
      const totals = calculateInvoiceTotals(totalSales);
      
      const invoiceNumber = Math.floor(Math.random() * 10000) + 1;
      
      const { data: invoice, error } = await supabase
        .from('invoices_issued')
        .insert({
          centro_code: centre.codigo,
          customer_name: 'VENTAS DIARIAS',
          invoice_number: invoiceNumber,
          invoice_date: date.toISOString().split('T')[0],
          subtotal: totals.base,
          tax_total: totals.vat,
          total: totals.total,
          status: 'issued',
        })
        .select()
        .single();
      
      if (error) throw error;
      invoicesIssued.push(invoice);
    }
  }
  
  console.log(`✅ Generadas ${invoicesReceived.length} facturas recibidas y ${invoicesIssued.length} facturas emitidas`);
  
  return { invoicesReceived, invoicesIssued };
}

/**
 * FASE 3: Generate Accounting Entries
 */
export async function generateAccountingEntries(
  centres: Array<{ id: string; codigo: string }>,
  fiscalYearId: string,
  invoicesReceived: Array<{ id: string; status: string; total: number; supplier_id: string }>,
  year: number,
  volume: 'light' | 'medium' | 'heavy'
) {
  console.log('📝 [FASE 3] Generando asientos contables...');
  
  const entries = [];
  
  // Volume determines additional entry count
  const additionalEntryCounts = {
    light: 20,
    medium: 100,
    heavy: 300,
  };
  
  const additionalEntryCount = additionalEntryCounts[volume];
  
  // Generate entries for approved invoices (skip RPC, generate directly)
  // Note: In production you would use an RPC or proper service
  for (const invoice of invoicesReceived.filter(i => i.status === 'approved' || i.status === 'paid').slice(0, 10)) {
    try {
      const date = new Date(invoice.id); // Using invoice creation as date proxy
      
      const { data: entry, error: entryError } = await supabase
        .from('accounting_entries')
        .insert({
          centro_code: centres[0].codigo,
          fiscal_year_id: fiscalYearId,
          entry_date: date.toISOString().split('T')[0],
          entry_number: entries.length + 1,
          description: `Factura proveedor ${invoice.supplier_id}`,
          total_debit: invoice.total,
          total_credit: invoice.total,
          status: 'posted',
        })
        .select()
        .single();
      
      if (!entryError && entry) {
        entries.push(entry);
      }
    } catch (error) {
      console.warn(`Could not generate entry for invoice ${invoice.id}:`, error);
    }
  }
  
  // Generate additional random entries
  for (const centre of centres) {
    for (let i = 0; i < additionalEntryCount; i++) {
      const date = randomDateInYear(year);
      
      // Random entry types
      const entryTypes = [
        { desc: 'Compra mercaderías', debit: '6000000', credit: '4100000', amount: 1000 + Math.random() * 3000 },
        { desc: 'Gasto suministros', debit: '6280000', credit: '5720000', amount: 200 + Math.random() * 800 },
        { desc: 'Nómina empleados', debit: '6400000', credit: '4650000', amount: 5000 + Math.random() * 10000 },
      ];
      
      const entryType = entryTypes[Math.floor(Math.random() * entryTypes.length)];
      
      try {
        const { data: entry, error } = await supabase
          .from('accounting_entries')
          .insert({
            centro_code: centre.codigo,
            fiscal_year_id: fiscalYearId,
            entry_date: date.toISOString().split('T')[0],
            entry_number: i + 1,
            description: entryType.desc,
            total_debit: entryType.amount,
            total_credit: entryType.amount,
            status: 'posted',
          })
          .select()
          .single();
        
        if (error) throw error;
        
        // Insert transactions
        await supabase.from('accounting_transactions').insert([
          {
            entry_id: entry.id,
            line_number: 1,
            account_code: entryType.debit,
            movement_type: 'debit',
            amount: entryType.amount,
            description: entryType.desc,
          },
          {
            entry_id: entry.id,
            line_number: 2,
            account_code: entryType.credit,
            movement_type: 'credit',
            amount: entryType.amount,
            description: entryType.desc,
          },
        ]);
        
        entries.push(entry);
      } catch (error) {
        console.warn(`Could not generate entry ${i}:`, error);
      }
    }
  }
  
  console.log(`✅ Generados ${entries.length} asientos contables`);
  
  return entries;
}

/**
 * FASE 4: Auto Reconciliation
 */
export async function autoReconcileTransactions(
  bankAccounts: Array<{ id: string }>,
  invoicesReceived: Array<{ id: string; total: number; invoice_number: string; status: string }>,
  bankTransactions: Array<{ id: string; amount: number; description: string; bank_account_id: string }>
) {
  console.log('🔗 [FASE 4] Ejecutando conciliación automática...');
  
  let reconciledCount = 0;
  
  // Match paid invoices with bank transactions
  const paidInvoices = invoicesReceived.filter(i => i.status === 'paid');
  
  for (const invoice of paidInvoices) {
    // Find matching transaction (negative amount, similar value)
    const matchingTransaction = bankTransactions.find(
      t => Math.abs(Math.abs(t.amount) - invoice.total) < 1 && t.amount < 0
    );
    
    if (matchingTransaction) {
      try {
        // Create reconciliation
        await supabase.from('bank_reconciliations').insert({
          bank_transaction_id: matchingTransaction.id,
          matched_type: 'invoice',
          matched_id: invoice.id,
          confidence_score: 95,
          reconciliation_status: 'confirmed',
          reconciled_by: (await supabase.auth.getUser()).data.user?.id,
          reconciled_at: new Date().toISOString(),
        });
        
        // Update transaction status
        await supabase
          .from('bank_transactions')
          .update({ status: 'reconciled' })
          .eq('id', matchingTransaction.id);
        
        reconciledCount++;
      } catch (error) {
        console.warn(`Could not reconcile transaction:`, error);
      }
    }
  }
  
  // Run auto-match RPC for remaining transactions
  for (const account of bankAccounts) {
    try {
      await supabase.rpc('auto_match_bank_transactions', {
        p_bank_account_id: account.id,
        p_limit: 100,
      });
    } catch (error) {
      console.warn(`Auto-match failed for account ${account.id}:`, error);
    }
  }
  
  console.log(`✅ Conciliadas ${reconciledCount} transacciones automáticamente`);
  
  return reconciledCount;
}
