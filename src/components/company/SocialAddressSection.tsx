import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MapPin, Search, Copy } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { CompanyFormData } from "@/hooks/useCompanyForm";
import { useState } from "react";
import { LocationSearchDialog } from "./LocationSearchDialog";
import { useToast } from "@/hooks/use-toast";

interface Props {
  address?: any;
}

export function SocialAddressSection({ address }: Props) {
  const { register, setValue, watch } = useFormContext<CompanyFormData>();
  const [searchOpen, setSearchOpen] = useState(false);
  const { toast } = useToast();

  const handleLocationSelect = (location: any) => {
    setValue("social_address.postal_code", location.code);
    if (location.type === 'municipality') {
      setValue("social_address.municipality_id", parseInt(location.id));
    }
    setSearchOpen(false);
  };

  const copyFromFiscal = () => {
    const fiscalAddress = watch("fiscal_address");
    if (fiscalAddress) {
      Object.keys(fiscalAddress).forEach((key) => {
        setValue(`social_address.${key}` as any, fiscalAddress[key as keyof typeof fiscalAddress]);
      });
      toast({
        title: "Dirección copiada",
        description: "La dirección fiscal se ha copiado a la dirección social",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Domicilio Social</h3>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={copyFromFiscal}
          className="gap-2"
        >
          <Copy className="h-4 w-4" />
          Copiar desde Fiscal
        </Button>
      </div>
      
      <Card className="p-6">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 sm:col-span-3">
            <Label htmlFor="social-street-type" className="text-xs text-muted-foreground">
              Tipo de vía
            </Label>
            <Select
              value={watch("social_address.street_type")}
              onValueChange={(value) => setValue("social_address.street_type", value)}
            >
              <SelectTrigger id="social-street-type">
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CALLE">CALLE</SelectItem>
                <SelectItem value="AVENIDA">AVENIDA</SelectItem>
                <SelectItem value="RAMBLA">RAMBLA</SelectItem>
                <SelectItem value="PLAZA">PLAZA</SelectItem>
                <SelectItem value="PASEO">PASEO</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-12 sm:col-span-6">
            <Label htmlFor="social-street" className="text-xs text-muted-foreground">
              Vía pública
            </Label>
            <Input 
              id="social-street"
              {...register("social_address.street_name")}
              placeholder="Nombre de la calle"
            />
          </div>

          <div className="col-span-3 sm:col-span-1">
            <Label htmlFor="social-number" className="text-xs text-muted-foreground">Nº</Label>
            <Input 
              id="social-number"
              {...register("social_address.number")}
              placeholder="123"
            />
          </div>

          <div className="col-span-3 sm:col-span-1">
            <Label htmlFor="social-staircase" className="text-xs text-muted-foreground">Esc</Label>
            <Input 
              id="social-staircase"
              {...register("social_address.staircase")}
              placeholder="A"
            />
          </div>

          <div className="col-span-3 sm:col-span-1">
            <Label htmlFor="social-floor" className="text-xs text-muted-foreground">Piso</Label>
            <Input 
              id="social-floor"
              {...register("social_address.floor")}
              placeholder="1"
            />
          </div>

          <div className="col-span-3 sm:col-span-1">
            <Label htmlFor="social-door" className="text-xs text-muted-foreground">Pta</Label>
            <Input 
              id="social-door"
              {...register("social_address.door")}
              placeholder="B"
            />
          </div>

          <div className="col-span-6 sm:col-span-2">
            <Label htmlFor="social-postal-code" className="text-xs text-muted-foreground">
              Código Postal
            </Label>
            <Input 
              id="social-postal-code"
              {...register("social_address.postal_code")}
              maxLength={5}
              placeholder="08010"
            />
          </div>

          <div className="col-span-12 sm:col-span-7">
            <Label className="text-xs text-muted-foreground">Población</Label>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                type="button"
                onClick={() => setSearchOpen(true)}
              >
                <Search className="h-4 w-4" />
              </Button>
              <Input 
                placeholder="Buscar población o código postal"
                readOnly
                value={watch("social_address.postal_code") || ""}
                className="cursor-pointer"
                onClick={() => setSearchOpen(true)}
              />
            </div>
          </div>
        </div>
      </Card>

      <LocationSearchDialog 
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelect={handleLocationSelect}
      />
    </div>
  );
}
