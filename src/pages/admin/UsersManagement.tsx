import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Search, Edit, Eye } from "lucide-react";
import { getAllUsersWithRoles } from "@/lib/supabase-queries";
import { useToast } from "@/hooks/use-toast";
import InviteUserDialog from "@/components/admin/InviteUserDialog";
import EditUserDialog from "@/components/admin/EditUserDialog";

const UsersManagement = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);

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
      default: return "outline";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin": return "🛡️";
      case "gestor": return "👔";
      case "franquiciado": return "🍔";
      case "asesoria": return "📊";
      default: return "👤";
    }
  };

  if (loading) {
    return <div className="text-center py-8">Cargando usuarios...</div>;
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-4 flex-1">
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
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="gestor">Gestor</SelectItem>
                <SelectItem value="franquiciado">Franquiciado</SelectItem>
                <SelectItem value="asesoria">Asesoría</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invitar Usuario
          </Button>
        </div>

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
      </Card>

      <InviteUserDialog 
        open={inviteOpen} 
        onOpenChange={setInviteOpen}
        onSuccess={loadUsers}
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
