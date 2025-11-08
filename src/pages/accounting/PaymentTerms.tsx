import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useView } from "@/contexts/ViewContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePaymentTerms, usePaymentTermsAnalysis } from "@/hooks/usePaymentTerms";
import { PaymentTermForm } from "@/components/accounting/PaymentTermForm";
import { MarkAsPaidDialog } from "@/components/accounting/MarkAsPaidDialog";
import { 
  Plus, 
  Calendar, 
  AlertCircle, 
  Clock, 
  CheckCircle, 
  Euro,
  FileText,
  Filter,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaymentTerm } from "@/types/advanced-accounting";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function PaymentTerms() {
  const { selectedView } = useView();
  const [formOpen, setFormOpen] = useState(false);
  const [paidDialogOpen, setPaidDialogOpen] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<PaymentTerm | undefined>();
  const [statusFilter, setStatusFilter] = useState<PaymentTerm['status'] | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'issued' | 'received'>('all');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0],
  });

  const breadcrumbs = [
    { label: "Contabilidad", href: "/contabilidad/apuntes" },
    { label: "Vencimientos" },
  ];

  if (!selectedView || selectedView.type !== 'centre') {
    return (
      <div className="container mx-auto py-6">
        <PageHeader title="Gestión de Vencimientos" breadcrumbs={breadcrumbs} />
        <Alert>
          <AlertDescription>
            Selecciona un centro para gestionar vencimientos.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const centroCode = selectedView.id;

  const { terms, isLoading, createTerm, updateTerm, markAsPaid, deleteTerm } = usePaymentTerms({
    centroCode,
    status: statusFilter === 'all' ? undefined : statusFilter,
    invoiceType: typeFilter === 'all' ? undefined : typeFilter,
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

  const { data: analysis } = usePaymentTermsAnalysis(
    centroCode,
    dateRange.start,
    dateRange.end
  );

  const handleCreate = (data: Partial<PaymentTerm>) => {
    createTerm(data as any);
  };

  const handleEdit = (term: PaymentTerm) => {
    setSelectedTerm(term);
    setFormOpen(true);
  };

  const handleUpdate = (data: Partial<PaymentTerm>) => {
    if (selectedTerm) {
      updateTerm({ id: selectedTerm.id, ...data });
      setSelectedTerm(undefined);
    }
  };

  const handleMarkPaid = (term: PaymentTerm) => {
    setSelectedTerm(term);
    setPaidDialogOpen(true);
  };

  const handlePaidSubmit = (data: { amount: number; date: string; bankAccountId?: string }) => {
    if (selectedTerm) {
      markAsPaid({ id: selectedTerm.id, ...data });
      setSelectedTerm(undefined);
    }
  };

  const getStatusBadge = (status: PaymentTerm['status']) => {
    const variants: Record<PaymentTerm['status'], { variant: any; icon: any; label: string }> = {
      pending: { variant: 'outline', icon: Clock, label: 'Pendiente' },
      paid: { variant: 'default', icon: CheckCircle, label: 'Pagado' },
      overdue: { variant: 'destructive', icon: AlertCircle, label: 'Vencido' },
      partial: { variant: 'secondary', icon: Clock, label: 'Parcial' },
      remitted: { variant: 'outline', icon: FileText, label: 'Remesado' },
    };
    const config = variants[status];
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getDocumentTypeName = (type: PaymentTerm['document_type']) => {
    const names: Record<PaymentTerm['document_type'], string> = {
      factura: 'Factura',
      pagare: 'Pagaré',
      letra: 'Letra',
      transferencia: 'Transferencia',
      efectivo: 'Efectivo',
      tarjeta: 'Tarjeta',
    };
    return names[type];
  };

  const overdue = analysis?.find(a => a.due_status === 'overdue');
  const dueToday = analysis?.find(a => a.due_status === 'due_today');
  const dueThisWeek = analysis?.find(a => a.due_status === 'due_this_week');

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Gestión de Vencimientos"
        subtitle="Control de cobros y pagos • Remesas bancarias • Efectos comerciales"
        breadcrumbs={breadcrumbs}
        actions={
          <Button onClick={() => { setSelectedTerm(undefined); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Vencimiento
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vencidos</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {overdue?.total_amount?.toFixed(2) || '0.00'} €
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {overdue?.count_items || 0} vencimientos • Promedio {overdue?.avg_days_overdue?.toFixed(0) || 0} días
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vencen Hoy</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dueToday?.total_amount?.toFixed(2) || '0.00'} €
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {dueToday?.count_items || 0} vencimientos hoy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Próximos 7 Días</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dueThisWeek?.total_amount?.toFixed(2) || '0.00'} €
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {dueThisWeek?.count_items || 0} vencimientos esta semana
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="overdue">Vencidos</SelectItem>
                <SelectItem value="partial">Parciales</SelectItem>
                <SelectItem value="paid">Pagados</SelectItem>
                <SelectItem value="remitted">Remesados</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Cobros y Pagos</SelectItem>
                <SelectItem value="issued">Solo Cobros</SelectItem>
                <SelectItem value="received">Solo Pagos</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            />

            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Vencimientos</CardTitle>
          <CardDescription>
            {terms.length} vencimiento{terms.length !== 1 ? 's' : ''} encontrado{terms.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha Vencimiento</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead>Tipo Documento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Importe</TableHead>
                <TableHead className="text-right">Pagado</TableHead>
                <TableHead className="text-right">Pendiente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : terms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No hay vencimientos para los filtros seleccionados
                  </TableCell>
                </TableRow>
              ) : (
                terms.map((term) => {
                  const pending = term.amount - term.paid_amount;
                  return (
                    <TableRow key={term.id}>
                      <TableCell>
                        {format(new Date(term.due_date), "dd MMM yyyy", { locale: es })}
                      </TableCell>
                      <TableCell className="font-medium">{term.concept}</TableCell>
                      <TableCell>{getDocumentTypeName(term.document_type)}</TableCell>
                      <TableCell>
                        {term.invoice_type === 'issued' ? (
                          <Badge variant="outline" className="gap-1">
                            <Euro className="h-3 w-3" />
                            Cobro
                          </Badge>
                        ) : term.invoice_type === 'received' ? (
                          <Badge variant="secondary" className="gap-1">
                            <Euro className="h-3 w-3" />
                            Pago
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {term.amount.toFixed(2)} €
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {term.paid_amount.toFixed(2)} €
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {pending.toFixed(2)} €
                      </TableCell>
                      <TableCell>{getStatusBadge(term.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {term.status !== 'paid' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkPaid(term)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Pagar
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(term)}
                          >
                            Editar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PaymentTermForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={selectedTerm ? handleUpdate : handleCreate}
        term={selectedTerm}
        centroCode={centroCode}
      />

      {selectedTerm && (
        <MarkAsPaidDialog
          open={paidDialogOpen}
          onOpenChange={setPaidDialogOpen}
          onSubmit={handlePaidSubmit}
          term={selectedTerm}
        />
      )}
    </div>
  );
}
