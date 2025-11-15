// ============================================================================
// COMPONENT: AccrualForm - Formulario de periodificaciones
// ============================================================================

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useView } from "@/contexts/ViewContext";
import { supabase } from "@/integrations/supabase/client";

const accrualSchema = z.object({
  accrual_type: z.enum(["income", "expense"]),
  account_code: z.string().min(1, "Cuenta requerida"),
  counterpart_account: z.string().min(1, "Contrapartida requerida"),
  total_amount: z.number().positive("Debe ser mayor a 0"),
  start_date: z.string().min(1, "Fecha inicio requerida"),
  end_date: z.string().min(1, "Fecha fin requerida"),
  frequency: z.enum(["monthly", "quarterly", "annual"]),
  description: z.string().min(3, "Descripción requerida"),
});

type AccrualFormData = z.infer<typeof accrualSchema>;

interface AccrualFormProps {
  onSubmit: (data: AccrualFormData & { centro_code: string; created_by: string }) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function AccrualForm({ onSubmit, onCancel, isSubmitting }: AccrualFormProps) {
  const { selectedView } = useView();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<AccrualFormData>({
    resolver: zodResolver(accrualSchema),
    defaultValues: {
      accrual_type: "expense",
      frequency: "monthly",
    },
  });

  const accrualType = watch("accrual_type");

  const onFormSubmit = async (data: AccrualFormData) => {
    if (!selectedView) return;

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error("Usuario no autenticado");

    await onSubmit({
      ...data,
      centro_code: selectedView.id,
      created_by: user.user.id,
    });
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Tipo de periodificación */}
      <div className="space-y-2">
        <Label>Tipo de periodificación</Label>
        <Select
          value={accrualType}
          onValueChange={(value) => setValue("accrual_type", value as "income" | "expense")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="expense">Gasto a distribuir (480)</SelectItem>
            <SelectItem value="income">Ingreso a distribuir (485)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cuenta contable */}
      <div className="space-y-2">
        <Label htmlFor="account_code">
          Cuenta contable ({accrualType === "expense" ? "Gasto" : "Ingreso"})
        </Label>
        <Input
          id="account_code"
          placeholder={accrualType === "expense" ? "6XXXXXX" : "7XXXXXX"}
          {...register("account_code")}
        />
        {errors.account_code && (
          <p className="text-sm text-destructive">{errors.account_code.message}</p>
        )}
      </div>

      {/* Contrapartida */}
      <div className="space-y-2">
        <Label htmlFor="counterpart_account">
          Contrapartida ({accrualType === "expense" ? "480" : "485"})
        </Label>
        <Input
          id="counterpart_account"
          placeholder={accrualType === "expense" ? "4800000" : "4850000"}
          {...register("counterpart_account")}
        />
        {errors.counterpart_account && (
          <p className="text-sm text-destructive">{errors.counterpart_account.message}</p>
        )}
      </div>

      {/* Importe total */}
      <div className="space-y-2">
        <Label htmlFor="total_amount">Importe total</Label>
        <Input
          id="total_amount"
          type="number"
          step="0.01"
          placeholder="0.00"
          {...register("total_amount", { valueAsNumber: true })}
        />
        {errors.total_amount && (
          <p className="text-sm text-destructive">{errors.total_amount.message}</p>
        )}
      </div>

      {/* Fechas */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_date">Fecha inicio</Label>
          <Input id="start_date" type="date" {...register("start_date")} />
          {errors.start_date && (
            <p className="text-sm text-destructive">{errors.start_date.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_date">Fecha fin</Label>
          <Input id="end_date" type="date" {...register("end_date")} />
          {errors.end_date && (
            <p className="text-sm text-destructive">{errors.end_date.message}</p>
          )}
        </div>
      </div>

      {/* Frecuencia */}
      <div className="space-y-2">
        <Label>Frecuencia de periodificación</Label>
        <Select
          value={watch("frequency")}
          onValueChange={(value) => setValue("frequency", value as "monthly" | "quarterly" | "annual")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">Mensual</SelectItem>
            <SelectItem value="quarterly">Trimestral</SelectItem>
            <SelectItem value="annual">Anual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Descripción */}
      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          placeholder="Ej: Seguro anual a distribuir en 12 meses"
          {...register("description")}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      {/* Botones */}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : "Crear periodificación"}
        </Button>
      </div>
    </form>
  );
}
