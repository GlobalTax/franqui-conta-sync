import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { useCreateInvoiceIssued } from "@/hooks/useInvoicesIssued";
import { InvoiceLineItemsTable } from "@/components/invoices/InvoiceLineItemsTable";
import type { InvoiceLine } from "@/components/invoices/InvoiceLineItemsTable";

const NewInvoiceIssued = () => {
  const navigate = useNavigate();
  const { currentMembership } = useOrganization();
  const createInvoice = useCreateInvoiceIssued();

  const [customerName, setCustomerName] = useState("");
  const [customerTaxId, setCustomerTaxId] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [invoiceSeries, setInvoiceSeries] = useState("A");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<InvoiceLine[]>([
    {
      description: "",
      quantity: 1,
      unit_price: 0,
      discount_percentage: 0,
      tax_rate: 21,
      account_code: "700",
    },
  ]);

  // Calculate totals from lines
  const calculateLineTotals = (line: InvoiceLine) => {
    const subtotal = line.quantity * line.unit_price;
    const discount = (subtotal * (line.discount_percentage || 0)) / 100;
    const afterDiscount = subtotal - discount;
    const taxAmount = (afterDiscount * line.tax_rate) / 100;
    const total = afterDiscount + taxAmount;
    return { subtotal: afterDiscount, taxAmount, total };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentMembership?.restaurant?.codigo) {
      alert("No hay un centro seleccionado");
      return;
    }

    if (!customerName || !invoiceDate) {
      alert("Faltan campos obligatorios");
      return;
    }

    const subtotal = lines.reduce((sum, line) => {
      const { subtotal } = calculateLineTotals(line);
      return sum + subtotal;
    }, 0);
    const taxTotal = lines.reduce((sum, line) => {
      const { taxAmount } = calculateLineTotals(line);
      return sum + taxAmount;
    }, 0);
    const total = lines.reduce((sum, line) => {
      const { total } = calculateLineTotals(line);
      return sum + total;
    }, 0);

    try {
      await createInvoice.mutateAsync({
        centro_code: currentMembership.restaurant.codigo,
        customer_name: customerName,
        customer_tax_id: customerTaxId || undefined,
        customer_email: customerEmail || undefined,
        customer_address: customerAddress || undefined,
        invoice_series: invoiceSeries,
        invoice_date: invoiceDate,
        due_date: dueDate || undefined,
        subtotal,
        tax_total: taxTotal,
        total,
        notes: notes || undefined,
        lines: lines.map(line => ({
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unit_price,
          discount_percentage: line.discount_percentage || 0,
          tax_rate: line.tax_rate,
          account_code: line.account_code,
        })),
      });

      navigate("/facturas/emitidas");
    } catch (error) {
      console.error("Error creating invoice:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/facturas/emitidas")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Nueva Factura Emitida
            </h1>
            <p className="text-muted-foreground mt-2">
              Crear una nueva factura de venta
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Datos del Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer_name">Nombre del Cliente *</Label>
                    <Input
                      id="customer_name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer_tax_id">CIF/NIF</Label>
                    <Input
                      id="customer_tax_id"
                      value={customerTaxId}
                      onChange={(e) => setCustomerTaxId(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer_email">Email</Label>
                    <Input
                      id="customer_email"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer_address">Dirección</Label>
                    <Input
                      id="customer_address"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Datos de la Factura</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoice_series">Serie</Label>
                    <Input
                      id="invoice_series"
                      value={invoiceSeries}
                      onChange={(e) => setInvoiceSeries(e.target.value)}
                      maxLength={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invoice_date">Fecha de Emisión *</Label>
                    <Input
                      id="invoice_date"
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="due_date">Fecha de Vencimiento</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notas</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Líneas de Factura</CardTitle>
              </CardHeader>
              <CardContent>
                <InvoiceLineItemsTable
                  lines={lines}
                  onChange={setLines}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/facturas/emitidas")}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createInvoice.isPending}>
                {createInvoice.isPending ? "Guardando..." : "Guardar Factura"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewInvoiceIssued;
