import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { useCompanyFiscalConfig } from "@/hooks/useCompanyFiscalConfig";

interface Props {
  companyId: string;
}

interface FiscalConfigFormData {
  iva_regime: "general" | "recargo_equivalencia" | "exento" | "simplificado";
  default_iva_rate: number;
  irpf_retention_rate: number;
  invoice_series: string;
  accounting_method: "devengo" | "caja";
  fiscal_year_start_month: number;
  use_verifactu: boolean;
}

export function FiscalConfigForm({ companyId }: Props) {
  const { config, updateConfig, isUpdating } = useCompanyFiscalConfig(companyId);

  const { register, handleSubmit, setValue, watch, reset } = useForm<FiscalConfigFormData>({
    defaultValues: {
      iva_regime: "general",
      default_iva_rate: 21,
      irpf_retention_rate: 0,
      invoice_series: "A",
      accounting_method: "devengo",
      fiscal_year_start_month: 1,
      use_verifactu: false,
    },
  });

  useEffect(() => {
    if (config) {
      reset({
        iva_regime: config.iva_regime,
        default_iva_rate: config.default_iva_rate,
        irpf_retention_rate: config.irpf_retention_rate,
        invoice_series: config.invoice_series,
        accounting_method: config.accounting_method,
        fiscal_year_start_month: config.fiscal_year_start_month,
        use_verifactu: config.use_verifactu,
      });
    }
  }, [config, reset]);

  const onSubmit = (data: FiscalConfigFormData) => {
    updateConfig(data);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Settings2 className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Configuración Fiscal Avanzada</h3>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="p-6">
          <div className="grid gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="iva_regime">Régimen de IVA</Label>
                <Select
                  value={watch("iva_regime")}
                  onValueChange={(value: any) => setValue("iva_regime", value)}
                >
                  <SelectTrigger id="iva_regime">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Régimen General</SelectItem>
                    <SelectItem value="recargo_equivalencia">Recargo de Equivalencia</SelectItem>
                    <SelectItem value="exento">Exento</SelectItem>
                    <SelectItem value="simplificado">Simplificado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="default_iva_rate">
                  Tipo de IVA por defecto (%)
                </Label>
                <Input
                  id="default_iva_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  {...register("default_iva_rate", { 
                    valueAsNumber: true,
                    min: 0,
                    max: 100 
                  })}
                  placeholder="21"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="irpf_retention_rate">
                  Retención IRPF por defecto (%)
                </Label>
                <Input
                  id="irpf_retention_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  {...register("irpf_retention_rate", { 
                    valueAsNumber: true,
                    min: 0,
                    max: 100 
                  })}
                  placeholder="0"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="invoice_series">Serie de facturación</Label>
                <Input
                  id="invoice_series"
                  {...register("invoice_series")}
                  placeholder="A"
                  maxLength={10}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="accounting_method">Criterio contable</Label>
                <Select
                  value={watch("accounting_method")}
                  onValueChange={(value: any) => setValue("accounting_method", value)}
                >
                  <SelectTrigger id="accounting_method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="devengo">Devengo</SelectItem>
                    <SelectItem value="caja">Caja</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="fiscal_year_start_month">
                  Mes de inicio del año fiscal
                </Label>
                <Select
                  value={watch("fiscal_year_start_month")?.toString()}
                  onValueChange={(value) => setValue("fiscal_year_start_month", parseInt(value))}
                >
                  <SelectTrigger id="fiscal_year_start_month">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <SelectItem key={month} value={month.toString()}>
                        {new Date(2024, month - 1, 1).toLocaleString("es-ES", {
                          month: "long",
                        })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-4 border-t">
              <Checkbox
                id="use_verifactu"
                checked={watch("use_verifactu")}
                onCheckedChange={(checked) => setValue("use_verifactu", !!checked)}
              />
              <Label htmlFor="use_verifactu" className="cursor-pointer">
                Activar VeriFactu (Sistema de verificación de facturas de la AEAT)
              </Label>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? "Guardando..." : "Guardar configuración"}
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}
