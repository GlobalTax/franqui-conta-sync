// ============================================================================
// COMPONENT: ProvisionForm - Formulario de creación/edición de provisiones
// ============================================================================

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useView } from "@/contexts/ViewContext";
import type { ProvisionTemplate } from "@/hooks/useProvisionTemplates";

const formSchema = z.object({
  provision_date: z.string().min(1, "Fecha requerida"),
  supplier_name: z.string().min(1, "Proveedor requerido"),
  description: z.string().min(5, "Descripción debe tener al menos 5 caracteres"),
  expense_account: z.string().min(1, "Cuenta de gasto requerida"),
  provision_account: z.string().default("4009000000"),
  amount: z.string().min(1, "Importe requerido"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ProvisionFormProps {
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  template?: ProvisionTemplate;
}

export function ProvisionForm({
  onSubmit,
  onCancel,
  isSubmitting,
  template,
}: ProvisionFormProps) {
  const { selectedView } = useView();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      provision_date: new Date().toISOString().split("T")[0],
      supplier_name: template?.supplier_name || "",
      description: template?.description || "",
      expense_account: template?.expense_account || "",
      provision_account: template?.provision_account || "4009000000",
      amount: template?.default_amount?.toString() || "",
      notes: template?.notes || "",
    },
  });

  const handleSubmit = async (values: FormValues) => {
    if (!selectedView) return;

    const provisionDate = new Date(values.provision_date);
    const data = {
      centro_code: selectedView.code || selectedView.id,
      provision_date: values.provision_date,
      period_year: provisionDate.getFullYear(),
      period_month: provisionDate.getMonth() + 1,
      supplier_name: values.supplier_name,
      description: values.description,
      expense_account: values.expense_account,
      provision_account: values.provision_account,
      amount: parseFloat(values.amount),
      notes: values.notes || null,
      status: "draft" as const,
      template_id: template?.id || null,
    };

    await onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="provision_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de provisión</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Importe</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="supplier_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Proveedor</FormLabel>
              <FormControl>
                <Input placeholder="Nombre del proveedor" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Descripción del gasto provisionado"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="expense_account"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cuenta de gasto</FormLabel>
                <FormControl>
                  <Input placeholder="6000000" {...field} />
                </FormControl>
                <FormDescription>Grupo 6 - Compras y gastos</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="provision_account"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cuenta de provisión</FormLabel>
                <FormControl>
                  <Input placeholder="4009000000" {...field} />
                </FormControl>
                <FormDescription>
                  Por defecto: 4009 - Proveedores pendientes
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas (opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Notas adicionales" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creando..." : "Crear provisión"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
