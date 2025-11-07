import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Invoices = () => {
  const mockInvoices = [
    {
      id: "1",
      number: "FACT-2024-001",
      supplier: "Proveedor A",
      date: "2024-01-15",
      total: 1234.56,
      status: "approved",
    },
    {
      id: "2",
      number: "FACT-2024-002",
      supplier: "Proveedor B",
      date: "2024-01-16",
      total: 987.65,
      status: "review",
    },
    {
      id: "3",
      number: "FACT-2024-003",
      supplier: "Proveedor C",
      date: "2024-01-17",
      total: 543.21,
      status: "pending",
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-success-light text-success hover:bg-success-light">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Aprobada
          </Badge>
        );
      case "review":
        return (
          <Badge className="bg-warning-light text-warning hover:bg-warning-light">
            <AlertCircle className="mr-1 h-3 w-3" />
            En Revisión
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <FileText className="mr-1 h-3 w-3" />
            Pendiente
          </Badge>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Facturas
            </h1>
            <p className="text-muted-foreground mt-2">
              Gestión de facturas y OCR
            </p>
          </div>
          <Button className="gap-2">
            <Upload className="h-4 w-4" />
            Subir Factura
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Facturas Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {invoice.number}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {invoice.supplier} • {invoice.date}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium text-foreground">
                        {invoice.total.toFixed(2)}€
                      </p>
                      <p className="text-sm text-muted-foreground">Total</p>
                    </div>
                    {getStatusBadge(invoice.status)}
                    <Button variant="ghost" size="sm">
                      Ver Detalles
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Invoices;