import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BankRemittance } from "@/types/advanced-accounting";
import { useBankAccounts } from "@/hooks/useBankAccounts";

const formSchema = z.object({
  remittance_number: z.string().min(1, "El número de remesa es obligatorio"),
  remittance_type: z.enum(["cobro", "pago"]),
  remittance_date: z.string().min(1, "La fecha es obligatoria"),
  bank_account_id: z.string().min(1, "La cuenta bancaria es obligatoria"),
  status: z.enum(["draft", "generated", "sent", "processed"]),
});

interface BankRemittanceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<BankRemittance>) => void;
  remittance?: BankRemittance;
  centroCode: string;
}

export function BankRemittanceForm({ 
  open, 
  onOpenChange, 
  onSubmit, 
  remittance,
  centroCode,
}: BankRemittanceFormProps) {
  const { accounts } = useBankAccounts(centroCode);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      remittance_number: remittance?.remittance_number || "",
      remittance_type: remittance?.remittance_type || "cobro",
      remittance_date: remittance?.remittance_date || new Date().toISOString().split('T')[0],
      bank_account_id: remittance?.bank_account_id || "",
      status: remittance?.status || "draft",
    },
  });

  const handleSubmit = (data: z.infer<typeof formSchema>) => {
    onSubmit({
      ...data,
      centro_code: centroCode,
      total_amount: remittance?.total_amount || 0,
      total_items: remittance?.total_items || 0,
    });
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {remittance ? "Editar Remesa" : "Nueva Remesa Bancaria"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="remittance_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Remesa</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="REM-2024-001" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="remittance_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cobro">Cobro (19)</SelectItem>
                        <SelectItem value="pago">Pago (34)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="remittance_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Remesa</FormLabel>
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
                    <FormLabel>Cuenta Bancaria</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una cuenta" />
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

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Borrador</SelectItem>
                        <SelectItem value="generated">Generada</SelectItem>
                        <SelectItem value="sent">Enviada</SelectItem>
                        <SelectItem value="processed">Procesada</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {remittance ? "Actualizar" : "Crear"} Remesa
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
