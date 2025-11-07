import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RolePermissionsEditor } from "@/components/admin/RolePermissionsEditor";
import { UserCustomPermissions } from "@/components/admin/UserCustomPermissions";
import { PermissionsMatrix } from "@/components/admin/PermissionsMatrix";

export default function PermissionsManagement() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestión de Permisos</h1>
        <p className="text-muted-foreground">
          Configure permisos granulares por rol y usuario
        </p>
      </div>

      <Tabs defaultValue="roles" className="space-y-6">
        <TabsList>
          <TabsTrigger value="roles">Permisos por Rol</TabsTrigger>
          <TabsTrigger value="users">Permisos Customizados</TabsTrigger>
          <TabsTrigger value="matrix">Matriz de Permisos</TabsTrigger>
        </TabsList>

        <TabsContent value="roles">
          <RolePermissionsEditor />
        </TabsContent>

        <TabsContent value="users">
          <UserCustomPermissions />
        </TabsContent>

        <TabsContent value="matrix">
          <PermissionsMatrix />
        </TabsContent>
      </Tabs>
    </div>
  );
}
