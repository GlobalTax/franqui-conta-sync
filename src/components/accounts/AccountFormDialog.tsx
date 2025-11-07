import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Account, AccountType } from "@/types/accounting";
import { toast } from "sonner";

const accountSchema = z.object({
  code: z.string().min(1, "El código es requerido"),
  name: z.string().min(1, "El nombre es requerido"),
  account_type: z.enum(["A", "P", "PN", "ING", "GAS"]),
  parent_account_id: z.string().optional(),
  is_detail: z.boolean().default(true),
  active: z.boolean().default(true),
});

type AccountFormValues = z.infer<typeof accountSchema>;

interface AccountFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account | null;
  accounts: Account[];
  organizationId: string;
  onSave: (data: Partial<Account>) => Promise<void>;
}

export function AccountFormDialog({
  open,
  onOpenChange,
  account,
  accounts,
  organizationId,
  onSave,
}: AccountFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      code: "",
      name: "",
      account_type: "A",
      parent_account_id: undefined,
      is_detail: true,
      active: true,
    },
  });

  useEffect(() => {
    if (account) {
      form.reset({
        code: account.code,
        name: account.name,
        account_type: account.account_type as AccountType,
        parent_account_id: account.parent_account_id || undefined,
        is_detail: account.is_detail,
        active: account.active,
      });
    } else {
      form.reset({
        code: "",
        name: "",
        account_type: "A",
        parent_account_id: undefined,
        is_detail: true,
        active: true,
      });
    }
  }, [account, form]);

  const onSubmit = async (data: AccountFormValues) => {
    setIsSubmitting(true);

    try {
      // Calcular nivel basado en padre
      let level = 0;
      if (data.parent_account_id) {
        const parent = accounts.find((a) => a.id === data.parent_account_id);
        if (parent) {
          level = (parent.level || 0) + 1;
        }
      }

      const accountData: Partial<Account> = {
        ...data,
        organization_id: organizationId,
        level,
        parent_account_id: data.parent_account_id || null,
      };

      if (account) {
        // Actualizar
        await onSave({ ...accountData, id: account.id });
        toast.success("Cuenta actualizada correctamente");
      } else {
        // Crear
        await onSave(accountData);
        toast.success("Cuenta creada correctamente");
      }

      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Error al guardar la cuenta");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtrar cuentas que no son de detalle (solo pueden ser padres)
  const parentAccountOptions = accounts.filter((a) => !a.is_detail);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {account ? "Editar Cuenta" : "Nueva Cuenta"}
          </DialogTitle>
          <DialogDescription>
            {account
              ? "Actualiza los datos de la cuenta contable"
              : "Crea una nueva cuenta en el plan de cuentas"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="100"
                        className="font-mono"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="account_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Cuenta</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="A">Activo</SelectItem>
                        <SelectItem value="P">Pasivo</SelectItem>
                        <SelectItem value="PN">Patrimonio</SelectItem>
                        <SelectItem value="ING">Ingreso</SelectItem>
                        <SelectItem value="GAS">Gasto</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre de la cuenta" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="parent_account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cuenta Padre (opcional)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sin cuenta padre" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Sin cuenta padre</SelectItem>
                      {parentAccountOptions.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.code} - {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Selecciona una cuenta padre para crear una subcuenta
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="is_detail"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Cuenta de Detalle</FormLabel>
                      <FormDescription>
                        Permite registrar movimientos contables
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Cuenta Activa</FormLabel>
                      <FormDescription>
                        Muestra la cuenta en listados
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
