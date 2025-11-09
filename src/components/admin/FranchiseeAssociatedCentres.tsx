import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Link2, Unlink, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

interface FranchiseeAssociatedCentresProps {
  centres: any[];
  onAssociate: (centreId: string) => void;
  onDissociate: (centreId: string) => void;
  isLoading: boolean;
}

export function FranchiseeAssociatedCentres({ 
  centres, 
  onAssociate, 
  onDissociate,
  isLoading 
}: FranchiseeAssociatedCentresProps) {
  const [associateDialogOpen, setAssociateDialogOpen] = useState(false);
  const [dissociateDialogOpen, setDissociateDialogOpen] = useState(false);
  const [selectedCentre, setSelectedCentre] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Query available centres (without franchisee)
  const { data: availableCentres } = useQuery({
    queryKey: ["available-centres"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("centres")
        .select("*")
        .is("franchisee_id", null)
        .eq("activo", true)
        .order("nombre");
      
      if (error) throw error;
      return data;
    },
    enabled: associateDialogOpen,
  });

  const handleDissociate = (centre: any) => {
    setSelectedCentre(centre);
    setDissociateDialogOpen(true);
  };

  const confirmDissociate = () => {
    if (selectedCentre) {
      onDissociate(selectedCentre.id);
      setDissociateDialogOpen(false);
      setSelectedCentre(null);
    }
  };

  const handleAssociate = (centreId: string) => {
    onAssociate(centreId);
    setAssociateDialogOpen(false);
  };

  const filteredAvailableCentres = availableCentres?.filter(centre => 
    centre.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    centre.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Centros Asociados</CardTitle>
              <CardDescription>
                Gestiona los centros asignados a este franquiciado
              </CardDescription>
            </div>
            <Button onClick={() => setAssociateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Asociar Centro
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {centres.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hay centros asociados a este franquiciado
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {centres.map((centre) => (
                  <TableRow key={centre.id}>
                    <TableCell className="font-medium">{centre.codigo}</TableCell>
                    <TableCell>{centre.nombre}</TableCell>
                    <TableCell>{centre.direccion || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={centre.activo ? "default" : "secondary"}>
                        {centre.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDissociate(centre)}
                      >
                        <Unlink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Associate Centre Dialog */}
      <Dialog open={associateDialogOpen} onOpenChange={setAssociateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Asociar Centro</DialogTitle>
            <DialogDescription>
              Selecciona un centro para asociar a este franquiciado
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              placeholder="Buscar por nombre o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <div className="max-h-96 overflow-y-auto">
              {filteredAvailableCentres?.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No hay centros disponibles
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredAvailableCentres?.map((centre) => (
                    <div
                      key={centre.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                      onClick={() => handleAssociate(centre.id)}
                    >
                      <div>
                        <p className="font-medium">{centre.nombre}</p>
                        <p className="text-sm text-muted-foreground">
                          {centre.codigo} · {centre.direccion || "Sin dirección"}
                        </p>
                      </div>
                      <Button size="sm" variant="outline">
                        <Link2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dissociate Confirmation Dialog */}
      <AlertDialog open={dissociateDialogOpen} onOpenChange={setDissociateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desasociar centro?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres desasociar el centro <strong>{selectedCentre?.nombre}</strong>?
              El centro quedará disponible para ser asociado a otro franquiciado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDissociate}>
              Desasociar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
