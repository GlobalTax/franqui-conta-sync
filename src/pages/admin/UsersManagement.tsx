import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Search, Edit, Users, Send } from "lucide-react";
import { getAllUsersWithRoles } from "@/lib/supabase-queries";
import { useToast } from "@/hooks/use-toast";
import InviteUserDialog from "@/components/admin/InviteUserDialog";
import EditUserDialog from "@/components/admin/EditUserDialog";
import PendingInvitesTable from "@/components/admin/PendingInvitesTable";

const UsersManagement = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [inviteRefreshKey, setInviteRefreshKey] = useState(0);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const { data, error } = await getAllUsersWithRoles();
    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive",
      });
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const handleInviteSuccess = () => {
    loadUsers();
    setInviteRefreshKey(k => k + 1);
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.apellidos?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === "all" || 
      user.user_roles?.some((r: any) => r.role === roleFilter);

    return matchesSearch && matchesRole;
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "default";
      case "gestor": return "secondary";
      case "franquiciado": return "outline";
      case "empleado": return "secondary";
      default: return "outline";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin": return "🛡️";
      case "gestor": return "👔";
      case "franquiciado": return "🍔";
      case "empleado": return "👤";
      default: return "❓";
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="users" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Usuarios
            </TabsTrigger>
            <TabsTrigger value="invites" className="gap-2">
              <Send className="h-4 w-4" />
              Invitaciones
            </TabsTrigger>
          </TabsList>
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invitar Usuario
          </Button>
        </div>

        <TabsContent value="users">
          <Card className="p-6">
            <div className="flex gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los roles</SelectItem>
                  <SelectItem value="admin">Asesoría (Admin)</SelectItem>
                  <SelectItem value="gestor">Gestor</SelectItem>
                  <SelectItem value="franquiciado">Franquiciado</SelectItem>
                  <SelectItem value="empleado">Empleado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="text-center py-8">Cargando usuarios...</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="font-medium">
                            {user.nombre} {user.apellidos}
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <div className="flex gap-2 flex-wrap items-center">
                            {(() => {
                              const roles = user.user_roles || [];
                              if (roles.length === 0) return <span className="text-muted-foreground">Sin roles</span>;
                              const grouped: Record<string, any[]> = {};
                              roles.forEach((r: any) => {
                                if (!grouped[r.role]) grouped[r.role] = [];
                                grouped[r.role].push(r);
                              });
                              return Object.entries(grouped).map(([role, items]) => {
                                const hasCentres = items.some((i: any) => i.centro || i.centres);
                                return (
                                  <Badge key={role} variant={getRoleBadgeVariant(role)}>
                                    {getRoleIcon(role)} {role}
                                    {hasCentres && ` (${items.length} centros)`}
                                  </Badge>
                                );
                              });
                            })()}
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setEditUser(user)}>
                              Ver detalle
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditUser(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {filteredUsers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No se encontraron usuarios
                  </div>
                )}
              </>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="invites">
          <Card className="p-6">
            <PendingInvitesTable refreshKey={inviteRefreshKey} />
          </Card>
        </TabsContent>
      </Tabs>

      <InviteUserDialog 
        open={inviteOpen} 
        onOpenChange={setInviteOpen}
        onSuccess={handleInviteSuccess}
      />

      {editUser && (
        <EditUserDialog
          user={editUser}
          open={!!editUser}
          onOpenChange={(open) => !open && setEditUser(null)}
          onSuccess={loadUsers}
        />
      )}
    </div>
  );
};

export default UsersManagement;
