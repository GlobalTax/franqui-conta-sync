import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Receipt, FileText, ExternalLink } from "lucide-react";
import { useInvoicesReceived } from "@/hooks/useInvoicesReceived";
import { useInvoicesIssued } from "@/hooks/useInvoicesIssued";
import { useInvoiceLines } from "@/hooks/useInvoicesReceived";
import { useGenerateEntryFromInvoiceReceived, useGenerateEntryFromInvoiceIssued } from "@/hooks/useInvoiceToEntry";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import { InvoicePDFUploader } from "@/components/invoices/InvoicePDFUploader";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

const InvoiceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoiceType, setInvoiceType] = useState<"received" | "issued">("received");

  const { data: receivedInvoices } = useInvoicesReceived();
  const { data: issuedInvoices } = useInvoicesIssued();
  const { data: lines } = useInvoiceLines(id!, invoiceType);
  const generateReceivedEntry = useGenerateEntryFromInvoiceReceived();
  const generateIssuedEntry = useGenerateEntryFromInvoiceIssued();

  // Try to find the invoice in either list
  const receivedInvoice = receivedInvoices?.find((inv) => inv.id === id);
  const issuedInvoice = issuedInvoices?.find((inv) => inv.id === id);
  
  const invoice = receivedInvoice || issuedInvoice;
  const type: "received" | "issued" = receivedInvoice ? "received" : "issued";

  if (!invoice) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">Factura no encontrada</h3>
          <Button className="mt-4" onClick={() => navigate(-1)}>
            Volver
          </Button>
        </div>
      </div>
    );
  }

  const handleGenerateEntry = async () => {
    try {
      if (type === "received") {
        await generateReceivedEntry.mutateAsync(id!);
      } else {
        await generateIssuedEntry.mutateAsync(id!);
      }
    } catch (error) {
      console.error("Error generating entry:", error);
    }
  };

  const documentPath = type === "received" 
    ? (invoice as any).document_path 
    : (invoice as any).pdf_path;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {type === "received" ? "Factura Recibida" : "Factura Emitida"}
              </h1>
              <InvoiceStatusBadge status={invoice.status} type={type} />
            </div>
            <p className="text-muted-foreground mt-2">
              {type === "received" 
                ? `Número: ${(invoice as any).invoice_number}` 
                : `Número: ${(invoice as any).full_invoice_number || `${(invoice as any).invoice_series}-${(invoice as any).invoice_number}`}`
              }
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Información General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {type === "received" ? (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Proveedor</p>
                    <p className="font-medium">
                      {(invoice as any).supplier?.name || "Sin proveedor"}
                    </p>
                  </div>
                  {(invoice as any).supplier?.tax_id && (
                    <div>
                      <p className="text-sm text-muted-foreground">CIF/NIF</p>
                      <p className="font-medium">{(invoice as any).supplier.tax_id}</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Cliente</p>
                    <p className="font-medium">{(invoice as any).customer_name}</p>
                  </div>
                  {(invoice as any).customer_tax_id && (
                    <div>
                      <p className="text-sm text-muted-foreground">CIF/NIF</p>
                      <p className="font-medium">{(invoice as any).customer_tax_id}</p>
                    </div>
                  )}
                </>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Fecha</p>
                <p className="font-medium">
                  {new Date((invoice as any).invoice_date).toLocaleDateString("es-ES")}
                </p>
              </div>
              {(invoice as any).due_date && (
                <div>
                  <p className="text-sm text-muted-foreground">Vencimiento</p>
                  <p className="font-medium">
                    {new Date((invoice as any).due_date).toLocaleDateString("es-ES")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Totales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <p className="text-muted-foreground">Subtotal</p>
                <p className="font-medium">
                  {Number((invoice as any).subtotal || 0).toLocaleString("es-ES", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  €
                </p>
              </div>
              <div className="flex justify-between">
                <p className="text-muted-foreground">IVA</p>
                <p className="font-medium">
                  {Number((invoice as any).tax_total || 0).toLocaleString("es-ES", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  €
                </p>
              </div>
              <div className="flex justify-between border-t pt-3">
                <p className="font-semibold">Total</p>
                <p className="text-xl font-bold text-primary">
                  {Number(invoice.total).toLocaleString("es-ES", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  €
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {lines && lines.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Líneas de Factura</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground">
                        Descripción
                      </th>
                      <th className="text-right py-2 px-2 text-sm font-medium text-muted-foreground">
                        Cant.
                      </th>
                      <th className="text-right py-2 px-2 text-sm font-medium text-muted-foreground">
                        Precio
                      </th>
                      <th className="text-right py-2 px-2 text-sm font-medium text-muted-foreground">
                        IVA %
                      </th>
                      <th className="text-right py-2 px-2 text-sm font-medium text-muted-foreground">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <tr key={line.id} className="border-b">
                        <td className="py-2 px-2">
                          <div>
                            <p className="font-medium">{line.description}</p>
                            {line.account_code && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                {line.account_code}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="text-right py-2 px-2">{line.quantity}</td>
                        <td className="text-right py-2 px-2">
                          {Number(line.unit_price).toLocaleString("es-ES", {
                            minimumFractionDigits: 2,
                          })}
                          €
                        </td>
                        <td className="text-right py-2 px-2">{line.tax_rate}%</td>
                        <td className="text-right py-2 px-2 font-medium">
                          {Number(line.total).toLocaleString("es-ES", {
                            minimumFractionDigits: 2,
                          })}
                          €
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {(invoice as any).notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {(invoice as any).notes}
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Documento PDF</CardTitle>
          </CardHeader>
          <CardContent>
            <InvoicePDFUploader
              invoiceId={id!}
              invoiceType={type}
              centroCode={(invoice as any).centro_code}
              currentPath={documentPath}
              onUploadComplete={() => {}}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Asiento Contable</CardTitle>
          </CardHeader>
          <CardContent>
            {(invoice as any).entry_id ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                    <Receipt className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="font-medium">Asiento generado</p>
                    <p className="text-sm text-muted-foreground">
                      Esta factura ya tiene un asiento contable asociado
                    </p>
                  </div>
                </div>
                <Link to={`/contabilidad/apuntes`}>
                  <Button variant="outline" className="gap-2">
                    Ver Asiento
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground mb-4">
                  Esta factura aún no tiene un asiento contable generado
                </p>
                <Button
                  onClick={handleGenerateEntry}
                  disabled={
                    generateReceivedEntry.isPending || generateIssuedEntry.isPending
                  }
                  className="gap-2"
                >
                  <Receipt className="h-4 w-4" />
                  {generateReceivedEntry.isPending || generateIssuedEntry.isPending
                    ? "Generando..."
                    : "Generar Asiento Contable"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InvoiceDetail;
