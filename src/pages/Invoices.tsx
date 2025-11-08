import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Receipt } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useInvoicesReceived } from "@/hooks/useInvoicesReceived";
import { useInvoicesIssued } from "@/hooks/useInvoicesIssued";
import { useGenerateEntryFromInvoiceReceived } from "@/hooks/useInvoiceToEntry";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import { InvoicesTabs } from "@/components/invoices/InvoicesTabs";
import { FilterPanel } from "@/components/common/FilterPanel";
import { DataTablePro } from "@/components/common/DataTablePro";
import { TableSummary } from "@/components/common/TableSummary";
import { PaginationAdvanced } from "@/components/common/PaginationAdvanced";
import { TableActions } from "@/components/common/TableActions";
import { toast } from "sonner";

const Invoices = () => {
  const navigate = useNavigate();
  const { data: invoicesReceived = [], isLoading: isLoadingReceived } = useInvoicesReceived();
  const { data: invoicesIssued = [], isLoading: isLoadingIssued } = useInvoicesIssued();
  const generateEntry = useGenerateEntryFromInvoiceReceived();
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    supplier: '',
    status: '',
    limit: '100'
  });

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
      render: (value: string) => <InvoiceStatusBadge status={value} type="received" />
    },
    {
      key: 'actions',
      label: 'Acciones',
      render: (_: any, row: any) => (
        <div className="flex gap-2">
          {!row.entry_id && row.status === 'approved' && (
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
            Ver
          </Button>
        </div>
      )
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
    <div className="min-h-screen bg-background">
      <div className="border-b bg-background px-6 py-4">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Facturas
              </h1>
              <p className="text-muted-foreground mt-2">
                Gestión de facturas emitidas y recibidas
              </p>
            </div>
            <Button className="gap-2" onClick={() => navigate('/facturas/nueva')}>
              <Upload className="h-4 w-4" />
              Nueva Factura
            </Button>
          </div>
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

              <Card>
                <CardContent className="p-0">
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
                </CardContent>
              </Card>
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

              <Card>
                <CardContent className="p-0">
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
                          { label: 'Pagadas', value: invoicesReceived.filter(inv => inv.status === 'paid').length, color: 'success' },
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
                </CardContent>
              </Card>
            </div>
          )
        }}
      />
    </div>
  );
};

export default Invoices;
