import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Users, Plus, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreateFranchiseeDialog } from "@/components/admin/CreateFranchiseeDialog";
import { EditFranchiseeDialog } from "@/components/admin/EditFranchiseeDialog";

const FranchiseesManagement = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [franchisees, setFranchisees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedFranchisee, setSelectedFranchisee] = useState<any>(null);

  useEffect(() => {
    loadFranchisees();
  }, []);

  const loadFranchisees = async () => {
    setLoading(true);
    
    try {
      // Paso 1: Cargar franchisees sin joins
      const { data: franchiseesData, error } = await supabase
        .from("franchisees")
        .select("*")
        .order("name");

      if (error) throw error;

      const franchiseeIds = (franchiseesData || []).map((f: any) => f.id);

      if (franchiseeIds.length === 0) {
        setFranchisees([]);
        return;
      }

      // Paso 2: Cargar centros y user_roles para contar
      const [centresResult, rolesResult] = await Promise.all([
        supabase.from("centres").select("franchisee_id").in("franchisee_id", franchiseeIds),
        supabase.from("user_roles").select("franchisee_id").in("franchisee_id", franchiseeIds)
      ]);

      // Paso 3: Agrupar counts por franchisee_id
      const centresMap = new Map<string, number>();
      (centresResult.data || []).forEach((row: any) => {
        centresMap.set(row.franchisee_id, (centresMap.get(row.franchisee_id) || 0) + 1);
      });

      const rolesMap = new Map<string, number>();
      (rolesResult.data || []).forEach((row: any) => {
        rolesMap.set(row.franchisee_id, (rolesMap.get(row.franchisee_id) || 0) + 1);
      });

      // Paso 4: Recomponer con counts reales
      const enrichedData = franchiseesData.map((f: any) => ({
        ...f,
        centres: [{ count: centresMap.get(f.id) || 0 }],
        user_roles: [{ count: rolesMap.get(f.id) || 0 }]
      }));

      setFranchisees(enrichedData);
    } catch (err: any) {
      console.error("Error loading franchisees:", err);
      toast({
        title: "Error",
        description: "No se pudieron cargar los franchisees",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (franchisee: any) => {
    setSelectedFranchisee(franchisee);
    setEditDialogOpen(true);
  };

  if (loading) {
    return <div className="text-center py-8">Cargando franchisees...</div>;
  }

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Gestión de Franchisees</h3>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Franchisee
          </Button>
        </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>CIF</TableHead>
            <TableHead>Centros</TableHead>
            <TableHead>Usuarios</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {franchisees.map((franchisee) => (
            <TableRow key={franchisee.id}>
              <TableCell>
                <div className="font-medium">{franchisee.name}</div>
              </TableCell>
              <TableCell>{franchisee.email}</TableCell>
              <TableCell>{franchisee.company_tax_id || "—"}</TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {franchisee.centres?.length || 0} centros
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {franchisee.user_roles?.length || 0} usuarios
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => openEditDialog(franchisee)}
                    title="Editar franchisee"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => navigate(`/admin?tab=centres&franchisee=${franchisee.id}`)}
                    title="Ver centros"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {franchisees.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No se encontraron franchisees
        </div>
      )}
    </Card>

    <CreateFranchiseeDialog
      open={createDialogOpen}
      onOpenChange={(open) => {
        setCreateDialogOpen(open);
        if (!open) loadFranchisees();
      }}
    />

    <EditFranchiseeDialog
      franchisee={selectedFranchisee}
      open={editDialogOpen}
      onOpenChange={(open) => {
        setEditDialogOpen(open);
        if (!open) loadFranchisees();
      }}
    />
  </>
  );
};

export default FranchiseesManagement;
