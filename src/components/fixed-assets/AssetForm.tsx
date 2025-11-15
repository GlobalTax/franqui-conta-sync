import { useForm } from "react-hook-form";
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
import { FixedAsset } from "@/hooks/useFixedAssets";

interface AssetFormProps {
  asset?: FixedAsset;
  onSubmit: (data: AssetFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export interface AssetFormData {
  description: string;
  account_code: string;
  acquisition_date: string;
  acquisition_value: number;
  residual_value: number;
  useful_life_years: number;
  depreciation_method: string;
  location?: string;
  supplier_id?: string;
  invoice_ref?: string;
  notes?: string;
}

export function AssetForm({ asset, onSubmit, onCancel, isLoading }: AssetFormProps) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<AssetFormData>({
    defaultValues: asset ? {
      description: asset.description,
      account_code: asset.account_code,
      acquisition_date: asset.acquisition_date,
      acquisition_value: asset.acquisition_value,
      residual_value: asset.residual_value || 0,
      useful_life_years: asset.useful_life_years,
      depreciation_method: asset.depreciation_method,
      location: asset.location || undefined,
      supplier_id: asset.supplier_id || undefined,
      invoice_ref: asset.invoice_ref || undefined,
      notes: asset.notes || undefined,
    } : {
      depreciation_method: 'linear',
      residual_value: 0,
      useful_life_years: 10,
      account_code: '2160000',
    },
  });

  const depreciationMethod = watch('depreciation_method');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Información básica */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">Información básica</h3>
        
        <div>
          <Label htmlFor="description">Descripción *</Label>
          <Input
            id="description"
            {...register("description", { required: "Descripción requerida" })}
            placeholder="Ej: Maquinaria industrial"
          />
          {errors.description && (
            <p className="text-sm text-destructive mt-1">{errors.description.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="account_code">Cuenta contable *</Label>
          <Select
            value={watch('account_code')}
            onValueChange={(value) => setValue('account_code', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona cuenta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2160000">216 - Mobiliario</SelectItem>
              <SelectItem value="2170000">217 - Equipos proceso información</SelectItem>
              <SelectItem value="2180000">218 - Elementos de transporte</SelectItem>
              <SelectItem value="2130000">213 - Maquinaria</SelectItem>
              <SelectItem value="2190000">219 - Otro inmovilizado material</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="acquisition_date">Fecha de adquisición *</Label>
            <Input
              id="acquisition_date"
              type="date"
              {...register("acquisition_date", { required: "Fecha requerida" })}
            />
            {errors.acquisition_date && (
              <p className="text-sm text-destructive mt-1">{errors.acquisition_date.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="acquisition_value">Valor de adquisición *</Label>
            <Input
              id="acquisition_value"
              type="number"
              step="0.01"
              {...register("acquisition_value", { 
                required: "Valor requerido",
                valueAsNumber: true,
                min: { value: 0, message: "Debe ser mayor a 0" }
              })}
              placeholder="50000.00"
            />
            {errors.acquisition_value && (
              <p className="text-sm text-destructive mt-1">{errors.acquisition_value.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Amortización */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">Amortización</h3>

        <div>
          <Label htmlFor="depreciation_method">Método de amortización *</Label>
          <Select
            value={depreciationMethod}
            onValueChange={(value) => setValue('depreciation_method', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="linear">Lineal</SelectItem>
              <SelectItem value="declining">Degresivo (suma de dígitos)</SelectItem>
              <SelectItem value="units">Unidades de producción</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="useful_life_years">Vida útil (años) *</Label>
            <Input
              id="useful_life_years"
              type="number"
              {...register("useful_life_years", { 
                required: "Vida útil requerida",
                valueAsNumber: true,
                min: { value: 1, message: "Mínimo 1 año" }
              })}
              placeholder="10"
            />
            {errors.useful_life_years && (
              <p className="text-sm text-destructive mt-1">{errors.useful_life_years.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="residual_value">Valor residual</Label>
            <Input
              id="residual_value"
              type="number"
              step="0.01"
              {...register("residual_value", { valueAsNumber: true })}
              placeholder="5000.00"
            />
          </div>
        </div>
      </div>

      {/* Información adicional */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">Información adicional</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="location">Ubicación</Label>
            <Input
              id="location"
              {...register("location")}
              placeholder="Almacén principal"
            />
          </div>

          <div>
            <Label htmlFor="invoice_ref">Referencia factura</Label>
            <Input
              id="invoice_ref"
              {...register("invoice_ref")}
              placeholder="FAC-2024-001"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="notes">Notas</Label>
          <Textarea
            id="notes"
            {...register("notes")}
            placeholder="Información adicional del activo..."
            rows={3}
          />
        </div>
      </div>

      {/* Acciones */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Guardando..." : asset ? "Actualizar" : "Crear activo"}
        </Button>
      </div>
    </form>
  );
}
