import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Edit, Link as LinkIcon, Unlink } from "lucide-react";
import { useCentre } from "@/hooks/useCentres";
import { useOrquestServices, useLinkCentreToService } from "@/hooks/useOrquestServices";
import { ManageRestaurantCompaniesDialog } from "@/components/admin/ManageRestaurantCompaniesDialog";
import { ManageRestaurantUsersDialog } from "@/components/admin/ManageRestaurantUsersDialog";
import { EditCentreDialog } from "@/components/admin/EditCentreDialog";
import { useState } from "react";

const CentreDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: centre, isLoading } = useCentre(id!);
  const { data: orquestServices } = useOrquestServices();
  const linkService = useLinkCentreToService();
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [companiesDialogOpen, setCompaniesDialogOpen] = useState(false);
  const [usersDialogOpen, setUsersDialogOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");

  const handleLinkService = () => {
    if (!selectedServiceId) return;
    linkService.mutate({ centreId: centre.id, serviceId: selectedServiceId });
  };

  const handleUnlinkService = () => {
    linkService.mutate({ centreId: centre.id, serviceId: null });
  };

  if (isLoading) {
    return <div className="p-6 text-center">Cargando centro...</div>;
  }

  if (!centre) {
    return <div className="p-6 text-center">Centro no encontrado</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/admin?tab=centres")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{centre.nombre}</h1>
            <p className="text-muted-foreground">Código: {centre.codigo}</p>
          </div>
          <Badge variant={centre.activo ? "default" : "secondary"}>
            {centre.activo ? "Activo" : "Inactivo"}
          </Badge>
        </div>
        <Button onClick={() => setEditDialogOpen(true)}>
          <Edit className="h-4 w-4 mr-2" />
          Editar Centro
        </Button>
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList>
          <TabsTrigger value="info">📋 Información</TabsTrigger>
          <TabsTrigger value="companies">🏢 Sociedades</TabsTrigger>
          <TabsTrigger value="users">👥 Usuarios</TabsTrigger>
          <TabsTrigger value="orquest">🔗 Orquest</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-6">
          <Card className="p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-4">Información General</h3>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm text-muted-foreground">Franchisee</dt>
                    <dd className="font-medium">{centre.franchisees?.name || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Email Franchisee</dt>
                    <dd className="font-medium">{centre.franchisees?.email || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Site Number</dt>
                    <dd className="font-medium">{centre.site_number || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Fecha de Apertura</dt>
                    <dd className="font-medium">{centre.opening_date || "—"}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="font-semibold mb-4">Ubicación</h3>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm text-muted-foreground">Dirección</dt>
                    <dd className="font-medium">{centre.direccion || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Ciudad</dt>
                    <dd className="font-medium">{centre.ciudad || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Provincia</dt>
                    <dd className="font-medium">{centre.state || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Código Postal</dt>
                    <dd className="font-medium">{centre.postal_code || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">País</dt>
                    <dd className="font-medium">{centre.pais || "—"}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="font-semibold mb-4">Características</h3>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm text-muted-foreground">Capacidad (asientos)</dt>
                    <dd className="font-medium">{centre.seating_capacity || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Metros Cuadrados</dt>
                    <dd className="font-medium">{centre.square_meters || "—"}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="companies" className="mt-6">
          <Card className="p-6">
            {centre.centre_companies && centre.centre_companies.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Sociedades del Centro</h3>
                  <Button onClick={() => setCompaniesDialogOpen(true)}>Gestionar Sociedades</Button>
                </div>
                <div className="space-y-2">
                  {centre.centre_companies?.map((company: any) => (
                    <div key={company.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{company.razon_social}</div>
                        <div className="text-sm text-muted-foreground">CIF: {company.cif}</div>
                      </div>
                      <div className="flex gap-2">
                        {company.es_principal && <Badge>Principal</Badge>}
                        <Badge variant={company.activo ? "default" : "secondary"}>
                          {company.activo ? "Activa" : "Inactiva"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <Alert>
                <AlertDescription className="flex items-center justify-between">
                  <span>Este centro no tiene ninguna sociedad asociada.</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCompaniesDialogOpen(true)}
                  >
                    Gestionar Sociedades
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Usuarios del Centro</h3>
              <Button onClick={() => setUsersDialogOpen(true)}>Gestionar Usuarios</Button>
            </div>
            <p className="text-muted-foreground">
              Gestione los usuarios y roles asociados a este centro.
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="orquest" className="mt-6">
          <div className="space-y-6">
            {centre.orquest_service ? (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Servicio Orquest Vinculado</h3>
                  <Button variant="outline" onClick={handleUnlinkService}>
                    <Unlink className="h-4 w-4 mr-2" />
                    Desvincular
                  </Button>
                </div>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm text-muted-foreground">ID del Servicio</dt>
                    <dd className="font-medium">{centre.orquest_service.id}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Nombre</dt>
                    <dd className="font-medium">{centre.orquest_service.nombre}</dd>
                  </div>
                  {centre.orquest_service.zona_horaria && (
                    <div>
                      <dt className="text-sm text-muted-foreground">Zona Horaria</dt>
                      <dd className="font-medium">{centre.orquest_service.zona_horaria}</dd>
                    </div>
                  )}
                </dl>
              </Card>
            ) : (
              <Alert>
                <AlertDescription>
                  Este centro no tiene un servicio Orquest vinculado
                </AlertDescription>
              </Alert>
            )}

            <Card className="p-6">
              <h3 className="font-semibold mb-4">Vincular Servicio Orquest</h3>
              <div className="flex gap-4">
                <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Seleccionar servicio Orquest" />
                  </SelectTrigger>
                  <SelectContent>
                    {orquestServices?.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.nombre} ({service.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleLinkService} disabled={!selectedServiceId}>
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Vincular
                </Button>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <EditCentreDialog
        centre={centre}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      <ManageRestaurantCompaniesDialog
        centre={centre}
        open={companiesDialogOpen}
        onOpenChange={setCompaniesDialogOpen}
        onUpdate={() => {}}
      />

      <ManageRestaurantUsersDialog
        centre={centre}
        open={usersDialogOpen}
        onOpenChange={setUsersDialogOpen}
        onUpdate={() => {}}
      />
    </div>
  );
};

export default CentreDetail;
