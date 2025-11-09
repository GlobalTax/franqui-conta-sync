import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, MapPin, Building2, CheckCircle } from "lucide-react";
import { CompanyDetailData } from "@/hooks/useCompanyDetail";
import { Centre } from "@/hooks/useCentres";

interface Props {
  company: CompanyDetailData;
  availableCentres: Centre[];
  isLoading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssociate: (centreId: string, asPrincipal: boolean) => void;
  isAssociating: boolean;
}

const AssociateCentreToCompanyDialog = ({
  company,
  availableCentres,
  isLoading,
  open,
  onOpenChange,
  onAssociate,
  isAssociating,
}: Props) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCentreId, setSelectedCentreId] = useState<string | null>(null);
  const [markAsPrincipal, setMarkAsPrincipal] = useState(false);

  const filteredCentres = availableCentres.filter(
    (centre) =>
      centre.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      centre.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      centre.ciudad?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAssociate = () => {
    if (selectedCentreId) {
      onAssociate(selectedCentreId, markAsPrincipal);
      setSelectedCentreId(null);
      setMarkAsPrincipal(false);
      setSearchQuery("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Asociar Centro a Sociedad</DialogTitle>
          <DialogDescription>
            Selecciona un centro para asociarlo a <strong>{company.razon_social}</strong> (CIF: {company.cif})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código, nombre o ciudad..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-[300px] border rounded-lg">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Cargando centros disponibles...
              </div>
            ) : filteredCentres.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground">
                <MapPin className="h-12 w-12 mb-3 opacity-50" />
                <p className="font-medium">No hay centros disponibles</p>
                <p className="text-sm">
                  {searchQuery
                    ? "No se encontraron centros con ese criterio"
                    : "Todos los centros ya están asociados a esta sociedad"}
                </p>
              </div>
            ) : (
              <div className="space-y-2 p-2">
                {filteredCentres.map((centre) => (
                  <button
                    key={centre.id}
                    onClick={() => setSelectedCentreId(centre.id)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all hover:bg-accent ${
                      selectedCentreId === centre.id
                        ? "border-primary bg-accent"
                        : "border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-medium">{centre.codigo}</span>
                          <span className="font-semibold">{centre.nombre}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {centre.ciudad && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {centre.ciudad}
                            </span>
                          )}
                          {centre.franchisees && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {centre.franchisees.name}
                            </span>
                          )}
                        </div>
                      </div>
                      {selectedCentreId === centre.id && (
                        <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          {selectedCentreId && (
            <div className="flex items-center justify-between p-4 bg-accent rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="principal-switch" className="text-sm font-medium">
                  Marcar como centro principal
                </Label>
                <p className="text-xs text-muted-foreground">
                  Si hay otro centro principal, se desmarcará automáticamente
                </p>
              </div>
              <Switch
                id="principal-switch"
                checked={markAsPrincipal}
                onCheckedChange={setMarkAsPrincipal}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAssociate}
              disabled={!selectedCentreId || isAssociating}
            >
              {isAssociating ? "Asociando..." : "Asociar Centro"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AssociateCentreToCompanyDialog;
