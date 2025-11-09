import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Link2, Unlink, Plus, Building2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { CreateCompanyDialog } from "./CreateCompanyDialog";

interface FranchiseeAssociatedCompaniesProps {
  companies: any[];
  onCreate: (data: { razon_social: string; cif: string; tipo_sociedad: string }) => void;
  onAssociate: (companyId: string) => void;
  onDissociate: (companyId: string) => void;
  isLoading: boolean;
  isCreating: boolean;
}

export function FranchiseeAssociatedCompanies({ 
  companies,
  onCreate,
  onAssociate, 
  onDissociate,
  isLoading,
  isCreating
}: FranchiseeAssociatedCompaniesProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [associateDialogOpen, setAssociateDialogOpen] = useState(false);
  const [dissociateDialogOpen, setDissociateDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Query available companies (without franchisee)
  const { data: availableCompanies } = useQuery({
    queryKey: ["available-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .is("franchisee_id", null)
        .eq("activo", true)
        .order("razon_social");
      
      if (error) throw error;
      return data;
    },
    enabled: associateDialogOpen,
  });

  const handleDissociate = (company: any) => {
    setSelectedCompany(company);
    setDissociateDialogOpen(true);
  };

  const confirmDissociate = () => {
    if (selectedCompany) {
      onDissociate(selectedCompany.id);
      setDissociateDialogOpen(false);
      setSelectedCompany(null);
    }
  };

  const handleCreate = (data: { razon_social: string; cif: string; tipo_sociedad: string }) => {
    onCreate(data);
    setCreateDialogOpen(false);
  };

  const handleAssociate = (companyId: string) => {
    onAssociate(companyId);
    setAssociateDialogOpen(false);
  };

  const filteredAvailableCompanies = availableCompanies?.filter(company => 
    company.razon_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.cif.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Sociedades Asociadas</CardTitle>
              <CardDescription>
                Gestiona las sociedades asignadas a este franquiciado
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAssociateDialogOpen(true)}>
                <Link2 className="mr-2 h-4 w-4" />
                Asociar Existente
              </Button>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Building2 className="mr-2 h-4 w-4" />
                Crear Nueva
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {companies.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hay sociedades asociadas a este franquiciado
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Razón Social</TableHead>
                  <TableHead>CIF</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">{company.razon_social}</TableCell>
                    <TableCell>{company.cif}</TableCell>
                    <TableCell>{company.tipo_sociedad}</TableCell>
                    <TableCell>
                      <Badge variant={company.activo ? "default" : "secondary"}>
                        {company.activo ? "Activa" : "Inactiva"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDissociate(company)}
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

      {/* Create Company Dialog */}
      <CreateCompanyDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreate={handleCreate}
        isCreating={isCreating}
      />

      {/* Associate Company Dialog */}
      <Dialog open={associateDialogOpen} onOpenChange={setAssociateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Asociar Sociedad Existente</DialogTitle>
            <DialogDescription>
              Selecciona una sociedad sin franquiciado asignado para asociarla
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              placeholder="Buscar por razón social o CIF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <div className="max-h-96 overflow-y-auto">
              {filteredAvailableCompanies?.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No hay sociedades disponibles
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredAvailableCompanies?.map((company) => (
                    <div
                      key={company.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                      onClick={() => handleAssociate(company.id)}
                    >
                      <div>
                        <p className="font-medium">{company.razon_social}</p>
                        <p className="text-sm text-muted-foreground">
                          {company.cif} · {company.tipo_sociedad}
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
            <AlertDialogTitle>¿Desasociar sociedad?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres desasociar la sociedad <strong>{selectedCompany?.razon_social}</strong>?
              La sociedad quedará disponible para ser asociada a otro franquiciado.
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
