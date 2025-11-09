import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, Store, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useFranchiseeDetail } from "@/hooks/useFranchiseeDetail";
import { FranchiseeDataForm } from "@/components/admin/FranchiseeDataForm";
import { FranchiseeAssociatedCentres } from "@/components/admin/FranchiseeAssociatedCentres";
import { FranchiseeAssociatedCompanies } from "@/components/admin/FranchiseeAssociatedCompanies";
import { FranchiseeAuditLog } from "@/components/admin/FranchiseeAuditLog";
import { useToast } from "@/hooks/use-toast";

export default function FranchiseeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const {
    franchisee,
    centres,
    companies,
    isLoading,
    updateFranchisee,
    associateCentre,
    dissociateCentre,
    associateCompany,
    dissociateCompany,
    deleteFranchisee,
  } = useFranchiseeDetail(id!);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <p>Cargando...</p>
      </div>
    );
  }

  if (!franchisee) {
    return (
      <div className="container mx-auto p-6">
        <p>Franquiciado no encontrado</p>
      </div>
    );
  }

  const activeCentres = centres.filter(c => c.activo).length;
  const canDelete = centres.length === 0 && companies.length === 0;

  const handleDelete = async () => {
    if (!canDelete) {
      toast({
        title: "No se puede eliminar",
        description: "Desasocia todos los centros y sociedades primero",
        variant: "destructive",
      });
      setDeleteDialogOpen(false);
      return;
    }
    
    await deleteFranchisee.mutateAsync();
    navigate("/admin?tab=franchisees");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin?tab=franchisees")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{franchisee.name}</h1>
              <p className="text-muted-foreground">{franchisee.email}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="default">Activo</Badge>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar Franquiciado
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Centros Asociados</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{centres.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeCentres} activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sociedades Asociadas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companies.length}</div>
            <p className="text-xs text-muted-foreground">
              Total de sociedades
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {centres.length > 0 && companies.length > 0 ? "Completo" : "Incompleto"}
            </div>
            <p className="text-xs text-muted-foreground">
              {centres.length === 0 && "Sin centros asociados"}
              {companies.length === 0 && "Sin sociedades asociadas"}
              {centres.length > 0 && companies.length > 0 && "Todo configurado"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="data" className="space-y-4">
        <TabsList>
          <TabsTrigger value="data">Datos Generales</TabsTrigger>
          <TabsTrigger value="centres">Centros Asociados</TabsTrigger>
          <TabsTrigger value="companies">Sociedades Asociadas</TabsTrigger>
          <TabsTrigger value="audit">Auditoría</TabsTrigger>
        </TabsList>

        <TabsContent value="data">
          <FranchiseeDataForm
            franchisee={franchisee}
            onUpdate={(data) => updateFranchisee.mutate(data)}
            isUpdating={updateFranchisee.isPending}
          />
        </TabsContent>

        <TabsContent value="centres">
          <FranchiseeAssociatedCentres
            centres={centres}
            onAssociate={(centreId) => associateCentre.mutate(centreId)}
            onDissociate={(centreId) => dissociateCentre.mutate(centreId)}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="companies">
          <FranchiseeAssociatedCompanies
            companies={companies}
            onAssociate={(companyId) => associateCompany.mutate(companyId)}
            onDissociate={(companyId) => dissociateCompany.mutate(companyId)}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="audit">
          <FranchiseeAuditLog franchiseeId={id!} />
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {canDelete ? "¿Eliminar franquiciado?" : "No se puede eliminar"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {canDelete ? (
                <div className="space-y-3">
                  <p>Esta acción no se puede deshacer. El franquiciado <strong>{franchisee?.name}</strong> será eliminado permanentemente.</p>
                  <div className="space-y-1 text-sm">
                    <p className="text-green-600 dark:text-green-400">✓ No tiene centros asociados</p>
                    <p className="text-green-600 dark:text-green-400">✓ No tiene sociedades asociadas</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="font-semibold text-destructive">Este franquiciado tiene datos asociados:</p>
                  <div className="space-y-1 text-sm">
                    {centres.length > 0 && (
                      <p className="text-destructive">• {centres.length} centro(s) asociado(s)</p>
                    )}
                    {companies.length > 0 && (
                      <p className="text-destructive">• {companies.length} sociedad(es) asociada(s)</p>
                    )}
                  </div>
                  <p className="mt-3">Debes desasociar todos los centros y sociedades antes de eliminar este franquiciado.</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {canDelete && (
              <AlertDialogAction 
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
