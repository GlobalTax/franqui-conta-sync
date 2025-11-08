import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useUpdateCentre } from "@/hooks/useCentres";
import { useFranchisees } from "@/hooks/useFranchisees";

interface EditCentreDialogProps {
  centre: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditCentreDialog = ({ centre, open, onOpenChange }: EditCentreDialogProps) => {
  const { data: franchisees } = useFranchisees();
  const updateCentre = useUpdateCentre();
  
  const [formData, setFormData] = useState({
    id: "",
    nombre: "",
    franchisee_id: "",
    direccion: "",
    ciudad: "",
    state: "",
    postal_code: "",
    pais: "",
    opening_date: "",
    seating_capacity: "",
    square_meters: "",
    site_number: "",
    activo: true,
  });

  useEffect(() => {
    if (centre) {
      setFormData({
        id: centre.id,
        nombre: centre.nombre || "",
        franchisee_id: centre.franchisee_id || "",
        direccion: centre.direccion || "",
        ciudad: centre.ciudad || "",
        state: centre.state || "",
        postal_code: centre.postal_code || "",
        pais: centre.pais || "España",
        opening_date: centre.opening_date || "",
        seating_capacity: centre.seating_capacity?.toString() || "",
        square_meters: centre.square_meters?.toString() || "",
        site_number: centre.site_number || "",
        activo: centre.activo,
      });
    }
  }, [centre]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const dataToSubmit = {
      id: formData.id,
      nombre: formData.nombre,
      franchisee_id: formData.franchisee_id,
      direccion: formData.direccion,
      ciudad: formData.ciudad,
      state: formData.state,
      postal_code: formData.postal_code,
      pais: formData.pais,
      seating_capacity: formData.seating_capacity ? parseInt(formData.seating_capacity) : null,
      square_meters: formData.square_meters ? parseFloat(formData.square_meters) : null,
      opening_date: formData.opening_date || null,
      site_number: formData.site_number,
      activo: formData.activo,
    };
    
    updateCentre.mutate(dataToSubmit, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  if (!centre) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Centro: {centre.codigo}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Código</Label>
            <Input value={centre.codigo} disabled className="bg-muted" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="franchisee_id">Franchisee *</Label>
              <Select value={formData.franchisee_id} onValueChange={(value) => setFormData({ ...formData, franchisee_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar franchisee" />
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="direccion">Dirección</Label>
            <Input
              id="direccion"
              value={formData.direccion}
              onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ciudad">Ciudad</Label>
              <Input
                id="ciudad"
                value={formData.ciudad}
                onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">Provincia</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="postal_code">Código Postal</Label>
              <Input
                id="postal_code"
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pais">País</Label>
              <Input
                id="pais"
                value={formData.pais}
                onChange={(e) => setFormData({ ...formData, pais: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="site_number">Site Number</Label>
              <Input
                id="site_number"
                value={formData.site_number}
                onChange={(e) => setFormData({ ...formData, site_number: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="opening_date">Fecha Apertura</Label>
              <Input
                id="opening_date"
                type="date"
                value={formData.opening_date}
                onChange={(e) => setFormData({ ...formData, opening_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="seating_capacity">Capacidad (asientos)</Label>
              <Input
                id="seating_capacity"
                type="number"
                min="0"
                value={formData.seating_capacity}
                onChange={(e) => setFormData({ ...formData, seating_capacity: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="square_meters">Metros Cuadrados</Label>
              <Input
                id="square_meters"
                type="number"
                min="0"
                step="0.01"
                value={formData.square_meters}
                onChange={(e) => setFormData({ ...formData, square_meters: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="activo"
              checked={formData.activo}
              onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
            />
            <Label htmlFor="activo">Centro activo</Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateCentre.isPending}>
              {updateCentre.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
