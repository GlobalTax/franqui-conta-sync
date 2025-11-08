import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const FranchiseesManagement = () => {
  const { toast } = useToast();
  const [franchisees, setFranchisees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFranchisees();
  }, []);

  const loadFranchisees = async () => {
    setLoading(true);
    
    try {
      // Intento principal con aggregates
      const { data, error } = await supabase
        .from("franchisees")
        .select(`
          *,
          centres:centres(count),
          user_roles:user_roles(count)
        `)
        .order("name");

      if (error && (error.code === 'PGRST200' || error.message?.includes('embedding'))) {
        console.warn("Falling back to simple franchisees query", error);
        
        // Fallback: cargar sin aggregates
        const simpleResult = await supabase
          .from("franchisees")
          .select("*")
          .order("name");
        
        if (simpleResult.error) throw simpleResult.error;
        
        // Cargar counts por separado
        const franchiseeIds = (simpleResult.data || []).map((f: any) => f.id);
        
        const [centresCount, rolesCount] = await Promise.all([
          supabase.from("centres").select("franchisee_id", { count: 'exact', head: true }).in("franchisee_id", franchiseeIds),
          supabase.from("user_roles").select("franchisee_id", { count: 'exact', head: true }).in("franchisee_id", franchiseeIds)
        ]);
        
        // Recomponer (simplificado, solo totales)
        const enrichedData = (simpleResult.data || []).map((f: any) => ({
          ...f,
          centres: [{ count: centresCount.count || 0 }],
          user_roles: [{ count: rolesCount.count || 0 }]
        }));
        
        setFranchisees(enrichedData);
      } else if (error) {
        throw error;
      } else {
        setFranchisees(data || []);
      }
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
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Gestión de Franchisees</h3>
      
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
                  <Button size="sm" variant="ghost">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Users className="h-4 w-4" />
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
  );
};

export default FranchiseesManagement;
