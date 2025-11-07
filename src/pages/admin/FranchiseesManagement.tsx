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
    const { data, error } = await supabase
      .from("franchisees")
      .select(`
        *,
        centres:centres(count),
        user_roles:user_roles(count)
      `)
      .order("name");

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los franchisees",
        variant: "destructive",
      });
    } else {
      setFranchisees(data || []);
    }
    setLoading(false);
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
