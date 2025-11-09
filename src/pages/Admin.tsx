import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield } from "lucide-react";
import UsersManagement from "./admin/UsersManagement";
import RolesManagement from "./admin/RolesManagement";
import FranchiseesManagement from "./admin/FranchiseesManagement";
import CompaniesManagement from "./admin/CompaniesManagement";
import CentresManagement from "./admin/CentresManagement";
import OrquestServicesManagement from "./admin/OrquestServicesManagement";
import PermissionsManagement from "./admin/PermissionsManagement";
import AlertsManagement from "./admin/AlertsManagement";
import DataQualityManagement from "./admin/DataQualityManagement";
import DataQualityDashboard from "./admin/DataQualityDashboard";
import FranchiseesDataQuality from "./admin/FranchiseesDataQuality";
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
        <TabsList className="grid w-full grid-cols-12">
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="franchisees">Franchisees</TabsTrigger>
          <TabsTrigger value="franchisees-dq">DQ Franchisees</TabsTrigger>
          <TabsTrigger value="companies">Sociedades</TabsTrigger>
          <TabsTrigger value="centres">Centros</TabsTrigger>
          <TabsTrigger value="orquest">Orquest</TabsTrigger>
          <TabsTrigger value="permissions">Permisos</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
          <TabsTrigger value="dq">Calidad</TabsTrigger>
          <TabsTrigger value="dq-dashboard">Dashboard DQ</TabsTrigger>
          <TabsTrigger value="audit">Auditoría</TabsTrigger>
          <TabsTrigger value="settings">Config</TabsTrigger>
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

        <TabsContent value="franchisees-dq" className="mt-6">
          <FranchiseesDataQuality />
        </TabsContent>

        <TabsContent value="companies" className="mt-6">
          <CompaniesManagement />
        </TabsContent>

        <TabsContent value="centres" className="mt-6">
          <CentresManagement />
        </TabsContent>

        <TabsContent value="orquest" className="mt-6">
          <OrquestServicesManagement />
        </TabsContent>

        <TabsContent value="permissions" className="mt-6">
          <PermissionsManagement />
        </TabsContent>

        <TabsContent value="alerts" className="mt-6">
          <AlertsManagement />
        </TabsContent>

        <TabsContent value="dq" className="mt-6">
          <DataQualityManagement />
        </TabsContent>

        <TabsContent value="dq-dashboard" className="mt-6">
          <DataQualityDashboard />
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
