import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useView } from "@/contexts/ViewContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useBankRemittances, useRemittanceTerms } from "@/hooks/useBankRemittances";
import { BankRemittanceForm } from "@/components/accounting/BankRemittanceForm";
import { AddTermsToRemittanceDialog } from "@/components/accounting/AddTermsToRemittanceDialog";
import { 
  Plus, 
  FileText, 
  CheckCircle, 
  Clock,
  Download,
  Send,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BankRemittance } from "@/types/advanced-accounting";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function BankRemittances() {
  const { selectedView } = useView();
  const [formOpen, setFormOpen] = useState(false);
  const [addTermsDialogOpen, setAddTermsDialogOpen] = useState(false);
  const [viewTermsDialogOpen, setViewTermsDialogOpen] = useState(false);
  const [selectedRemittance, setSelectedRemittance] = useState<BankRemittance | undefined>();
  const [statusFilter, setStatusFilter] = useState<BankRemittance['status'] | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'cobro' | 'pago'>('all');

  const breadcrumbs = [
    { label: "Contabilidad", href: "/contabilidad/apuntes" },
    { label: "Remesas Bancarias" },
  ];

  if (!selectedView || selectedView.type !== 'centre') {
    return (
      <div className="container mx-auto py-6">
        <PageHeader title="Remesas Bancarias SEPA" breadcrumbs={breadcrumbs} />
        <Alert>
          <AlertDescription>
            Selecciona un centro para gestionar remesas bancarias.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const centroCode = selectedView.id;

  const { remittances, isLoading, createRemittance, updateRemittance, deleteRemittance } = useBankRemittances({
    centroCode,
    status: statusFilter === 'all' ? undefined : statusFilter,
    remittanceType: typeFilter === 'all' ? undefined : typeFilter,
  });

  const { data: remittanceTerms } = useRemittanceTerms(selectedRemittance?.id);

  const handleCreate = (data: Partial<BankRemittance>) => {
    createRemittance(data as any);
  };

  const handleEdit = (remittance: BankRemittance) => {
    setSelectedRemittance(remittance);
    setFormOpen(true);
  };

  const handleUpdate = (data: Partial<BankRemittance>) => {
    if (selectedRemittance) {
      updateRemittance({ id: selectedRemittance.id, ...data });
      setSelectedRemittance(undefined);
    }
  };

  const handleAddTerms = (remittance: BankRemittance) => {
    setSelectedRemittance(remittance);
    setAddTermsDialogOpen(true);
  };

  const handleViewTerms = (remittance: BankRemittance) => {
    setSelectedRemittance(remittance);
    setViewTermsDialogOpen(true);
  };

  const handleAddTermsToRemittance = async (termIds: string[]) => {
    if (!selectedRemittance) return;

    try {
      // Update payment terms with remittance_id
      const { error } = await supabase
        .from("payment_terms")
        .update({ 
          remittance_id: selectedRemittance.id,
          status: "remitted" as any,
        })
        .in("id", termIds);

      if (error) throw error;

      // Recalculate remittance totals
      const { data: terms } = await supabase
        .from("payment_terms")
        .select("amount, paid_amount")
        .eq("remittance_id", selectedRemittance.id);

      if (terms) {
        const total = terms.reduce((sum, t) => sum + (t.amount - t.paid_amount), 0);
        await supabase
          .from("bank_remittances")
          .update({ 
            total_amount: total,
            total_items: terms.length,
          })
          .eq("id", selectedRemittance.id);
      }

      toast.success(`${termIds.length} vencimiento(s) añadido(s) a la remesa`);
    } catch (error) {
      toast.error("Error al añadir vencimientos");
      console.error(error);
    }
  };

  const getStatusBadge = (status: BankRemittance['status']) => {
    const variants: Record<BankRemittance['status'], { variant: any; icon: any; label: string }> = {
      draft: { variant: 'outline', icon: Clock, label: 'Borrador' },
      generated: { variant: 'secondary', icon: FileText, label: 'Generada' },
      sent: { variant: 'default', icon: Send, label: 'Enviada' },
      processed: { variant: 'default', icon: CheckCircle, label: 'Procesada' },
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

  const draftRemittances = remittances.filter(r => r.status === 'draft');
  const sentRemittances = remittances.filter(r => r.status === 'sent');
  const totalAmount = remittances.reduce((sum, r) => sum + r.total_amount, 0);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Remesas Bancarias SEPA"
        subtitle="Gestión de cobros (19) y pagos (34) domiciliados • Generación de archivos XML"
        breadcrumbs={breadcrumbs}
        actions={
          <Button onClick={() => { setSelectedRemittance(undefined); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Remesa
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Remesas en Borrador</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftRemittances.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {draftRemittances.reduce((sum, r) => sum + r.total_items, 0)} vencimientos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Remesas Enviadas</CardTitle>
            <Send className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sentRemittances.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Pendientes de procesar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Importe Total</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAmount.toFixed(2)} €</div>
            <p className="text-xs text-muted-foreground mt-1">
              {remittances.reduce((sum, r) => sum + r.total_items, 0)} vencimientos totales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4">
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="generated">Generada</SelectItem>
                <SelectItem value="sent">Enviada</SelectItem>
                <SelectItem value="processed">Procesada</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Cobros y Pagos</SelectItem>
                <SelectItem value="cobro">Solo Cobros (19)</SelectItem>
                <SelectItem value="pago">Solo Pagos (34)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Remesas</CardTitle>
          <CardDescription>
            {remittances.length} remesa{remittances.length !== 1 ? 's' : ''} encontrada{remittances.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cuenta Bancaria</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Importe Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : remittances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No hay remesas para los filtros seleccionados
                  </TableCell>
                </TableRow>
              ) : (
                remittances.map((remittance) => (
                  <TableRow key={remittance.id}>
                    <TableCell className="font-medium">{remittance.remittance_number}</TableCell>
                    <TableCell>
                      {format(new Date(remittance.remittance_date), "dd MMM yyyy", { locale: es })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={remittance.remittance_type === 'cobro' ? 'default' : 'secondary'}>
                        {remittance.remittance_type === 'cobro' ? 'Cobro (19)' : 'Pago (34)'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {remittance.bank_accounts?.account_name}
                    </TableCell>
                    <TableCell className="text-right">{remittance.total_items}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {remittance.total_amount.toFixed(2)} €
                    </TableCell>
                    <TableCell>{getStatusBadge(remittance.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {remittance.status === 'draft' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddTerms(remittance)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Añadir
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewTerms(remittance)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {remittance.status === 'draft' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(remittance)}
                          >
                            Editar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <BankRemittanceForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={selectedRemittance ? handleUpdate : handleCreate}
        remittance={selectedRemittance}
        centroCode={centroCode}
      />

      {selectedRemittance && (
        <>
          <AddTermsToRemittanceDialog
            open={addTermsDialogOpen}
            onOpenChange={setAddTermsDialogOpen}
            centroCode={centroCode}
            remittanceType={selectedRemittance.remittance_type}
            onAddTerms={handleAddTermsToRemittance}
          />

          <Dialog open={viewTermsDialogOpen} onOpenChange={setViewTermsDialogOpen}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>
                  Vencimientos de Remesa {selectedRemittance.remittance_number}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {!remittanceTerms || remittanceTerms.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay vencimientos en esta remesa
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha Vencimiento</TableHead>
                        <TableHead>Concepto</TableHead>
                        <TableHead>Documento</TableHead>
                        <TableHead className="text-right">Importe</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {remittanceTerms.map((term) => (
                        <TableRow key={term.id}>
                          <TableCell>
                            {format(new Date(term.due_date), "dd MMM yyyy", { locale: es })}
                          </TableCell>
                          <TableCell>{term.concept}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{term.document_type}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {(term.amount - term.paid_amount).toFixed(2)} €
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
