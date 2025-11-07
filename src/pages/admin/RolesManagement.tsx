import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const RolesManagement = () => {
  const roles = [
    {
      role: "admin",
      icon: "🛡️",
      name: "Admin",
      description: "Acceso total al sistema sin restricciones",
      permissions: [
        "Gestionar usuarios y roles",
        "Acceso a todos los franchisees",
        "Acceso a todos los centros",
        "Todas las operaciones CRUD",
        "Configuración del sistema",
        "Ver logs de auditoría"
      ]
    },
    {
      role: "gestor",
      icon: "👔",
      name: "Gestor",
      description: "Administra centros asignados",
      permissions: [
        "CRUD en sus centros asignados",
        "Ver reportes de sus centros",
        "Importar datos",
        "Gestionar empleados de sus centros"
      ]
    },
    {
      role: "franquiciado",
      icon: "🍔",
      name: "Franquiciado",
      description: "Propietario del negocio",
      permissions: [
        "Ver todos sus centros",
        "Ver reportes y métricas",
        "Solo lectura de datos",
        "Exportar información"
      ]
    },
    {
      role: "asesoria",
      icon: "📊",
      name: "Asesoría",
      description: "Consultor externo",
      permissions: [
        "Solo lectura global",
        "Ver reportes",
        "Exportar datos",
        "Sin capacidad de modificación"
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Matriz de Permisos por Rol</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rol</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Permisos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.role}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{role.icon}</span>
                    <div>
                      <div className="font-semibold">{role.name}</div>
                      <Badge variant="outline" className="mt-1">
                        {role.role}
                      </Badge>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                </TableCell>
                <TableCell>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {role.permissions.map((permission, idx) => (
                      <li key={idx}>{permission}</li>
                    ))}
                  </ul>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Políticas RLS Activas</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Todas las tablas están protegidas con Row Level Security (RLS) que valida permisos a nivel de servidor.
        </p>
        <div className="space-y-2 text-sm">
          <div className="p-3 bg-muted rounded-md">
            <strong>Función has_role():</strong> Valida roles del usuario de forma segura usando SECURITY DEFINER
          </div>
          <div className="p-3 bg-muted rounded-md">
            <strong>Vista v_user_centres:</strong> Determina qué centros puede acceder cada usuario según sus roles
          </div>
          <div className="p-3 bg-muted rounded-md">
            <strong>Auditoría automática:</strong> Todos los cambios en user_roles se registran en audit_logs
          </div>
        </div>
      </Card>
    </div>
  );
};

export default RolesManagement;
