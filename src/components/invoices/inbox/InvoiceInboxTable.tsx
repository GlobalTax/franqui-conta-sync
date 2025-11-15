import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { format } from 'date-fns';
import { Eye, FileText, MoreVertical, RefreshCw, Trash2, Edit, FileCheck, MapPin, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { OCREngineBadge } from './OCREngineBadge';
import { DocumentTypeBadge } from './DocumentTypeBadge';
import { InvoiceTypeBadge } from './InvoiceTypeBadge';
import { getInvoiceState, canPerformAction } from '@/lib/invoice-states';

interface Invoice {
  id: string;
  supplier_name: string;
  supplier_tax_id?: string;
  invoice_date: string;
  invoice_number: string;
  total_amount: number;
  base_amount?: number;
  tax_amount?: number;
  status: string;
  centro_code?: string;
  accounting_entry_id?: string;
  iva_percentage?: number;
  document_type?: 'invoice' | 'receipt' | 'delivery_note' | 'credit_note';
  document_path?: string;
  ocr_engine?: 'openai' | 'mindee' | 'merged' | 'manual_review' | null;
  ocr_confidence?: number;
  processing_time_ms?: number;
  
  // 🔴 Sprint 3: Nuevos campos críticos
  invoice_type: 'received' | 'issued';
  file_name: string;
  created_at: string;
  posted: boolean;
  file_size_kb?: number;
  page_count?: number;
}

interface InvoiceInboxTableProps {
  invoices: Invoice[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onRowClick: (invoice: Invoice) => void;
  loading?: boolean;
  compact?: boolean;
  onRetryOCR?: (invoiceId: string) => void;
  onEdit?: (invoiceId: string) => void;
  onDelete?: (invoiceId: string) => void;
  onPost?: (invoiceId: string) => void;
  onAssignCentre?: (invoiceIds: string[]) => void;
  onDownloadPDF?: (documentPath: string) => void;
}

export function InvoiceInboxTable({
  invoices,
  selectedIds,
  onSelectionChange,
  onRowClick,
  loading = false,
  compact = false,
  onRetryOCR,
  onEdit,
  onDelete,
  onPost,
  onAssignCentre,
  onDownloadPDF,
}: InvoiceInboxTableProps) {
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(invoices.map((inv) => inv.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter((selectedId) => selectedId !== id));
    }
  };

  const allSelected = invoices.length > 0 && selectedIds.length === invoices.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  const parentRef = useRef<HTMLDivElement>(null);
  
  const rowVirtualizer = useVirtualizer({
    count: invoices.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 10,
  });

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
      <div ref={parentRef} className="h-[calc(100vh-300px)] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
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
            <TableHead className="w-[100px]">Motor OCR</TableHead>
            <TableHead className="w-[110px]">Tipo</TableHead>
            <TableHead className="min-w-[200px]">Archivo</TableHead>
            <TableHead className="w-[100px]">Fecha Alta</TableHead>
            <TableHead className="w-[100px]">Periodo</TableHead>
            <TableHead className="w-48">Proveedor</TableHead>
            <TableHead className="text-right w-32">Importe</TableHead>
            <TableHead className="w-[120px]">Revisado</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Centro</TableHead>
            <TableHead className="text-right w-16">⚙️</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const invoice = invoices[virtualRow.index];
              
              return (
                <TableRow
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className={cn(
                    "cursor-pointer hover:bg-muted/50 transition-colors",
                    compact && "h-10"
                  )}
                  onClick={() => onRowClick(invoice)}
                >
              <TableCell onClick={(e) => e.stopPropagation()} className={cn(compact && "py-1")}>
                <Checkbox
                  checked={selectedIds.includes(invoice.id)}
                  onCheckedChange={(checked) =>
                    handleSelectOne(invoice.id, checked as boolean)
                  }
                  aria-label={`Seleccionar factura de ${invoice.supplier_name}`}
                />
              </TableCell>
              
              {/* Motor OCR */}
              <TableCell className={cn(compact && "py-1")}>
                <OCREngineBadge
                  engine={invoice.ocr_engine}
                  confidence={invoice.ocr_confidence}
                  processingTime={invoice.processing_time_ms}
                />
              </TableCell>
              
              {/* 🔴 NUEVO: Tipo (Recibida/Emitida) */}
              <TableCell className={cn(compact && "py-1")}>
                <InvoiceTypeBadge type={invoice.invoice_type} compact={compact} />
              </TableCell>
              
              {/* 🔴 NUEVO: Nombre archivo */}
              <TableCell className={cn(compact && "py-1 text-xs")}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 max-w-[200px]">
                      <FileText className={cn("h-4 w-4 text-muted-foreground flex-shrink-0", compact && "h-3 w-3")} />
                      <span className="truncate font-medium">
                        {invoice.file_name}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[300px]">
                    <p className="text-xs break-all">{invoice.file_name}</p>
                  </TooltipContent>
                </Tooltip>
              </TableCell>
              
              {/* 🔴 NUEVO: Fecha Alta */}
              <TableCell className={cn(compact && "py-1 text-xs")}>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(invoice.created_at), 'dd/MM/yyyy')}
                </span>
              </TableCell>
              
              {/* Periodo (Fecha factura) */}
              <TableCell className={cn(compact && "py-1 text-xs")}>
                <span className="text-sm">
                  {format(new Date(invoice.invoice_date), 'dd/MM/yyyy')}
                </span>
              </TableCell>
              
              {/* Proveedor */}
              <TableCell className={cn(compact && "py-1 text-xs")}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="font-medium truncate max-w-[180px]">
                      {invoice.supplier_name}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs space-y-1">
                      <p className="font-medium">{invoice.supplier_name}</p>
                      <p>CIF: {invoice.supplier_tax_id || 'N/A'}</p>
                      <p>Nº: {invoice.invoice_number}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TableCell>
              
              {/* Importe */}
              <TableCell className={cn("text-right", compact && "py-1 text-xs")}>
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
              
              {/* 🔴 NUEVO: Revisado (peso KB + nº páginas) */}
              <TableCell className={cn(compact && "py-1 text-xs")}>
                <div className="flex flex-col gap-0.5 text-muted-foreground">
                  {invoice.file_size_kb && (
                    <span className="text-xs">
                      {invoice.file_size_kb < 1024 
                        ? `${invoice.file_size_kb.toFixed(0)} KB`
                        : `${(invoice.file_size_kb / 1024).toFixed(1)} MB`
                      }
                    </span>
                  )}
                  {invoice.page_count && (
                    <span className="text-xs">
                      {invoice.page_count} pág{invoice.page_count > 1 ? 's' : ''}
                    </span>
                  )}
                  {!invoice.file_size_kb && !invoice.page_count && (
                    <span className="text-xs">-</span>
                  )}
                </div>
              </TableCell>
              
              {/* Estado */}
              <TableCell className={cn(compact && "py-1")}>
                <InboxStatusBadge
                  status={invoice.status}
                  hasEntry={!!invoice.accounting_entry_id}
                  ocrEngine={invoice.ocr_engine}
                  ocrConfidence={invoice.ocr_confidence}
                  approvalStatus={invoice.status}
                />
              </TableCell>
              
              {/* Centro */}
              <TableCell className={cn(compact && "py-1 text-xs")}>
                <span className="text-sm text-muted-foreground">
                  {invoice.centro_code || '-'}
                </span>
              </TableCell>
              
              {/* Acciones */}
              <TableCell className={cn("text-right", compact && "py-1")} onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                    >
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Acciones</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => onRowClick(invoice)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Ver detalles
                    </DropdownMenuItem>
                    
                    {canPerformAction(getInvoiceState(invoice), 'retryOCR') && onRetryOCR && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => onRetryOCR(invoice.id)}
                          className="text-blue-600 dark:text-blue-400"
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Reintentar OCR
                        </DropdownMenuItem>
                      </>
                    )}

                    {onAssignCentre && (
                      <DropdownMenuItem onClick={() => onAssignCentre([invoice.id])}>
                        <MapPin className="mr-2 h-4 w-4" />
                        Asignar Centro
                      </DropdownMenuItem>
                    )}

                    {canPerformAction(getInvoiceState(invoice), 'post') && onPost && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => onPost(invoice.id)}
                          className="text-primary font-medium"
                        >
                          <FileCheck className="mr-2 h-4 w-4" />
                          Contabilizar
                        </DropdownMenuItem>
                      </>
                    )}

                    {onDownloadPDF && invoice.document_path && (
                      <DropdownMenuItem onClick={() => onDownloadPDF(invoice.document_path)}>
                        <Download className="mr-2 h-4 w-4" />
                        Descargar PDF
                      </DropdownMenuItem>
                    )}
                    
                    {canPerformAction(getInvoiceState(invoice), 'edit') && onEdit && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onEdit(invoice.id)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    {onDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => onDelete(invoice.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
          </div>
        </TableBody>
      </Table>
      </div>
    </TooltipProvider>
  );
}
