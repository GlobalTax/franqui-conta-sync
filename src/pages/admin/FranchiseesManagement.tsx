import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreateFranchiseeDialog } from "@/components/admin/CreateFranchiseeDialog";

const FranchiseesManagement = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [franchisees, setFranchisees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    loadFranchisees();
  }, []);

  const loadFranchisees = async () => {
    setLoading(true);
    
    try {
      const { data: franchiseesData, error } = await supabase
        .from("franchisees")
        .select("id, name, email")
        .order("name");

      if (error) throw error;

      const franchiseeIds = (franchiseesData || []).map((f: any) => f.id);

      if (franchiseeIds.length === 0) {
        setFranchisees([]);
        return;
      }

      // Cargar centros y sociedades
      const [centresResult, companiesResult] = await Promise.all([
        supabase.from("centres").select("franchisee_id").in("franchisee_id", franchiseeIds),
        supabase
          .from("centres")
          .select("franchisee_id, centre_companies!inner(razon_social, activo)")
          .in("franchisee_id", franchiseeIds)
          .eq("centre_companies.activo", true)
      ]);

      // Agrupar counts por franchisee_id
      const centresMap = new Map<string, number>();
      (centresResult.data || []).forEach((row: any) => {
        centresMap.set(row.franchisee_id, (centresMap.get(row.franchisee_id) || 0) + 1);
      });

      const companiesMap = new Map<string, string[]>();
      (companiesResult.data || []).forEach((row: any) => {
        const societies = companiesMap.get(row.franchisee_id) || [];
        if (row.centre_companies?.razon_social && !societies.includes(row.centre_companies.razon_social)) {
          societies.push(row.centre_companies.razon_social);
        }
        companiesMap.set(row.franchisee_id, societies);
      });

      // Recomponer con counts y sociedades
      const enrichedData = franchiseesData.map((f: any) => ({
        ...f,
        centres_count: centresMap.get(f.id) || 0,
        societies: companiesMap.get(f.id) || []
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
            <TableHead>Sociedades</TableHead>
            <TableHead>Centros</TableHead>
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
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {franchisee.societies?.length > 0 ? (
                    franchisee.societies.map((society: string, idx: number) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {society}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">Sin sociedades</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {franchisee.centres_count} centros
                </Badge>
              </TableCell>
              <TableCell>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => navigate(`/admin/franchisees/${franchisee.id}`)}
                  title="Ver detalles"
                >
                  <Eye className="h-4 w-4" />
                </Button>
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

  </>
  );
};

export default FranchiseesManagement;
