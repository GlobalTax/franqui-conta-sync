import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFormContext } from "react-hook-form";
import { CompanyFormData } from "@/hooks/useCompanyForm";

export function CompanyIdentificationSection() {
  const { register, formState: { errors }, watch, setValue } = useFormContext<CompanyFormData>();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Identificación de la Empresa</h3>
      
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 sm:col-span-2">
          <Label htmlFor="code" className="text-xs text-muted-foreground">Código</Label>
          <Input 
            id="code"
            {...register("code")}
            placeholder="1599"
          />
        </div>

        <div className="col-span-12 sm:col-span-3">
          <Label htmlFor="country-fiscal" className="text-xs text-muted-foreground">
            País Domicilio Fiscal
          </Label>
          <Input 
            id="country-fiscal"
            {...register("country_fiscal_code")}
            placeholder="ES"
            maxLength={2}
            className="uppercase"
          />
        </div>

        <div className="col-span-12 sm:col-span-3">
          <Label className="text-xs text-muted-foreground">NIF</Label>
          <div className="flex gap-2">
            <Input 
              {...register("nif_prefix")}
              className="w-12 uppercase"
              placeholder="B"
              maxLength={1}
            />
            <Input 
              {...register("nif_number")}
              placeholder="67498741"
              maxLength={8}
            />
          </div>
          {errors.nif_number && (
            <p className="text-xs text-destructive mt-1">{errors.nif_number.message}</p>
          )}
        </div>

        <div className="col-span-12 sm:col-span-4">
          <Label htmlFor="razon-social" className="text-xs text-muted-foreground">
            Razón Social *
          </Label>
          <Input 
            id="razon-social"
            {...register("razon_social")}
            placeholder="NOMBRE DE LA EMPRESA SL"
          />
          {errors.razon_social && (
            <p className="text-xs text-destructive mt-1">{errors.razon_social.message}</p>
          )}
        </div>

        <div className="col-span-12 sm:col-span-3">
          <Label htmlFor="legal-type" className="text-xs text-muted-foreground">
            Tipo Entidad
          </Label>
          <Select
            value={watch("legal_type")}
            onValueChange={(value) => setValue("legal_type", value)}
          >
            <SelectTrigger id="legal-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Persona Jurídica">Persona Jurídica</SelectItem>
              <SelectItem value="Persona Física">Persona Física</SelectItem>
              <SelectItem value="Autónomo">Autónomo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
