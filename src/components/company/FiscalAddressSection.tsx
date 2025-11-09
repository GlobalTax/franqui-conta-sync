import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MapPin, Search } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { CompanyFormData } from "@/hooks/useCompanyForm";
import { useState } from "react";
import { LocationSearchDialog } from "./LocationSearchDialog";

interface Props {
  address?: any;
}

export function FiscalAddressSection({ address }: Props) {
  const { register, setValue, watch } = useFormContext<CompanyFormData>();
  const [searchOpen, setSearchOpen] = useState(false);
  const [locationDisplay, setLocationDisplay] = useState("");

  const handleLocationSelect = (location: any) => {
    setValue("fiscal_address.postal_code", location.code);
    if (location.type === 'municipality') {
      setValue("fiscal_address.municipality_id", parseInt(location.id));
    }
    setLocationDisplay(`${location.code} - ${location.name}`);
    setSearchOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Domicilio Fiscal</h3>
      </div>
      
      <Card className="p-6">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 sm:col-span-3">
            <Label htmlFor="fiscal-street-type" className="text-xs text-muted-foreground">
              Tipo de vía
            </Label>
            <Select
              value={watch("fiscal_address.street_type")}
              onValueChange={(value) => setValue("fiscal_address.street_type", value)}
            >
              <SelectTrigger id="fiscal-street-type">
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
            <Label htmlFor="fiscal-street" className="text-xs text-muted-foreground">
              Vía pública *
            </Label>
            <Input 
              id="fiscal-street"
              {...register("fiscal_address.street_name")}
              placeholder="Nombre de la calle"
            />
          </div>

          <div className="col-span-3 sm:col-span-1">
            <Label htmlFor="fiscal-number" className="text-xs text-muted-foreground">Nº</Label>
            <Input 
              id="fiscal-number"
              {...register("fiscal_address.number")}
              placeholder="123"
            />
          </div>

          <div className="col-span-3 sm:col-span-1">
            <Label htmlFor="fiscal-staircase" className="text-xs text-muted-foreground">Esc</Label>
            <Input 
              id="fiscal-staircase"
              {...register("fiscal_address.staircase")}
              placeholder="A"
            />
          </div>

          <div className="col-span-3 sm:col-span-1">
            <Label htmlFor="fiscal-floor" className="text-xs text-muted-foreground">Piso</Label>
            <Input 
              id="fiscal-floor"
              {...register("fiscal_address.floor")}
              placeholder="1"
            />
          </div>

          <div className="col-span-3 sm:col-span-1">
            <Label htmlFor="fiscal-door" className="text-xs text-muted-foreground">Pta</Label>
            <Input 
              id="fiscal-door"
              {...register("fiscal_address.door")}
              placeholder="B"
            />
          </div>

          <div className="col-span-6 sm:col-span-2">
            <Label htmlFor="fiscal-postal-code" className="text-xs text-muted-foreground">
              Código Postal *
            </Label>
            <Input 
              id="fiscal-postal-code"
              {...register("fiscal_address.postal_code")}
              maxLength={5}
              placeholder="08010"
            />
          </div>

          <div className="col-span-12 sm:col-span-7">
            <Label className="text-xs text-muted-foreground">Población *</Label>
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
                value={locationDisplay || watch("fiscal_address.postal_code") || ""}
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
