import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Eye, Users, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { toggleCentreStatus } from "@/lib/supabase-queries";
import { ManageRestaurantUsersDialog } from "@/components/admin/ManageRestaurantUsersDialog";
import { ManageRestaurantCompaniesDialog } from "@/components/admin/ManageRestaurantCompaniesDialog";

const CentresManagement = () => {
  const { toast } = useToast();
  const [centres, setCentres] = useState<any[]>([]);
  const [filteredCentres, setFilteredCentres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [franchiseeFilter, setFranchiseeFilter] = useState("all");
  const [franchisees, setFranchisees] = useState<any[]>([]);
  
  const [selectedCentre, setSelectedCentre] = useState<any>(null);
  const [usersDialogOpen, setUsersDialogOpen] = useState(false);
  const [companiesDialogOpen, setCompaniesDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [centres, searchTerm, statusFilter, franchiseeFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [centresData, franchiseesData] = await Promise.all([
        supabase
          .from("centres")
          .select(`
            *,
            franchisees(id, name),
            user_roles(count),
            centre_companies!inner(id, cif, razon_social, es_principal, activo)
          `)
          .order("nombre"),
        supabase
          .from("franchisees")
          .select("id, name")
          .order("name")
      ]);

      if (centresData.error) throw centresData.error;
      if (franchiseesData.error) throw franchiseesData.error;

      setCentres(centresData.data || []);
      setFranchisees(franchiseesData.data || []);
    } catch (error: any) {
      console.error("Error al cargar datos:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = centres;

    // Status filter
    if (statusFilter === "active") {
      filtered = filtered.filter(c => c.activo);
    } else if (statusFilter === "inactive") {
      filtered = filtered.filter(c => !c.activo);
    }

    // Franchisee filter
    if (franchiseeFilter !== "all") {
      filtered = filtered.filter(c => c.franchisee_id === franchiseeFilter);
    }

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.codigo?.toLowerCase().includes(term) ||
        c.nombre?.toLowerCase().includes(term) ||
        c.ciudad?.toLowerCase().includes(term)
      );
    }

    setFilteredCentres(filtered);
  };

  const handleToggleStatus = async (centreId: string, currentStatus: boolean) => {
    try {
      await toggleCentreStatus(centreId, !currentStatus);
      toast({
        title: currentStatus ? "Centro desactivado" : "Centro activado",
        description: "El estado del centro ha sido actualizado",
      });
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openUsersDialog = (centre: any) => {
    setSelectedCentre(centre);
    setUsersDialogOpen(true);
  };

  const openCompaniesDialog = (centre: any) => {
    setSelectedCentre(centre);
    setCompaniesDialogOpen(true);
  };

  const getCompanyCount = (centre: any) => {
    return centre.centre_companies?.filter((c: any) => c.activo).length || 0;
  };

  const getPrincipalCIF = (centre: any) => {
    return centre.centre_companies?.find((c: any) => c.es_principal && c.activo)?.cif;
  };

  if (loading) {
    return <div className="text-center py-8">Cargando centros...</div>;
  }

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Gestión de Centros</h3>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Solo Activos</SelectItem>
              <SelectItem value="inactive">Solo Inactivos</SelectItem>
            </SelectContent>
          </Select>

          <Select value={franchiseeFilter} onValueChange={setFranchiseeFilter}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Franchisee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los franchisees</SelectItem>
              {franchisees.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Buscar por código, nombre o ciudad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[300px]"
          />
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Franchisee</TableHead>
                <TableHead>Ciudad</TableHead>
                <TableHead>Usuarios</TableHead>
                <TableHead>Sociedades</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCentres.map((centre) => (
                <TableRow key={centre.id}>
                  <TableCell>
                    <Badge variant="outline">{centre.codigo}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{centre.nombre}</div>
                  </TableCell>
                  <TableCell>{centre.franchisees?.name || "—"}</TableCell>
                  <TableCell>{centre.ciudad || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {centre.user_roles?.[0]?.count || 0}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {getCompanyCount(centre)} CIF{getCompanyCount(centre) !== 1 ? 's' : ''}
                      </Badge>
                      {getPrincipalCIF(centre) && (
                        <Badge variant="secondary" className="text-xs">
                          {getPrincipalCIF(centre)}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={centre.activo}
                        onCheckedChange={() => handleToggleStatus(centre.id, centre.activo)}
                      />
                      <Badge variant={centre.activo ? "default" : "secondary"}>
                        {centre.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" title="Ver detalles">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => openUsersDialog(centre)}
                        title="Gestionar usuarios"
                      >
                        <Users className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => openCompaniesDialog(centre)}
                        title="Gestionar sociedades"
                      >
                        <Building2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredCentres.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No se encontraron centros con los filtros aplicados
          </div>
        )}
      </Card>

      <ManageRestaurantUsersDialog
        centre={selectedCentre}
        open={usersDialogOpen}
        onOpenChange={setUsersDialogOpen}
        onUpdate={loadData}
      />

      <ManageRestaurantCompaniesDialog
        centre={selectedCentre}
        open={companiesDialogOpen}
        onOpenChange={setCompaniesDialogOpen}
        onUpdate={loadData}
      />
    </>
  );
};

export default CentresManagement;
