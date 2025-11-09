import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  total: number;
}

interface InvoiceReviewLinesSectionProps {
  invoiceLines: InvoiceLine[];
}

export function InvoiceReviewLinesSection({ invoiceLines }: InvoiceReviewLinesSectionProps) {
  if (!invoiceLines || invoiceLines.length === 0) return null;

  return (
    <section>
      <h3 className="font-semibold text-lg mb-3">Líneas de Factura</h3>
      <Card className="border-border/40">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[60px]">#</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right w-[100px]">Cantidad</TableHead>
              <TableHead className="text-right w-[100px]">Precio</TableHead>
              <TableHead className="text-right w-[80px]">IVA</TableHead>
              <TableHead className="text-right w-[120px]">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoiceLines.map((line, index) => (
              <TableRow key={line.id}>
                <TableCell className="font-medium text-muted-foreground">
                  {index + 1}
                </TableCell>
                <TableCell>{line.description}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {line.quantity}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {line.unit_price.toLocaleString("es-ES", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {line.tax_rate}%
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {line.total.toLocaleString("es-ES", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </section>
  );
}
