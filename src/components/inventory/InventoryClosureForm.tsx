// ============================================================================
// COMPONENT: InventoryClosureForm - Formulario de cierre de existencias
// ============================================================================

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useView } from "@/contexts/ViewContext";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const lineSchema = z.object({
  category: z.enum(["food", "paper", "beverages", "other"]),
  description: z.string().min(1, "Descripción requerida"),
  account_code: z.string().optional(),
  variation_account: z.string().optional(),
  initial_stock: z.number().min(0, "Debe ser >= 0"),
  final_stock: z.number().min(0, "Debe ser >= 0"),
});

const closureSchema = z.object({
  closure_month: z.number().min(1).max(12),
  closure_year: z.number().min(2000),
  entry_type: z.enum(["global", "detailed"]),
  total_amount: z.number().optional(),
  notes: z.string().optional(),
  lines: z.array(lineSchema).optional(),
}).refine((data) => {
  if (data.entry_type === "global") {
    return data.total_amount !== undefined && data.total_amount !== null;
  }
  return true;
}, {
  message: "El importe total es requerido para entrada global",
  path: ["total_amount"],
}).refine((data) => {
  if (data.entry_type === "detailed") {
    return data.lines && data.lines.length > 0;
  }
  return true;
}, {
  message: "Debe agregar al menos una subpartida",
  path: ["lines"],
});

type ClosureFormData = z.infer<typeof closureSchema>;

interface InventoryClosureFormProps {
  onSubmit: (data: ClosureFormData & { centro_code: string; created_by: string }) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function InventoryClosureForm({ onSubmit, onCancel, isSubmitting }: InventoryClosureFormProps) {
  const { selectedView } = useView();
  
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    control,
  } = useForm<ClosureFormData>({
    resolver: zodResolver(closureSchema),
    defaultValues: {
      closure_month: currentMonth,
      closure_year: currentYear,
      entry_type: "global",
      lines: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lines",
  });

  const entryType = watch("entry_type");

  const onFormSubmit = async (data: ClosureFormData) => {
    if (!selectedView) return;

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error("Usuario no autenticado");

    await onSubmit({
      ...data,
      centro_code: selectedView.code || selectedView.id,
      created_by: user.user.id,
    });
  };

  const categoryLabels = {
    food: "Food & Ingredients",
    paper: "Paper & Packaging",
    beverages: "Bebidas",
    other: "Otros",
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Periodo */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="closure_month">Mes</Label>
          <Select
            value={watch("closure_month")?.toString()}
            onValueChange={(val) => setValue("closure_month", parseInt(val))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                <SelectItem key={month} value={month.toString()}>
                  {new Date(2000, month - 1).toLocaleDateString('es-ES', { month: 'long' })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="closure_year">Año</Label>
          <Input
            id="closure_year"
            type="number"
            {...register("closure_year", { valueAsNumber: true })}
          />
          {errors.closure_year && (
            <p className="text-sm text-destructive">{errors.closure_year.message}</p>
          )}
        </div>
      </div>

      {/* Tipo de entrada */}
      <div className="space-y-3">
        <Label>Tipo de entrada</Label>
        <RadioGroup value={entryType} onValueChange={(val) => setValue("entry_type", val as "global" | "detailed")}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="global" id="global" />
            <Label htmlFor="global" className="font-normal cursor-pointer">
              Entrada global (importe acumulado)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="detailed" id="detailed" />
            <Label htmlFor="detailed" className="font-normal cursor-pointer">
              Entrada con subpartidas (detallado)
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Entrada Global */}
      {entryType === "global" && (
        <div className="space-y-2">
          <Label htmlFor="total_amount">Importe total de existencias finales</Label>
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
          <p className="text-xs text-muted-foreground">
            Importe total del inventario final del mes
          </p>
        </div>
      )}

      {/* Entrada Detallada */}
      {entryType === "detailed" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Subpartidas de existencias</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({
                category: "food",
                description: "",
                initial_stock: 0,
                final_stock: 0,
              })}
            >
              <Plus className="h-4 w-4 mr-2" />
              Añadir subpartida
            </Button>
          </div>

          {fields.length === 0 && (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">
                No hay subpartidas. Haz clic en "Añadir subpartida" para comenzar.
              </p>
            </div>
          )}

          {fields.map((field, index) => {
            const variation = (watch(`lines.${index}.final_stock`) || 0) - (watch(`lines.${index}.initial_stock`) || 0);
            
            return (
              <div key={field.id} className="border rounded-lg p-4 space-y-4 bg-muted/30">
                <div className="flex items-start justify-between">
                  <Badge variant="secondary">Línea {index + 1}</Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Categoría</Label>
                    <Select
                      value={watch(`lines.${index}.category`)}
                      onValueChange={(val) => setValue(`lines.${index}.category`, val as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(categoryLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Descripción</Label>
                    <Input
                      placeholder="Ej: Hamburguesas, Pan, Bebidas..."
                      {...register(`lines.${index}.description`)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cuenta de existencias (opcional)</Label>
                    <Input
                      placeholder="300XXXX"
                      {...register(`lines.${index}.account_code`)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cuenta de variación (opcional)</Label>
                    <Input
                      placeholder="610XXXX"
                      {...register(`lines.${index}.variation_account`)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Stock inicial (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...register(`lines.${index}.initial_stock`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Stock final (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...register(`lines.${index}.final_stock`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Variación</Label>
                    <Input
                      type="number"
                      value={variation.toFixed(2)}
                      disabled
                      className={variation >= 0 ? "text-green-600" : "text-red-600"}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {errors.lines && typeof errors.lines === 'object' && !Array.isArray(errors.lines) && (
            <p className="text-sm text-destructive">{errors.lines.message}</p>
          )}
        </div>
      )}

      {/* Notas */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notas (opcional)</Label>
        <Textarea
          id="notes"
          placeholder="Observaciones sobre el cierre de existencias..."
          {...register("notes")}
        />
      </div>

      {/* Botones */}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : "Crear cierre de existencias"}
        </Button>
      </div>
    </form>
  );
}
