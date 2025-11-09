import { useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Eye, ChevronDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { InboxStatusBadge } from './InboxStatusBadge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';

interface Invoice {
  id: string;
  supplier_name: string;
  supplier_tax_id?: string;
  invoice_date: string;
  total_amount: number;
  base_amount?: number;
  tax_amount?: number;
  status: string;
  centro_code?: string;
  accounting_entry_id?: string;
  iva_percentage?: number;
}

interface InvoiceInboxTableProps {
  invoices: Invoice[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  onRowClick: (invoice: Invoice) => void;
  loading?: boolean;
}

export function InvoiceInboxTable({
  invoices,
  selectedIds,
  onSelect,
  onRowClick,
  loading = false,
}: InvoiceInboxTableProps) {
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelect(invoices.map((inv) => inv.id));
    } else {
      onSelect([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      onSelect([...selectedIds, id]);
    } else {
      onSelect(selectedIds.filter((selectedId) => selectedId !== id));
    }
  };

  const allSelected = invoices.length > 0 && selectedIds.length === invoices.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  if (loading) {
    return (
      <div className="space-y-3 p-6">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Checkbox
                    checked={allSelected || someSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Seleccionar todas"
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Seleccionar todas (Space)</p>
                </TooltipContent>
              </Tooltip>
            </TableHead>
            <TableHead>Proveedor</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead className="text-right">Importe</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Centro</TableHead>
            <TableHead>IVA</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow
              key={invoice.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => onRowClick(invoice)}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIds.includes(invoice.id)}
                  onCheckedChange={(checked) =>
                    handleSelectOne(invoice.id, checked as boolean)
                  }
                  aria-label={`Seleccionar factura de ${invoice.supplier_name}`}
                />
              </TableCell>
              <TableCell>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="font-medium">{invoice.supplier_name}</div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>CIF: {invoice.supplier_tax_id || 'N/A'}</p>
                  </TooltipContent>
                </Tooltip>
              </TableCell>
              <TableCell>
                {format(new Date(invoice.invoice_date), 'dd/MM/yyyy')}
              </TableCell>
              <TableCell className="text-right">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="font-semibold">
                      {invoice.total_amount?.toFixed(2)}€
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs space-y-1">
                      <p>Base: {invoice.base_amount?.toFixed(2)}€</p>
                      <p>IVA: {invoice.tax_amount?.toFixed(2)}€</p>
                      <p className="font-semibold">Total: {invoice.total_amount?.toFixed(2)}€</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TableCell>
              <TableCell>
                <InboxStatusBadge
                  status={invoice.status}
                  hasEntry={!!invoice.accounting_entry_id}
                />
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {invoice.centro_code || '-'}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-sm">
                  {invoice.iva_percentage ? `${invoice.iva_percentage}%` : '-'}
                </span>
              </TableCell>
              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-end gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onRowClick(invoice)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Ver detalles (Enter)</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
}
