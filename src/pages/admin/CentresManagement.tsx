import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreateCentreDialog } from "@/components/admin/CreateCentreDialog";
import { logger } from "@/lib/logger";

const CentresManagement = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [centres, setCentres] = useState<any[]>([]);
  const [filteredCentres, setFilteredCentres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [centres, searchTerm]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("centres")
        .select("id, site_number, codigo, nombre, direccion, activo")
        .order("nombre");

      if (error) throw error;

      setCentres(data || []);
    } catch (error: any) {
      logger.error('CentresManagement', 'Error al cargar datos:', error?.message);
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

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.nombre?.toLowerCase().includes(term) ||
        c.direccion?.toLowerCase().includes(term) ||
        c.site_number?.toLowerCase().includes(term)
      );
    }

    setFilteredCentres(filtered);
  };

  if (loading) {
    return <div className="text-center py-8">Cargando centros...</div>;
  }

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Gestión de Centros</h3>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Centro
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <Input
            placeholder="Buscar por nombre, dirección o site..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Site</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Dirección</TableHead>
                <TableHead className="w-20">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCentres.map((centre) => (
                <TableRow key={centre.id}>
                  <TableCell>
                    <Badge variant="outline">{centre.site_number || centre.codigo}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{centre.nombre}</div>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <div className="text-sm text-muted-foreground truncate">
                      {centre.direccion || "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      title="Ver detalles"
                      onClick={() => navigate(`/admin/centros/${centre.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
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

      <CreateCentreDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) loadData();
        }}
      />
    </>
  );
};

export default CentresManagement;
