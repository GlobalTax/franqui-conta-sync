import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const CentresManagement = () => {
  const { toast } = useToast();
  const [centres, setCentres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCentres();
  }, []);

  const loadCentres = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("centres")
      .select(`
        *,
        franchisees(name),
        user_roles:user_roles(count)
      `)
      .eq("activo", true)
      .order("nombre");

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los centros",
        variant: "destructive",
      });
    } else {
      setCentres(data || []);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="text-center py-8">Cargando centros...</div>;
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Gestión de Centros</h3>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Franchisee</TableHead>
            <TableHead>Ciudad</TableHead>
            <TableHead>Usuarios</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {centres.map((centre) => (
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
                  {centre.user_roles?.[0]?.count || 0} usuarios
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={centre.activo ? "default" : "destructive"}>
                  {centre.activo ? "Activo" : "Inactivo"}
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

      {centres.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No se encontraron centros
        </div>
      )}
    </Card>
  );
};

export default CentresManagement;
