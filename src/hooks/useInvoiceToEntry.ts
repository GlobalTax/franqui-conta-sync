import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useGenerateEntryFromInvoiceReceived = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      // Obtener la factura con sus líneas
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices_received')
        .select(`
          *,
          supplier:suppliers(name),
          lines:invoice_lines(*)
        `)
        .eq('id', invoiceId)
        .single();

      if (invoiceError) throw invoiceError;

      if (invoice.entry_id) {
        throw new Error('Esta factura ya tiene un asiento contable asociado');
      }

      // Verificar que existe un año fiscal
      const year = new Date(invoice.invoice_date).getFullYear();
      const { data: fiscalYear } = await supabase
        .from('fiscal_years')
        .select('id')
        .eq('year', year)
        .eq('centro_code', invoice.centro_code)
        .eq('status', 'open')
        .single();

      if (!fiscalYear) {
        throw new Error(`No existe un año fiscal abierto para ${year}`);
      }

      // Obtener el siguiente número de asiento
      const { data: lastEntry } = await supabase
        .from('accounting_entries')
        .select('entry_number')
        .eq('centro_code', invoice.centro_code)
        .order('entry_number', { ascending: false })
        .limit(1)
        .single();

      const nextEntryNumber = (lastEntry?.entry_number || 0) + 1;

      // Crear el asiento contable
      const description = `Factura recibida ${invoice.invoice_number} - ${invoice.supplier?.name || 'Proveedor'}`;

      const { data: entry, error: entryError } = await supabase
        .from('accounting_entries')
        .insert([{
          centro_code: invoice.centro_code,
          fiscal_year_id: fiscalYear.id,
          entry_number: nextEntryNumber,
          entry_date: invoice.invoice_date,
          description,
          status: 'draft',
        }])
        .select()
        .single();

      if (entryError) throw entryError;

      // Crear las transacciones del asiento
      const transactions = [];
      let lineNumber = 1;

      // DEBE: Gastos e IVA Soportado
      const linesData = invoice.lines || [];
      
      for (const line of linesData) {
        // Gasto
        transactions.push({
          entry_id: entry.id,
          account_code: line.account_code || '600000', // Cuenta de compras por defecto
          movement_type: 'debit',
          amount: line.subtotal,
          description: line.description,
          line_number: lineNumber++,
        });

        // IVA Soportado
        if (line.tax_amount > 0) {
          transactions.push({
            entry_id: entry.id,
            account_code: '472000', // IVA Soportado
            movement_type: 'debit',
            amount: line.tax_amount,
            description: `IVA ${line.tax_rate}% - ${line.description}`,
            line_number: lineNumber++,
          });
        }
      }

      // HABER: Proveedor
      transactions.push({
        entry_id: entry.id,
        account_code: '400000', // Proveedores
        movement_type: 'credit',
        amount: invoice.total,
        description: `Proveedor - ${invoice.supplier?.name || 'Varios'}`,
        line_number: lineNumber++,
      });

      const { error: transactionsError } = await supabase
        .from('accounting_transactions')
        .insert(transactions);

      if (transactionsError) throw transactionsError;

      // Actualizar la factura con el ID del asiento
      const { error: updateError } = await supabase
        .from('invoices_received')
        .update({ entry_id: entry.id })
        .eq('id', invoiceId);

      if (updateError) throw updateError;

      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices_received'] });
      queryClient.invalidateQueries({ queryKey: ['accounting_entries'] });
      toast.success('Asiento contable generado correctamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al generar asiento: ${error.message}`);
    },
  });
};

export const useGenerateEntryFromInvoiceIssued = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      // Obtener la factura con sus líneas
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices_issued')
        .select(`
          *,
          lines:invoice_lines(*)
        `)
        .eq('id', invoiceId)
        .single();

      if (invoiceError) throw invoiceError;

      if (invoice.entry_id) {
        throw new Error('Esta factura ya tiene un asiento contable asociado');
      }

      // Verificar que existe un año fiscal
      const year = new Date(invoice.invoice_date).getFullYear();
      const { data: fiscalYear } = await supabase
        .from('fiscal_years')
        .select('id')
        .eq('year', year)
        .eq('centro_code', invoice.centro_code)
        .eq('status', 'open')
        .single();

      if (!fiscalYear) {
        throw new Error(`No existe un año fiscal abierto para ${year}`);
      }

      // Obtener el siguiente número de asiento
      const { data: lastEntry } = await supabase
        .from('accounting_entries')
        .select('entry_number')
        .eq('centro_code', invoice.centro_code)
        .order('entry_number', { ascending: false })
        .limit(1)
        .single();

      const nextEntryNumber = (lastEntry?.entry_number || 0) + 1;

      // Crear el asiento contable
      const description = `Factura emitida ${invoice.full_invoice_number} - ${invoice.customer_name}`;

      const { data: entry, error: entryError } = await supabase
        .from('accounting_entries')
        .insert([{
          centro_code: invoice.centro_code,
          fiscal_year_id: fiscalYear.id,
          entry_number: nextEntryNumber,
          entry_date: invoice.invoice_date,
          description,
          status: 'draft',
        }])
        .select()
        .single();

      if (entryError) throw entryError;

      // Crear las transacciones del asiento
      const transactions = [];
      let lineNumber = 1;

      // DEBE: Cliente
      transactions.push({
        entry_id: entry.id,
        account_code: '430000', // Clientes
        movement_type: 'debit',
        amount: invoice.total,
        description: `Cliente - ${invoice.customer_name}`,
        line_number: lineNumber++,
      });

      // HABER: Ventas e IVA Repercutido
      const linesData = invoice.lines || [];
      
      for (const line of linesData) {
        // Venta
        transactions.push({
          entry_id: entry.id,
          account_code: line.account_code || '705000', // Cuenta de prestaciones de servicios
          movement_type: 'credit',
          amount: line.subtotal,
          description: line.description,
          line_number: lineNumber++,
        });

        // IVA Repercutido
        if (line.tax_amount > 0) {
          transactions.push({
            entry_id: entry.id,
            account_code: '477000', // IVA Repercutido
            movement_type: 'credit',
            amount: line.tax_amount,
            description: `IVA ${line.tax_rate}% - ${line.description}`,
            line_number: lineNumber++,
          });
        }
      }

      const { error: transactionsError } = await supabase
        .from('accounting_transactions')
        .insert(transactions);

      if (transactionsError) throw transactionsError;

      // Actualizar la factura con el ID del asiento
      const { error: updateError } = await supabase
        .from('invoices_issued')
        .update({ entry_id: entry.id })
        .eq('id', invoiceId);

      if (updateError) throw updateError;

      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices_issued'] });
      queryClient.invalidateQueries({ queryKey: ['accounting_entries'] });
      toast.success('Asiento contable generado correctamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al generar asiento: ${error.message}`);
    },
  });
};
