import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield } from "lucide-react";
import UsersManagement from "./admin/UsersManagement";
import RolesManagement from "./admin/RolesManagement";
import FranchiseesManagement from "./admin/FranchiseesManagement";
import CentresManagement from "./admin/CentresManagement";
import AuditLog from "./admin/AuditLog";
import SystemSettings from "./admin/SystemSettings";

const Admin = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Panel de Administración</h1>
          <p className="text-muted-foreground">Gestión completa de usuarios, roles y configuración</p>
        </div>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="franchisees">Franchisees</TabsTrigger>
          <TabsTrigger value="centres">Centros</TabsTrigger>
          <TabsTrigger value="audit">Auditoría</TabsTrigger>
          <TabsTrigger value="settings">Configuración</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <UsersManagement />
        </TabsContent>

        <TabsContent value="roles" className="mt-6">
          <RolesManagement />
        </TabsContent>

        <TabsContent value="franchisees" className="mt-6">
          <FranchiseesManagement />
        </TabsContent>

        <TabsContent value="centres" className="mt-6">
          <CentresManagement />
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <AuditLog />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <SystemSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
