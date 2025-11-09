import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocationSearchDialog } from "@/components/company/LocationSearchDialog";
import { useLocationSearch, LocationResult } from "@/hooks/useLocationSearch";
import { Search, MapPin, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

export default function LocationCatalogs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: results = [], isLoading } = useLocationSearch(searchQuery, searchQuery.length >= 2);

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'postal_code': return 'default';
      case 'municipality': return 'secondary';
      case 'province': return 'outline';
      default: return 'secondary';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'postal_code': return 'Código Postal';
      case 'municipality': return 'Municipio';
      case 'province': return 'Provincia';
      default: return type;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Catálogos de Localización</h1>
        <p className="text-muted-foreground mt-1">
          Gestión de países, provincias, municipios y códigos postales
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Búsqueda directa */}
        <Card>
          <CardHeader>
            <CardTitle>Búsqueda Directa</CardTitle>
            <CardDescription>
              Busca por código postal, municipio o provincia
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Escribe código postal o nombre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {isLoading && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Buscando...
              </p>
            )}

            {!isLoading && searchQuery.length >= 2 && results.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No se encontraron resultados
              </p>
            )}

            {!isLoading && results.length > 0 && (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {results.map((result, idx) => (
                  <button
                    key={`${result.id}-${idx}`}
                    onClick={() => setSelectedLocation(result)}
                    className="w-full p-3 rounded-lg border hover:bg-accent transition-colors text-left"
                  >
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{result.name}</span>
                          <Badge variant={getTypeBadgeVariant(result.type)} className="text-xs">
                            {getTypeLabel(result.type)}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {result.code && `${result.code} • `}{result.parent_name}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Búsqueda con diálogo */}
        <Card>
          <CardHeader>
            <CardTitle>Búsqueda con Diálogo</CardTitle>
            <CardDescription>
              Componente modal reutilizable para formularios
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(true)}
              className="w-full"
            >
              <Search className="h-4 w-4 mr-2" />
              Abrir buscador de localización
            </Button>

            {selectedLocation && (
              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold">Localización Seleccionada</h4>
                </div>
                
                <div className="grid gap-2 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Tipo</Label>
                    <p className="font-medium">{getTypeLabel(selectedLocation.type)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Nombre</Label>
                    <p className="font-medium">{selectedLocation.name}</p>
                  </div>
                  {selectedLocation.code && (
                    <div>
                      <Label className="text-muted-foreground">Código</Label>
                      <p className="font-medium">{selectedLocation.code}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-muted-foreground">Provincia/País</Label>
                    <p className="font-medium">{selectedLocation.parent_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{selectedLocation.country_code}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Estadísticas */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Sistema</CardTitle>
          <CardDescription>
            Estadísticas de los catálogos de localización
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <p className="text-2xl font-bold">7</p>
              <p className="text-sm text-muted-foreground">Países activos</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">52</p>
              <p className="text-sm text-muted-foreground">Provincias España</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">9+</p>
              <p className="text-sm text-muted-foreground">Municipios iniciales</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">✓</p>
              <p className="text-sm text-muted-foreground">Búsqueda fuzzy activa</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <LocationSearchDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSelect={(location) => {
          setSelectedLocation(location);
          setDialogOpen(false);
        }}
      />
    </div>
  );
}
