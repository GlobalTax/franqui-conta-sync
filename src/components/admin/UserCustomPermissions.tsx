import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getAllUsers, getUserCustomPermissions, addCustomPermission, revokeCustomPermission } from "@/lib/supabase-queries";
import { Loader2, Trash2, Plus } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const PERMISSION_OPTIONS = [
  "employees.delete",
  "payrolls.delete",
  "schedules.delete",
  "absences.delete",
  "centres.edit",
  "centres.manage_users",
  "centres.manage_companies",
  "settings.edit",
  "users.manage",
  "roles.manage"
];

export function UserCustomPermissions() {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [customPermissions, setCustomPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newPermission, setNewPermission] = useState("");
  const [newGranted, setNewGranted] = useState<"true" | "false">("true");
  const [newNotes, setNewNotes] = useState("");
  const [newCentro, setNewCentro] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      loadCustomPermissions();
    }
  }, [selectedUser]);

  const loadUsers = async () => {
    const data = await getAllUsers();
    setUsers(data);
  };

  const loadCustomPermissions = async () => {
    if (!selectedUser) return;
    
    setLoading(true);
    const { data, error } = await getUserCustomPermissions(selectedUser);
    
    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los permisos customizados",
        variant: "destructive"
      });
    } else {
      setCustomPermissions(data || []);
    }
    setLoading(false);
  };

  const handleAddPermission = async () => {
    if (!selectedUser || !newPermission || !newCentro) {
      toast({
        title: "Error",
        description: "Complete todos los campos requeridos",
        variant: "destructive"
      });
      return;
    }

    const { error } = await addCustomPermission(
      selectedUser,
      newCentro,
      newPermission,
      newGranted === "true",
      newNotes
    );

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo añadir el permiso customizado",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Éxito",
        description: "Permiso customizado añadido"
      });
      setNewPermission("");
      setNewGranted("true");
      setNewNotes("");
      setNewCentro("");
      loadCustomPermissions();
    }
  };

  const handleRevokePermission = async (permissionId: string) => {
    const { error } = await revokeCustomPermission(permissionId);
    
    if (error) {
      toast({
        title: "Error",
        description: "No se pudo revocar el permiso",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Éxito",
        description: "Permiso revocado"
      });
      loadCustomPermissions();
    }
  };

  const selectedUserData = users.find(u => u.id === selectedUser);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permisos Customizados por Usuario</CardTitle>
        <CardDescription>
          Configure permisos específicos para usuarios individuales en centros determinados
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Usuario:</label>
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar usuario..." />
            </SelectTrigger>
            <SelectContent>
              {users.map(user => (
                <SelectItem key={user.id} value={user.id}>
                  {user.nombre} {user.apellidos} ({user.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedUser && (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <>
                {customPermissions.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold">Permisos Customizados Actuales:</h3>
                    <div className="space-y-2">
                      {customPermissions.map(perm => (
                        <div key={perm.id} className="flex items-start justify-between p-4 border rounded-lg">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={perm.granted ? "default" : "destructive"}>
                                {perm.granted ? "✓ Permitido" : "✗ Denegado"}
                              </Badge>
                              <span className="font-mono text-sm">{perm.permission}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">Centro: {perm.centro}</p>
                            {perm.notes && (
                              <p className="text-sm text-muted-foreground italic">"{perm.notes}"</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Creado: {new Date(perm.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRevokePermission(perm.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-semibold">Añadir Permiso Customizado:</h3>
                  
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label>Centro (código):</Label>
                      <Input
                        placeholder="Ej: 54322"
                        value={newCentro}
                        onChange={(e) => setNewCentro(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Permiso:</Label>
                      <Select value={newPermission} onValueChange={setNewPermission}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar permiso..." />
                        </SelectTrigger>
                        <SelectContent>
                          {PERMISSION_OPTIONS.map(perm => (
                            <SelectItem key={perm} value={perm}>
                              {perm}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Acción:</Label>
                      <RadioGroup value={newGranted} onValueChange={(v) => setNewGranted(v as "true" | "false")}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="true" id="grant" />
                          <Label htmlFor="grant">Permitir</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="false" id="deny" />
                          <Label htmlFor="deny">Denegar</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="space-y-2">
                      <Label>Nota (opcional):</Label>
                      <Textarea
                        placeholder="Razón del permiso customizado..."
                        value={newNotes}
                        onChange={(e) => setNewNotes(e.target.value)}
                      />
                    </div>

                    <Button onClick={handleAddPermission} className="w-full">
                      <Plus className="mr-2 h-4 w-4" />
                      Añadir Permiso Customizado
                    </Button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
