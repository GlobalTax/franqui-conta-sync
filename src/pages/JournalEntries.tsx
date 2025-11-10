import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, CheckCircle2, FileSpreadsheet } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { JournalAdvancedImporter } from "@/components/accounting/JournalAdvancedImporter";

const JournalEntries = () => {
  const [advancedImportOpen, setAdvancedImportOpen] = useState(false);
  const entries = [
    {
      id: "1",
      date: "2024-01-17",
      number: "AS-2024-001",
      description: "Compra mercaderías FACT-2024-001",
      restaurant: "Madrid Centro",
      status: "posted",
      debit: 1234.56,
      credit: 1234.56,
    },
    {
      id: "2",
      date: "2024-01-16",
      number: "AS-2024-002",
      description: "Nóminas enero 2024",
      restaurant: "Barcelona Gracia",
      status: "posted",
      debit: 8765.43,
      credit: 8765.43,
    },
    {
      id: "3",
      date: "2024-01-15",
      number: "AS-2024-003",
      description: "Factura servicios electricidad",
      restaurant: "Valencia Puerto",
      status: "draft",
      debit: 567.89,
      credit: 567.89,
    },
  ];

  const journalLines = [
    { account: "600", accountName: "Compras mercaderías", debit: 1019.80, credit: 0 },
    { account: "472", accountName: "HP IVA Soportado", debit: 214.76, credit: 0 },
    { account: "400", accountName: "Proveedores", debit: 0, credit: 1234.56 },
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Asientos Contables
            </h1>
            <p className="text-muted-foreground mt-2">
              Registro de operaciones contables
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAdvancedImportOpen(true)}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Importación Avanzada
            </Button>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Asiento
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="p-6 bg-card rounded-2xl">
            <p className="text-sm text-muted-foreground mb-2">Asientos del Mes</p>
            <div className="text-3xl font-bold mb-1">156</div>
            <p className="text-xs text-muted-foreground">Enero 2024</p>
          </div>

          <div className="p-6 bg-card rounded-2xl">
            <p className="text-sm text-muted-foreground mb-2">Contabilizados</p>
            <div className="text-3xl font-bold text-success mb-1">142</div>
            <p className="text-xs text-muted-foreground">91% del total</p>
          </div>

          <div className="p-6 bg-card rounded-2xl">
            <p className="text-sm text-muted-foreground mb-2">Borradores</p>
            <div className="text-3xl font-bold text-warning mb-1">14</div>
            <p className="text-xs text-muted-foreground">Pendientes de contabilizar</p>
          </div>

          <div className="p-6 bg-card rounded-2xl">
            <p className="text-sm text-muted-foreground mb-2">Total Movimientos</p>
            <div className="text-3xl font-bold mb-1">234,567€</div>
            <p className="text-xs text-muted-foreground">Suma debe/haber</p>
          </div>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30">
            <h2 className="text-lg font-semibold">Asientos Recientes</h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Restaurante</TableHead>
                  <TableHead className="text-right">Debe</TableHead>
                  <TableHead className="text-right">Haber</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.date}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {entry.number}
                    </TableCell>
                    <TableCell>{entry.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{entry.restaurant}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {entry.debit.toFixed(2)}€
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {entry.credit.toFixed(2)}€
                    </TableCell>
                    <TableCell>
                      {entry.status === "posted" ? (
                        <Badge className="bg-success-light text-success hover:bg-success-light">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Contabilizado
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <FileText className="mr-1 h-3 w-3" />
                          Borrador
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        Ver Detalle
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="rounded-lg border-l-4 border-l-primary bg-muted/30 transition-all duration-200">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Detalle: AS-2024-001</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Editar
                </Button>
                <Button size="sm">Contabilizar</Button>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Fecha:</p>
                  <p className="font-medium">17/01/2024</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Restaurante:</p>
                  <p className="font-medium">Madrid Centro</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Origen:</p>
                  <p className="font-medium">FACT-2024-001</p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Cuenta</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="text-right">Debe</TableHead>
                    <TableHead className="text-right">Haber</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journalLines.map((line, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono font-medium">
                        {line.account}
                      </TableCell>
                      <TableCell>{line.accountName}</TableCell>
                      <TableCell className="text-right font-mono">
                        {line.debit > 0 ? `${line.debit.toFixed(2)}€` : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {line.credit > 0 ? `${line.credit.toFixed(2)}€` : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell colSpan={2}>TOTALES</TableCell>
                    <TableCell className="text-right font-mono">
                      1,234.56€
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      1,234.56€
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <div className="flex items-center justify-center p-4 bg-success-light rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-success mr-2" />
                <span className="text-sm font-medium text-success">
                  Asiento cuadrado: Debe = Haber
                </span>
              </div>
            </div>
          </div>
        </div>

        <JournalAdvancedImporter
          open={advancedImportOpen}
          onOpenChange={setAdvancedImportOpen}
          centroCode="MADRID-001"
          onSuccess={() => {
            // Aquí se podría refrescar la lista de asientos
            console.log('Import successful');
          }}
        />
      </div>
    </div>
  );
};

export default JournalEntries;