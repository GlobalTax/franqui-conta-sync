import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCentreUsers, getAllUsers, addUserToCentre, updateUserRole, revokeUserFromCentre } from "@/lib/supabase-queries";

interface Centre {
  id: string;
  codigo: string;
  nombre: string;
  franchisee_id?: string;
}

interface Props {
  centre: Centre | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export function ManageRestaurantUsersDialog({ centre, open, onOpenChange, onUpdate }: Props) {
  const { toast } = useToast();
  const [centreUsers, setCentreUsers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("gestor");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && centre) {
      loadData();
    }
  }, [open, centre]);

  const loadData = async () => {
    if (!centre) return;
    
    setLoading(true);
    try {
      const [users, allUsersList] = await Promise.all([
        getCentreUsers(centre.codigo),
        getAllUsers()
      ]);
      setCentreUsers(users);
      setAllUsers(allUsersList);
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

  const handleAddUser = async () => {
    if (!selectedUserId || !centre) return;

    setLoading(true);
    try {
      await addUserToCentre(selectedUserId, selectedRole, centre.codigo, centre.franchisee_id);
      toast({
        title: "Usuario añadido",
        description: "El usuario ha sido asignado al centro correctamente",
      });
      setSelectedUserId("");
      loadData();
      onUpdate?.();
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

  const handleRevokeUser = async (userRoleId: string) => {
    setLoading(true);
    try {
      await revokeUserFromCentre(userRoleId);
      toast({
        title: "Acceso revocado",
        description: "El usuario ya no tiene acceso a este centro",
      });
      loadData();
      onUpdate?.();
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

  const handleChangeRole = async (userRoleId: string, newRole: string) => {
    setLoading(true);
    try {
      await updateUserRole(userRoleId, newRole);
      toast({
        title: "Rol actualizado",
        description: "El rol del usuario ha sido actualizado correctamente",
      });
      loadData();
      onUpdate?.();
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

  const availableUsers = allUsers.filter(
    user => !centreUsers.some(cu => cu.profiles.id === user.id)
  );

  if (!centre) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            👥 Usuarios con acceso: {centre.nombre}
            <div className="text-sm font-normal text-muted-foreground">
              Código: {centre.codigo}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Users */}
          <div>
            <h4 className="font-medium mb-3">Usuarios Actuales ({centreUsers.length})</h4>
            {centreUsers.length === 0 ? (
              <p className="text-muted-foreground text-sm">No hay usuarios asignados</p>
            ) : (
              <div className="space-y-2">
                {centreUsers.map((userRole) => (
                  <div key={userRole.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">
                        {userRole.profiles.nombre} {userRole.profiles.apellidos}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {userRole.profiles.email}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={userRole.role}
                        onValueChange={(value) => handleChangeRole(userRole.id, value)}
                        disabled={loading}
                      >
                        <SelectTrigger className="w-[150px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gestor">Gestor</SelectItem>
                          <SelectItem value="franquiciado">Franquiciado</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRevokeUser(userRole.id)}
                        disabled={loading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New User */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Añadir Nuevo Usuario</h4>
            <div className="flex gap-2">
              <Select
                value={selectedUserId}
                onValueChange={setSelectedUserId}
                disabled={loading || availableUsers.length === 0}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Seleccionar usuario..." />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.nombre} {user.apellidos} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedRole}
                onValueChange={setSelectedRole}
                disabled={loading}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gestor">Gestor</SelectItem>
                  <SelectItem value="franquiciado">Franquiciado</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleAddUser}
                disabled={!selectedUserId || loading}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Añadir
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
