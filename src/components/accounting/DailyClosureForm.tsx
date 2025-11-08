import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DailyClosure } from '@/hooks/useDailyClosures';
import { Separator } from '@/components/ui/separator';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const formSchema = z.object({
  closure_date: z.string().min(1, 'Fecha requerida'),
  sales_in_store: z.coerce.number().min(0),
  sales_drive_thru: z.coerce.number().min(0),
  sales_delivery: z.coerce.number().min(0),
  sales_kiosk: z.coerce.number().min(0),
  tax_10_base: z.coerce.number().min(0),
  tax_21_base: z.coerce.number().min(0),
  cash_amount: z.coerce.number().min(0),
  card_amount: z.coerce.number().min(0),
  delivery_amount: z.coerce.number().min(0),
  delivery_commission: z.coerce.number().min(0),
  royalty_amount: z.coerce.number().min(0),
  marketing_fee: z.coerce.number().min(0),
  expected_cash: z.coerce.number().min(0),
  actual_cash: z.coerce.number().min(0),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface DailyClosureFormProps {
  centroCode: string;
  closure?: DailyClosure;
  onSubmit: (data: FormData) => void;
  onCancel?: () => void;
}

export function DailyClosureForm({ centroCode, closure, onSubmit, onCancel }: DailyClosureFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: closure ? {
      closure_date: closure.closure_date,
      sales_in_store: closure.sales_in_store,
      sales_drive_thru: closure.sales_drive_thru,
      sales_delivery: closure.sales_delivery,
      sales_kiosk: closure.sales_kiosk,
      tax_10_base: closure.tax_10_base,
      tax_21_base: closure.tax_21_base,
      cash_amount: closure.cash_amount,
      card_amount: closure.card_amount,
      delivery_amount: closure.delivery_amount,
      delivery_commission: closure.delivery_commission,
      royalty_amount: closure.royalty_amount,
      marketing_fee: closure.marketing_fee,
      expected_cash: closure.expected_cash,
      actual_cash: closure.actual_cash,
      notes: closure.notes || '',
    } : {
      closure_date: new Date().toISOString().split('T')[0],
      sales_in_store: 0,
      sales_drive_thru: 0,
      sales_delivery: 0,
      sales_kiosk: 0,
      tax_10_base: 0,
      tax_21_base: 0,
      cash_amount: 0,
      card_amount: 0,
      delivery_amount: 0,
      delivery_commission: 0,
      royalty_amount: 0,
      marketing_fee: 0,
      expected_cash: 0,
      actual_cash: 0,
      notes: '',
    },
  });

  const watchedValues = form.watch();
  const [calculations, setCalculations] = useState({
    totalSales: 0,
    tax10Amount: 0,
    tax21Amount: 0,
    totalTax: 0,
    cashDifference: 0,
  });

  useEffect(() => {
    const totalSales = 
      watchedValues.sales_in_store + 
      watchedValues.sales_drive_thru + 
      watchedValues.sales_delivery + 
      watchedValues.sales_kiosk;
    
    const tax10Amount = watchedValues.tax_10_base * 0.10;
    const tax21Amount = watchedValues.tax_21_base * 0.21;
    const totalTax = tax10Amount + tax21Amount;
    const cashDifference = watchedValues.actual_cash - watchedValues.expected_cash;

    setCalculations({
      totalSales,
      tax10Amount,
      tax21Amount,
      totalTax,
      cashDifference,
    });
  }, [watchedValues]);

  const handleSubmit = (data: FormData) => {
    onSubmit({
      ...data,
      tax_10_amount: calculations.tax10Amount,
      tax_21_amount: calculations.tax21Amount,
      total_tax: calculations.totalTax,
    } as any);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Datos del Cierre</CardTitle>
            <CardDescription>Centro: {centroCode}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="closure_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ventas por Canal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sales_in_store"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mostrador</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sales_drive_thru"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Drive-Thru</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sales_delivery"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sales_kiosk"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kiosko</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Separator />
            <div className="text-lg font-semibold">
              Total Ventas: {calculations.totalSales.toFixed(2)} €
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>IVA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tax_10_base"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base 10%</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-end">
                <div className="text-sm text-muted-foreground">
                  IVA 10%: {calculations.tax10Amount.toFixed(2)} €
                </div>
              </div>
              <FormField
                control={form.control}
                name="tax_21_base"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base 21%</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-end">
                <div className="text-sm text-muted-foreground">
                  IVA 21%: {calculations.tax21Amount.toFixed(2)} €
                </div>
              </div>
            </div>
            <Separator />
            <div className="text-lg font-semibold">
              Total IVA: {calculations.totalTax.toFixed(2)} €
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Formas de Cobro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cash_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Efectivo</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="card_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tarjeta/TPV</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="delivery_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="delivery_commission"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comisión Delivery</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Arqueo de Caja</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="expected_cash"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Efectivo Esperado</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="actual_cash"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Efectivo Real</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {calculations.cashDifference !== 0 && (
              <Alert variant={Math.abs(calculations.cashDifference) > watchedValues.expected_cash * 0.02 ? "destructive" : "default"}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Diferencia: {calculations.cashDifference.toFixed(2)} €
                  {Math.abs(calculations.cashDifference) > watchedValues.expected_cash * 0.02 && 
                    ' (Supera el 2%)'}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comisiones y Royalties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="royalty_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Royalty McDonald's</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="marketing_fee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marketing Fee</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea {...field} rows={3} placeholder="Observaciones..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex gap-2 justify-end">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          <Button type="submit">
            {closure ? 'Actualizar' : 'Crear'} Cierre
          </Button>
        </div>
      </form>
    </Form>
  );
}
