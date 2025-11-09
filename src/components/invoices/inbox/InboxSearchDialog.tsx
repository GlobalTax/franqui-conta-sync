import { useState, useEffect } from 'react';
import { Search, FileText, DollarSign } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { InboxStatusBadge } from './InboxStatusBadge';
import { format } from 'date-fns';

interface Invoice {
  id: string;
  supplier_name: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: number;
  status: string;
  centro_code?: string;
  accounting_entry_id?: string;
}

interface InboxSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoices: Invoice[];
  onSelect: (invoiceId: string) => void;
}

export function InboxSearchDialog({
  open,
  onOpenChange,
  invoices,
  onSelect,
}: InboxSearchDialogProps) {
  const [search, setSearch] = useState('');

  // Filtrar facturas por búsqueda
  const filteredInvoices = invoices.filter((inv) => {
    const searchLower = search.toLowerCase();
    return (
      inv.supplier_name?.toLowerCase().includes(searchLower) ||
      inv.invoice_number?.toLowerCase().includes(searchLower) ||
      inv.centro_code?.toLowerCase().includes(searchLower) ||
      inv.total_amount?.toString().includes(searchLower)
    );
  }).slice(0, 10); // Limitar a 10 resultados

  const handleSelect = (invoiceId: string) => {
    onSelect(invoiceId);
    onOpenChange(false);
    setSearch('');
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput 
        placeholder="Buscar por proveedor, número, centro o importe..." 
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No se encontraron facturas.</CommandEmpty>
        <CommandGroup heading="Facturas">
          {filteredInvoices.map((invoice) => (
            <CommandItem
              key={invoice.id}
              value={invoice.id}
              onSelect={() => handleSelect(invoice.id)}
              className="flex items-center justify-between py-3"
            >
              <div className="flex items-center gap-3 flex-1">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col gap-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{invoice.supplier_name}</span>
                    <InboxStatusBadge 
                      status={invoice.status} 
                      hasEntry={!!invoice.accounting_entry_id}
                    />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{invoice.invoice_number}</span>
                    <span>•</span>
                    <span>{format(new Date(invoice.invoice_date), 'dd/MM/yyyy')}</span>
                    {invoice.centro_code && (
                      <>
                        <span>•</span>
                        <span>{invoice.centro_code}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 font-semibold">
                  <DollarSign className="h-4 w-4" />
                  {invoice.total_amount?.toFixed(2)}€
                </div>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
