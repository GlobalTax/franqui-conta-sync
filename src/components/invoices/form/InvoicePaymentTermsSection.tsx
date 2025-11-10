// ============================================================================
// INVOICE PAYMENT TERMS SECTION
// Sección de vencimientos de pago con validación de totales
// ============================================================================

import { Control, UseFormWatch, useFieldArray } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { validatePaymentTerms } from '@/lib/invoice-calculator';

interface InvoicePaymentTermsSectionProps {
  control: Control<any>;
  watch: UseFormWatch<any>;
}

export function InvoicePaymentTermsSection({ control, watch }: InvoicePaymentTermsSectionProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'payment_terms'
  });

  const total = watch('total') || 0;
  const paymentTerms = watch('payment_terms') || [];
  const paymentTermsTotal = paymentTerms.reduce((sum: number, term: any) => 
    sum + (parseFloat(term.amount) || 0), 0
  );

  const isBalanced = validatePaymentTerms(paymentTermsTotal, total);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="uppercase text-sm font-bold text-primary">
          Detalle de Vencimientos
        </CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ due_date: '', amount: 0 })}
        >
          <Plus className="h-4 w-4 mr-2" />
          Añadir vencimiento
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No hay vencimientos definidos. Haz clic en "Añadir vencimiento" para crear uno.
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha de Vencimiento</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => (
                  <TableRow key={field.id}>
                    <TableCell>
                      <Input
                        type="date"
                        {...control.register(`payment_terms.${index}.due_date`)}
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        {...control.register(`payment_terms.${index}.amount`, {
                          valueAsNumber: true
                        })}
                        className="w-full text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Validación de totales */}
            <div className="flex justify-between items-center border-t pt-4">
              <span className="text-sm font-medium">Total Vencimientos:</span>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold">
                  {paymentTermsTotal.toFixed(2)} €
                </span>
                {!isBalanced && (
                  <Badge variant="destructive">
                    Vencimientos no cuadran: {paymentTermsTotal.toFixed(2)}€ ≠ {total.toFixed(2)}€
                  </Badge>
                )}
                {isBalanced && fields.length > 0 && (
                  <Badge variant="default">✓ Cuadrado</Badge>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
