import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useLocationSearch, LocationResult } from "@/hooks/useLocationSearch";
import { Search, MapPin } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (location: LocationResult) => void;
}

export function LocationSearchDialog({ open, onOpenChange, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const { data: locations, isLoading } = useLocationSearch(query, open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Buscar Población o Código Postal</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Escribe código postal o nombre de población..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          <ScrollArea className="h-[400px] pr-4">
            {isLoading && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Buscando...
              </p>
            )}

            {!isLoading && Array.isArray(locations) && locations.length === 0 && query.length >= 2 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No se encontraron resultados para "{query}"
              </p>
            )}

            {!isLoading && Array.isArray(locations) && locations.length > 0 && (
              <div className="space-y-1">
                {locations.map((location: LocationResult, idx: number) => (
                  <button
                    key={`${location.type}-${location.id}-${idx}`}
                    onClick={() => {
                      onSelect(location);
                      onOpenChange(false);
                    }}
                    className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left"
                  >
                    <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{location.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {location.type === 'postal_code' ? 'CP' : location.type === 'municipality' ? 'Municipio' : 'Provincia'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {location.code && `${location.code} • `}{location.parent_name}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
