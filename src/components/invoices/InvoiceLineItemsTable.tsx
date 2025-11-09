import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { InvoiceCalculator } from "@/domain/invoicing/services/InvoiceCalculator";

export interface InvoiceLine {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  tax_rate: number;
  account_code: string;
}

interface InvoiceLineItemsTableProps {
  lines: InvoiceLine[];
  onChange: (lines: InvoiceLine[]) => void;
  readonly?: boolean;
}

export function InvoiceLineItemsTable({ lines, onChange, readonly = false }: InvoiceLineItemsTableProps) {
  const [localLines, setLocalLines] = useState<InvoiceLine[]>(lines);

  useEffect(() => {
    setLocalLines(lines);
  }, [lines]);

  const addLine = () => {
    const newLine: InvoiceLine = {
      description: "",
      quantity: 1,
      unit_price: 0,
      discount_percentage: 0,
      tax_rate: 21,
      account_code: "600000",
    };
    const updated = [...localLines, newLine];
    setLocalLines(updated);
    onChange(updated);
  };

  const removeLine = (index: number) => {
    const updated = localLines.filter((_, i) => i !== index);
    setLocalLines(updated);
    onChange(updated);
  };

  const updateLine = (index: number, field: keyof InvoiceLine, value: any) => {
    const updated = localLines.map((line, i) => {
      if (i === index) {
        return { ...line, [field]: value };
      }
      return line;
    });
    setLocalLines(updated);
    onChange(updated);
  };

  const calculateLineTotal = (line: InvoiceLine) => {
    const normalized = InvoiceCalculator.normalizeLineForCalculation({
      quantity: line.quantity,
      unit_price: line.unit_price,
      discount_percentage: line.discount_percentage,
      tax_rate: line.tax_rate,
    });
    
    const calc = InvoiceCalculator.calculateLine(normalized);
    return calc.total;
  };

  const totals = (() => {
    const normalizedLines = localLines.map(line => 
      InvoiceCalculator.normalizeLineForCalculation({
        quantity: line.quantity,
        unit_price: line.unit_price,
        discount_percentage: line.discount_percentage,
        tax_rate: line.tax_rate,
      })
    );
    
    const invoiceTotals = InvoiceCalculator.calculateInvoiceTotals(normalizedLines);
    
    return {
      subtotal: invoiceTotals.subtotal,
      tax: invoiceTotals.totalTax,
      total: invoiceTotals.total,
    };
  })();

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Descripción</TableHead>
              <TableHead className="w-24">Cantidad</TableHead>
              <TableHead className="w-32">Precio Unit.</TableHead>
              <TableHead className="w-24">Dto. %</TableHead>
              <TableHead className="w-24">IVA %</TableHead>
              <TableHead className="w-32 text-right">Total</TableHead>
              {!readonly && <TableHead className="w-16"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {localLines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No hay líneas. Haz clic en "Añadir línea" para comenzar.
                </TableCell>
              </TableRow>
            ) : (
              localLines.map((line, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Input
                      value={line.description}
                      onChange={(e) => updateLine(index, "description", e.target.value)}
                      placeholder="Descripción del producto/servicio"
                      disabled={readonly}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={line.quantity}
                      onChange={(e) => updateLine(index, "quantity", parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      disabled={readonly}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={line.unit_price}
                      onChange={(e) => updateLine(index, "unit_price", parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      disabled={readonly}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={line.discount_percentage}
                      onChange={(e) => updateLine(index, "discount_percentage", parseFloat(e.target.value) || 0)}
                      min="0"
                      max="100"
                      step="0.01"
                      disabled={readonly}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={line.tax_rate.toString()}
                      onValueChange={(value) => updateLine(index, "tax_rate", parseFloat(value))}
                      disabled={readonly}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0%</SelectItem>
                        <SelectItem value="4">4%</SelectItem>
                        <SelectItem value="10">10%</SelectItem>
                        <SelectItem value="21">21%</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {calculateLineTotal(line).toFixed(2)} €
                  </TableCell>
                  {!readonly && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLine(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!readonly && (
        <Button onClick={addLine} variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Añadir línea
        </Button>
      )}

      <div className="flex justify-end">
        <div className="w-72 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal:</span>
            <span className="font-medium">{totals.subtotal.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">IVA:</span>
            <span className="font-medium">{totals.tax.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between text-base font-bold border-t pt-2">
            <span>Total:</span>
            <span>{totals.total.toFixed(2)} €</span>
          </div>
        </div>
      </div>
    </div>
  );
}
