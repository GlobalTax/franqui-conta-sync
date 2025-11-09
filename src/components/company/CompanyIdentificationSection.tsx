import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFormContext } from "react-hook-form";
import { CompanyFormData } from "@/hooks/useCompanyForm";
import { CompanyDataEnrichment } from "@/components/company/CompanyDataEnrichment";
import { EnrichedCompanyData } from "@/hooks/useCompanyEnrichment";
import { toast } from "sonner";

function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <span>
      {children} <span className="text-destructive">*</span>
    </span>
  );
}

export function CompanyIdentificationSection() {
  const { register, formState: { errors }, watch, setValue } = useFormContext<CompanyFormData>();

  const nifPrefix = watch("nif_prefix") || "";
  const nifNumber = watch("nif_number") || "";
  const fullCIF = nifPrefix + nifNumber;

  const handleEnrichmentAccept = (data: EnrichedCompanyData) => {
    // Datos básicos
    setValue("razon_social", data.razon_social);
    setValue("legal_type", "Persona Jurídica");
    
    // Dirección fiscal (si disponible)
    if (data.direccion_fiscal) {
      if (data.direccion_fiscal.tipo_via) {
        setValue("fiscal_address.street_type", data.direccion_fiscal.tipo_via);
      }
      setValue("fiscal_address.street_name", data.direccion_fiscal.nombre_via);
      if (data.direccion_fiscal.numero) {
        setValue("fiscal_address.number", data.direccion_fiscal.numero);
      }
      if (data.direccion_fiscal.escalera) {
        setValue("fiscal_address.staircase", data.direccion_fiscal.escalera);
      }
      if (data.direccion_fiscal.piso) {
        setValue("fiscal_address.floor", data.direccion_fiscal.piso);
      }
      if (data.direccion_fiscal.puerta) {
        setValue("fiscal_address.door", data.direccion_fiscal.puerta);
      }
      setValue("fiscal_address.postal_code", data.direccion_fiscal.codigo_postal);
      setValue("fiscal_address.country_code", data.direccion_fiscal.pais_codigo);
    }
    
    // Contacto (si disponible)
    if (data.contacto) {
      if (data.contacto.telefono) {
        setValue("phone1", data.contacto.telefono);
      }
      if (data.contacto.email) {
        setValue("email", data.contacto.email);
      }
    }
    
    toast.success("✅ Campos completados automáticamente");
  };

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
            <div className="flex gap-2 flex-1">
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
            <CompanyDataEnrichment
              cif={fullCIF}
              disabled={fullCIF.length < 9}
              onAccept={handleEnrichmentAccept}
            />
          </div>
          {errors.nif_number && (
            <p className="text-xs text-destructive mt-1">{errors.nif_number.message}</p>
          )}
        </div>

        <div className="col-span-12 sm:col-span-4">
          <Label htmlFor="razon-social" className="text-xs text-muted-foreground">
            <RequiredLabel>Razón Social</RequiredLabel>
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
