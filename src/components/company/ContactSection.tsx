import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { CompanyFormData } from "@/hooks/useCompanyForm";

export function ContactSection() {
  const { register, formState: { errors } } = useFormContext<CompanyFormData>();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Phone className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Teléfonos / Contacto</h3>
      </div>
      
      <Card className="p-6">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 sm:col-span-3">
            <Label htmlFor="phone1" className="text-xs text-muted-foreground">Teléfono 1</Label>
            <Input 
              id="phone1"
              {...register("phone1")}
              placeholder="933 123 456"
            />
          </div>

          <div className="col-span-12 sm:col-span-3">
            <Label htmlFor="phone2" className="text-xs text-muted-foreground">Teléfono 2</Label>
            <Input 
              id="phone2"
              {...register("phone2")}
              placeholder="933 123 457"
            />
          </div>

          <div className="col-span-12 sm:col-span-3">
            <Label htmlFor="phone3" className="text-xs text-muted-foreground">Teléfono 3</Label>
            <Input 
              id="phone3"
              {...register("phone3")}
              placeholder="933 123 458"
            />
          </div>

          <div className="col-span-12 sm:col-span-3">
            <Label htmlFor="phone4" className="text-xs text-muted-foreground">Teléfono 4</Label>
            <Input 
              id="phone4"
              {...register("phone4")}
              placeholder="933 123 459"
            />
          </div>

          <div className="col-span-12 sm:col-span-6">
            <Label htmlFor="contact-name" className="text-xs text-muted-foreground">
              Persona de Contacto
            </Label>
            <Input 
              id="contact-name"
              {...register("contact_name")}
              placeholder="Nombre y apellidos"
            />
          </div>

          <div className="col-span-12 sm:col-span-6">
            <Label htmlFor="email" className="text-xs text-muted-foreground">
              Email de Empresa
            </Label>
            <Input 
              id="email"
              type="email"
              {...register("email")}
              placeholder="contacto@empresa.com"
            />
            {errors.email && (
              <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
