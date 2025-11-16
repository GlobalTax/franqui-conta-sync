import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Receipt, Scan } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useInvoicesReceived } from "@/hooks/useInvoicesReceived";
import { useInvoicesIssued } from "@/hooks/useInvoicesIssued";
import { useGenerateEntryFromInvoiceReceived } from "@/hooks/useInvoiceToEntry";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import { ApprovalStatusBadge } from "@/components/invoices/ApprovalStatusBadge";
import { useSubmitForApproval } from "@/hooks/useInvoiceApprovals";
import { InvoiceApprovalDialog } from "@/components/invoices/InvoiceApprovalDialog";
import { VerifactuBadge } from "@/components/compliance/VerifactuBadge";
import { SendHorizontal, Eye, FileCheck, Shield } from "lucide-react";
import { useGenerateInvoiceHash } from "@/hooks/useVerifactu";
import { InvoicesTabs } from "@/components/invoices/InvoicesTabs";
import { FilterPanel } from "@/components/common/FilterPanel";
import { DataTablePro } from "@/components/common/DataTablePro";
import { TableSummary } from "@/components/common/TableSummary";
import { PaginationAdvanced } from "@/components/common/PaginationAdvanced";
import { TableActions } from "@/components/common/TableActions";
import { useListNavigationShortcuts, useBulkActionShortcuts } from "@/lib/shortcuts/ShortcutManager";
import { toast } from "sonner";

const Invoices = () => {
  const navigate = useNavigate();
  const { data: invoicesReceivedResult = { data: [], total: 0, page: 1, pageCount: 1 }, isLoading: isLoadingReceived } = useInvoicesReceived();
  const { data: invoicesIssued = [], isLoading: isLoadingIssued } = useInvoicesIssued();
  const invoicesReceived = invoicesReceivedResult.data;
  const generateEntry = useGenerateEntryFromInvoiceReceived();
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    supplier: '',
    status: '',
    limit: '100'
  });
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedInvoiceForApproval, setSelectedInvoiceForApproval] = useState<any>(null);
  const [approvalLevel, setApprovalLevel] = useState<'manager' | 'accounting'>('accounting');

  // 🎹 Navegación por teclado j/k
  useListNavigationShortcuts(
    invoicesReceived,
    selectedIndex,
    setSelectedIndex,
    (invoice) => navigate(`/invoices/${invoice.id}`)
  );

  // 🎹 Acciones bulk a+a
  useBulkActionShortcuts(
    selectedIds,
    selectedIds.length > 0 ? () => {
      toast.info('Aprobación bulk en desarrollo');
    } : undefined
  );

  const submitForApprovalMutation = useSubmitForApproval();
  const generateHashMutation = useGenerateInvoiceHash();

  const handleGenerateEntry = async (invoiceId: string) => {
    try {
      await generateEntry.mutateAsync(invoiceId);
    } catch (error) {
      console.error("Error generating entry:", error);
    }
  };

  const handleApplyFilters = () => {
    toast.success("Filtros aplicados");
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      supplier: '',
      status: '',
      limit: '100'
    });
    toast.success("Filtros limpiados");
  };

  const handleEmail = () => {
    toast.success(`Enviando ${selectedIds.length} emails...`);
  };

  const handleDelete = () => {
    toast.success(`Eliminando ${selectedIds.length} facturas...`);
  };

  const handleExport = () => {
    toast.success("Exportando datos...");
  };

  const itemsPerPage = parseInt(filters.limit);
  const totalReceived = invoicesReceived.length;
  const totalIssued = invoicesIssued.length;

  const columnsReceived = [
    { 
      key: 'invoice_date', 
      label: 'Fecha',
      render: (value: string) => new Date(value).toLocaleDateString('es-ES')
    },
    { 
      key: 'invoice_number', 
      label: 'Nº Factura',
      className: 'font-medium'
    },
    { 
      key: 'supplier', 
      label: 'Proveedor',
      render: (value: any) => value?.name || 'Sin proveedor'
    },
    { 
      key: 'total', 
      label: 'Total',
      className: 'text-right',
      render: (value: number) => `${Number(value).toLocaleString('es-ES', { minimumFractionDigits: 2 })}€`
    },
    { 
      key: 'status', 
      label: 'Estado',
      render: (value: string, row: any) => (
        <div className="space-y-1">
          <InvoiceStatusBadge status={value} type="received" />
          {row.approval_status && (
            <ApprovalStatusBadge status={row.approval_status} />
          )}
          <VerifactuBadge 
            hasHash={!!row.verifactu_hash}
            className="mt-1"
          />
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Acciones',
      render: (_: any, row: any) => {
        const canSubmit = row.approval_status === 'draft' || !row.approval_status;
        const canApprove = row.approval_status === 'pending_approval' || 
                          row.approval_status === 'approved_manager';
        const canGenerateEntry = row.approval_status === 'approved_accounting' && 
                                !row.accounting_entry_id;
        const needsHash = !row.verifactu_hash && row.approval_status === 'approved_accounting';

        return (
          <div className="flex gap-2">
            {canSubmit && (
              <Button 
                size="sm"
                variant="outline"
                onClick={() => submitForApprovalMutation.mutate(row.id)}
                disabled={submitForApprovalMutation.isPending}
              >
                <SendHorizontal className="w-4 h-4 mr-1" />
                Enviar
              </Button>
            )}
            {canApprove && (
              <Button
                size="sm"
                variant="default"
                onClick={() => {
                  setSelectedInvoiceForApproval(row);
                  setApprovalLevel(
                    row.approval_status === 'pending_approval' && row.requires_manager_approval
                      ? 'manager'
                      : 'accounting'
                  );
                  setApprovalDialogOpen(true);
                }}
              >
                <FileCheck className="w-4 h-4 mr-1" />
                Aprobar
              </Button>
            )}
            {needsHash && (
              <Button 
                size="sm"
                variant="outline"
                onClick={() => generateHashMutation.mutate({
                  invoice_id: row.id,
                  invoice_type: 'received',
                  invoice_number: row.invoice_number,
                  invoice_date: row.invoice_date,
                  total: row.total,
                })}
                disabled={generateHashMutation.isPending}
              >
                <Shield className="w-4 h-4 mr-1" />
                Hash
              </Button>
            )}
            {canGenerateEntry && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleGenerateEntry(row.id)}
                disabled={generateEntry.isPending}
              >
                {generateEntry.isPending ? 'Generando...' : 'Generar Asiento'}
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate(`/facturas/${row.id}`)}
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>
        );
      }
    }
  ];

  const columnsIssued = [
    { 
      key: 'invoice_date', 
      label: 'Fecha',
      render: (value: string) => new Date(value).toLocaleDateString('es-ES')
    },
    { 
      key: 'full_invoice_number', 
      label: 'Nº Factura',
      className: 'font-medium'
    },
    { 
      key: 'customer_name', 
      label: 'Cliente'
    },
    { 
      key: 'total', 
      label: 'Total',
      className: 'text-right',
      render: (value: number) => `${Number(value).toLocaleString('es-ES', { minimumFractionDigits: 2 })}€`
    },
    { 
      key: 'status', 
      label: 'Estado',
      render: (value: string) => <InvoiceStatusBadge status={value} type="issued" />
    },
    {
      key: 'actions',
      label: 'Acciones',
      render: (_: any, row: any) => (
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate(`/facturas/emitidas/${row.id}`)}
        >
          Ver
        </Button>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Facturas
            </h1>
            <p className="text-muted-foreground mt-2">
              Gestión de facturas emitidas y recibidas
            </p>
          </div>
          <div className="flex gap-2">
            <Button className="gap-2" onClick={() => navigate('/facturas/nueva')}>
              <Upload className="h-4 w-4" />
              Nueva Factura
            </Button>
            <Button 
              variant="outline" 
              className="gap-2" 
              onClick={() => navigate('/invoices/new-received')}
            >
              <Scan className="h-4 w-4" />
              Nueva con OCR
            </Button>
          </div>
        </div>

        <InvoicesTabs
        children={{
          emitidas: (
            <div className="space-y-4">
              <FilterPanel onApply={handleApplyFilters} onClear={handleClearFilters}>
                <div className="space-y-2">
                  <Label>Fecha desde:</Label>
                  <Input 
                    type="date" 
                    value={filters.dateFrom} 
                    onChange={(e) => setFilters({...filters, dateFrom: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fecha hasta:</Label>
                  <Input 
                    type="date" 
                    value={filters.dateTo} 
                    onChange={(e) => setFilters({...filters, dateTo: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cliente:</Label>
                  <Input 
                    placeholder="Buscar cliente..." 
                    value={filters.supplier} 
                    onChange={(e) => setFilters({...filters, supplier: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estado:</Label>
                  <Select value={filters.status} onValueChange={(val) => setFilters({...filters, status: val})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="draft">Borrador</SelectItem>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="paid">Cobrada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Límite regs:</Label>
                  <Select value={filters.limit} onValueChange={(val) => setFilters({...filters, limit: val})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="200">200</SelectItem>
                      <SelectItem value="500">500</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </FilterPanel>

              <div className="border rounded-lg bg-background">
                {isLoadingIssued ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                  </div>
                ) : (
                  <>
                    <DataTablePro
                      columns={columnsIssued}
                      data={invoicesIssued}
                      onRowSelect={setSelectedIds}
                      showLegend
                      legend={[
                        { color: 'bg-blue-500', label: 'Cobrada' },
                        { color: 'bg-red-500', label: 'Pendiente' },
                        { color: 'bg-gray-500', label: 'Registrada' },
                      ]}
                    />
                    
                    <TableSummary
                      items={[
                        { label: 'Total Facturas', value: invoicesIssued.reduce((sum, inv) => sum + Number(inv.total), 0) },
                        { label: 'Pendientes', value: invoicesIssued.filter(inv => inv.status === 'pending').length, color: 'primary' },
                        { label: 'Cobradas', value: invoicesIssued.filter(inv => inv.status === 'paid').length, color: 'success' },
                      ]}
                    />
                    
                    <PaginationAdvanced
                      currentPage={currentPage}
                      totalItems={totalIssued}
                      itemsPerPage={itemsPerPage}
                      onPageChange={setCurrentPage}
                    />
                    
                    <TableActions
                      selectedCount={selectedIds.length}
                      onEmail={handleEmail}
                      onDelete={handleDelete}
                      onNew={() => navigate('/facturas/emitidas/nueva')}
                      onExport={handleExport}
                    />
                  </>
                )}
              </div>
            </div>
          ),
          recibidas: (
            <div className="space-y-4">
              <FilterPanel onApply={handleApplyFilters} onClear={handleClearFilters}>
                <div className="space-y-2">
                  <Label>Fecha desde:</Label>
                  <Input 
                    type="date" 
                    value={filters.dateFrom} 
                    onChange={(e) => setFilters({...filters, dateFrom: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fecha hasta:</Label>
                  <Input 
                    type="date" 
                    value={filters.dateTo} 
                    onChange={(e) => setFilters({...filters, dateTo: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Proveedor:</Label>
                  <Input 
                    placeholder="Buscar proveedor..." 
                    value={filters.supplier} 
                    onChange={(e) => setFilters({...filters, supplier: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estado:</Label>
                  <Select value={filters.status} onValueChange={(val) => setFilters({...filters, status: val})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="approved">Aprobada</SelectItem>
                      <SelectItem value="paid">Pagada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Límite regs:</Label>
                  <Select value={filters.limit} onValueChange={(val) => setFilters({...filters, limit: val})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="200">200</SelectItem>
                      <SelectItem value="500">500</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </FilterPanel>

              <div className="border rounded-lg bg-background">
                {isLoadingReceived ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                  </div>
                ) : (
                  <>
                    <DataTablePro
                      columns={columnsReceived}
                      data={invoicesReceived}
                      onRowSelect={setSelectedIds}
                      showLegend
                      legend={[
                        { color: 'bg-green-500', label: 'Pagada' },
                        { color: 'bg-blue-500', label: 'Aprobada' },
                        { color: 'bg-red-500', label: 'Pendiente' },
                      ]}
                    />
                    
                    <TableSummary
                      items={[
                        { label: 'Total Facturas', value: invoicesReceived.reduce((sum, inv) => sum + Number(inv.total), 0) },
                        { label: 'Pendientes', value: invoicesReceived.filter(inv => inv.status === 'pending').length, color: 'primary' },
                        { label: 'Aprobadas', value: invoicesReceived.filter(inv => (inv as any).approval_status === 'approved_accounting').length, color: 'success' },
                      ]}
                    />
                    
                    <PaginationAdvanced
                      currentPage={currentPage}
                      totalItems={totalReceived}
                      itemsPerPage={itemsPerPage}
                      onPageChange={setCurrentPage}
                    />
                    
                    <TableActions
                      selectedCount={selectedIds.length}
                      onEmail={handleEmail}
                      onDelete={handleDelete}
                      onNew={() => navigate('/facturas/nueva')}
                      onExport={handleExport}
                    />
                  </>
                )}
              </div>
            </div>
          )
        }}
      />
      <InvoiceApprovalDialog
        open={approvalDialogOpen}
        onOpenChange={setApprovalDialogOpen}
        invoice={selectedInvoiceForApproval}
        approvalLevel={approvalLevel}
      />
      </div>
    </div>
  );
};

export default Invoices;
