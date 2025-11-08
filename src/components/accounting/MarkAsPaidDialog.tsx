import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { PaymentTerm } from "@/types/advanced-accounting";

const formSchema = z.object({
  paid_amount: z.coerce.number().min(0.01, "El importe debe ser mayor que 0"),
  paid_date: z.string().min(1, "La fecha de pago es obligatoria"),
  bank_account_id: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface MarkAsPaidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { amount: number; date: string; bankAccountId?: string }) => void;
  term: PaymentTerm;
}

export function MarkAsPaidDialog({ open, onOpenChange, onSubmit, term }: MarkAsPaidDialogProps) {
  const { accounts } = useBankAccounts(term.centro_code);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      paid_amount: term.amount - term.paid_amount,
      paid_date: new Date().toISOString().split("T")[0],
      bank_account_id: term.bank_account_id || undefined,
    },
  });

  const handleSubmit = (values: FormValues) => {
    onSubmit({
      amount: values.paid_amount,
      date: values.paid_date,
      bankAccountId: values.bank_account_id,
    });
    form.reset();
    onOpenChange(false);
  };

  const pendingAmount = term.amount - term.paid_amount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Pago</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Concepto:</span>
                <span className="font-medium">{term.concept}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Importe total:</span>
                <span className="font-medium">{term.amount.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pendiente:</span>
                <span className="font-semibold text-destructive">{pendingAmount.toFixed(2)} €</span>
              </div>
            </div>

            <FormField
              control={form.control}
              name="paid_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Importe Pagado (€)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      max={pendingAmount}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paid_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de Pago</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bank_account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cuenta Bancaria (opcional)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cuenta" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.account_name} - {account.iban}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">Registrar Pago</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
