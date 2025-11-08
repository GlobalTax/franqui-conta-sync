import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SupplierSelector } from '@/components/invoices/SupplierSelector';
import { InvoiceLineItemsTable, type InvoiceLine } from '@/components/invoices/InvoiceLineItemsTable';
import { useCreateInvoiceReceived } from '@/hooks/useInvoicesReceived';
import { useOrganization } from '@/hooks/useOrganization';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function NewInvoiceReceived() {
  const navigate = useNavigate();
  const { currentMembership } = useOrganization();
  const createInvoice = useCreateInvoiceReceived();

  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<InvoiceLine[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierId || !invoiceNumber || lines.length === 0) {
      return;
    }

    const totals = lines.reduce((acc, line) => {
      const subtotal = line.quantity * line.unit_price;
      const discountAmount = (subtotal * line.discount_percentage) / 100;
      const subtotalAfterDiscount = subtotal - discountAmount;
      const taxAmount = (subtotalAfterDiscount * line.tax_rate) / 100;
      return {
        subtotal: acc.subtotal + subtotalAfterDiscount,
        tax: acc.tax + taxAmount,
        total: acc.total + subtotalAfterDiscount + taxAmount,
      };
    }, { subtotal: 0, tax: 0, total: 0 });

    await createInvoice.mutateAsync({
      supplier_id: supplierId,
      centro_code: currentMembership?.restaurant?.codigo || '',
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      due_date: dueDate || undefined,
      subtotal: totals.subtotal,
      tax_total: totals.tax,
      total: totals.total,
      status: 'pending',
      notes: notes || undefined,
      lines: lines.map(line => ({
        description: line.description,
        quantity: line.quantity,
        unit_price: line.unit_price,
        discount_percentage: line.discount_percentage,
        tax_rate: line.tax_rate,
        account_code: line.account_code,
      })),
    });

    navigate('/facturas');
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/facturas')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Nueva Factura Recibida</h1>
          <p className="text-muted-foreground mt-1">Registra una nueva factura de proveedor</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Datos de la Factura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Proveedor *</Label>
                <SupplierSelector value={supplierId} onValueChange={setSupplierId} />
              </div>
              <div className="space-y-2">
                <Label>Número de Factura *</Label>
                <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Fecha Factura *</Label>
                <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Fecha Vencimiento</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Líneas de Factura</CardTitle>
          </CardHeader>
          <CardContent>
            <InvoiceLineItemsTable lines={lines} onChange={setLines} />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/facturas')}>
            Cancelar
          </Button>
          <Button type="submit" disabled={createInvoice.isPending || !supplierId || !invoiceNumber || lines.length === 0}>
            Guardar Factura
          </Button>
        </div>
      </form>
    </div>
  );
}
