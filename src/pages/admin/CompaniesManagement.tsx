import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFranchisees } from "@/hooks/useFranchisees";

interface Company {
  id: string;
  cif: string;
  razon_social: string;
  tipo_sociedad: string;
  franchisee_id: string;
  activo: boolean;
  franchisee?: {
    name: string;
  };
}

const CompaniesManagement = () => {
  const { toast } = useToast();
  const { data: franchisees } = useFranchisees();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({
    cif: "",
    razon_social: "",
    tipo_sociedad: "SL",
    franchisee_id: "",
    activo: true,
  });

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("companies")
        .select(`
          *,
          franchisees:franchisee_id (
            name
          )
        `)
        .order("razon_social");

      if (error) throw error;

      setCompanies(data || []);
    } catch (err: any) {
      console.error("Error loading companies:", err);
      toast({
        title: "Error",
        description: "No se pudieron cargar las sociedades mercantiles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingCompany(null);
    setFormData({
      cif: "",
      razon_social: "",
      tipo_sociedad: "SL",
      franchisee_id: "",
      activo: true,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      cif: company.cif,
      razon_social: company.razon_social,
      tipo_sociedad: company.tipo_sociedad,
      franchisee_id: company.franchisee_id,
      activo: company.activo,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingCompany) {
        // Update
        const { error } = await supabase
          .from("companies")
          .update({
            cif: formData.cif,
            razon_social: formData.razon_social,
            tipo_sociedad: formData.tipo_sociedad,
            franchisee_id: formData.franchisee_id,
            activo: formData.activo,
          })
          .eq("id", editingCompany.id);

        if (error) throw error;

        toast({
          title: "Éxito",
          description: "Sociedad mercantil actualizada correctamente",
        });
      } else {
        // Create
        const { error } = await supabase.from("companies").insert({
          cif: formData.cif,
          razon_social: formData.razon_social,
          tipo_sociedad: formData.tipo_sociedad,
          franchisee_id: formData.franchisee_id,
          activo: formData.activo,
        });

        if (error) throw error;

        toast({
          title: "Éxito",
          description: "Sociedad mercantil creada correctamente",
        });
      }

      setDialogOpen(false);
      loadCompanies();
    } catch (err: any) {
      console.error("Error saving company:", err);
      toast({
        title: "Error",
        description: err.message || "No se pudo guardar la sociedad mercantil",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta sociedad?")) return;

    try {
      const { error } = await supabase.from("companies").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Sociedad mercantil eliminada correctamente",
      });

      loadCompanies();
    } catch (err: any) {
      console.error("Error deleting company:", err);
      toast({
        title: "Error",
        description: err.message || "No se pudo eliminar la sociedad mercantil",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Cargando sociedades mercantiles...</div>;
  }

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-primary" />
            <div>
              <h3 className="text-lg font-semibold">Sociedades Mercantiles</h3>
              <p className="text-sm text-muted-foreground">
                Gestiona las sociedades mercantiles asociadas a cada franquiciado
              </p>
            </div>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Sociedad
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>CIF</TableHead>
              <TableHead>Razón Social</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Franquiciado</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((company) => (
              <TableRow key={company.id}>
                <TableCell className="font-mono text-sm">{company.cif}</TableCell>
                <TableCell className="font-medium">{company.razon_social}</TableCell>
                <TableCell>
                  <Badge variant="outline">{company.tipo_sociedad}</Badge>
                </TableCell>
                <TableCell>
                  {company.franchisee?.name || "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={company.activo ? "default" : "secondary"}>
                    {company.activo ? "Activa" : "Inactiva"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditDialog(company)}
                      title="Editar sociedad"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(company.id)}
                      title="Eliminar sociedad"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {companies.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No se encontraron sociedades mercantiles
          </div>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCompany ? "Editar Sociedad Mercantil" : "Nueva Sociedad Mercantil"}
            </DialogTitle>
            <DialogDescription>
              {editingCompany
                ? "Modifica los datos de la sociedad mercantil"
                : "Crea una nueva sociedad mercantil y asóciala a un franquiciado"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="franchisee_id">Franquiciado *</Label>
              <Select
                value={formData.franchisee_id}
                onValueChange={(value) => setFormData({ ...formData, franchisee_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar franquiciado" />
                </SelectTrigger>
                <SelectContent>
                  {franchisees?.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="cif">CIF *</Label>
              <Input
                id="cif"
                value={formData.cif}
                onChange={(e) => setFormData({ ...formData, cif: e.target.value.toUpperCase() })}
                placeholder="A12345678"
              />
            </div>

            <div>
              <Label htmlFor="razon_social">Razón Social *</Label>
              <Input
                id="razon_social"
                value={formData.razon_social}
                onChange={(e) => setFormData({ ...formData, razon_social: e.target.value })}
                placeholder="Mi Empresa S.L."
              />
            </div>

            <div>
              <Label htmlFor="tipo_sociedad">Tipo de Sociedad *</Label>
              <Select
                value={formData.tipo_sociedad}
                onValueChange={(value) => setFormData({ ...formData, tipo_sociedad: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SL">SL - Sociedad Limitada</SelectItem>
                  <SelectItem value="SA">SA - Sociedad Anónima</SelectItem>
                  <SelectItem value="SLU">SLU - Sociedad Limitada Unipersonal</SelectItem>
                  <SelectItem value="AUTONOMO">Autónomo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingCompany ? "Guardar Cambios" : "Crear Sociedad"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CompaniesManagement;
