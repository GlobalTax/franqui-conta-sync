import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { upsertUserRole, revokeUserRole } from "@/lib/supabase-queries";
import { Trash2 } from "lucide-react";

interface EditUserDialogProps {
  user: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const EditUserDialog = ({ user, open, onOpenChange, onSuccess }: EditUserDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newRole, setNewRole] = useState("gestor");

  const handleAddRole = async () => {
    setLoading(true);
    try {
      const { error } = await upsertUserRole(user.id, newRole);
      if (error) throw error;

      toast({
        title: "Rol añadido",
        description: `Se ha añadido el rol ${newRole} al usuario`,
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRole = async (roleId: string) => {
    setLoading(true);
    try {
      const { error } = await revokeUserRole(roleId);
      if (error) throw error;

      toast({
        title: "Rol eliminado",
        description: "Se ha eliminado el rol del usuario",
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Editar Permisos: {user.nombre} {user.apellidos}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground">Email</Label>
            <p className="font-medium">{user.email}</p>
          </div>

          <div className="space-y-2">
            <Label>Roles Actuales</Label>
            <div className="flex flex-wrap gap-2">
              {user.user_roles?.map((role: any) => (
                <Badge key={role.id} variant="secondary" className="gap-2">
                  {role.role}
                  {role.centro && ` - ${role.centro}`}
                  <button
                    onClick={() => handleRemoveRole(role.id)}
                    className="ml-1 hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {(!user.user_roles || user.user_roles.length === 0) && (
                <span className="text-sm text-muted-foreground">Sin roles asignados</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Añadir Nuevo Rol</Label>
            <div className="flex gap-2">
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="gestor">Gestor</SelectItem>
                  <SelectItem value="franquiciado">Franquiciado</SelectItem>
                  <SelectItem value="asesoria">Asesoría</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleAddRole} disabled={loading}>
                Añadir Rol
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditUserDialog;
