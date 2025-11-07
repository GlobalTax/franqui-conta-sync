import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getRolePermissions } from "@/lib/supabase-queries";
import { Loader2 } from "lucide-react";

const ROLES = ["admin", "gestor", "franquiciado", "asesoria"];

const PERMISSION_LABELS: Record<string, string> = {
  "employees.view": "Ver empleados",
  "employees.create": "Crear empleados",
  "employees.edit": "Editar empleados",
  "employees.delete": "Eliminar empleados",
  "schedules.view": "Ver horarios",
  "schedules.create": "Crear horarios",
  "schedules.edit": "Editar horarios",
  "payrolls.view": "Ver nóminas",
  "payrolls.import": "Importar nóminas",
  "payrolls.export": "Exportar nóminas",
  "absences.view": "Ver ausencias",
  "absences.create": "Crear ausencias",
  "centres.view": "Ver centros",
  "centres.edit": "Editar centros",
  "reports.view": "Ver reportes",
  "reports.export": "Exportar reportes",
  "dq_issues.view": "Ver problemas DQ",
  "dq_issues.resolve": "Resolver problemas DQ",
  "users.manage": "Gestionar usuarios",
  "roles.manage": "Gestionar permisos",
  "settings.edit": "Editar configuración"
};

const KEY_PERMISSIONS = Object.keys(PERMISSION_LABELS);

export function PermissionsMatrix() {
  const [permissionsMatrix, setPermissionsMatrix] = useState<Record<string, Record<string, boolean>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    setLoading(true);
    const matrix: Record<string, Record<string, boolean>> = {};

    for (const role of ROLES) {
      const { data } = await getRolePermissions(role);
      matrix[role] = {};
      data?.forEach(p => {
        matrix[role][p.permission] = p.granted;
      });
    }

    setPermissionsMatrix(matrix);
    setLoading(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Matriz de Permisos</CardTitle>
        <CardDescription>
          Vista consolidada de todos los permisos por rol
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Permiso</TableHead>
                {ROLES.map(role => (
                  <TableHead key={role} className="text-center">
                    <Badge variant="outline" className="capitalize">
                      {role}
                    </Badge>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {KEY_PERMISSIONS.map(permission => (
                <TableRow key={permission}>
                  <TableCell className="font-medium">
                    {PERMISSION_LABELS[permission] || permission}
                    <div className="text-xs text-muted-foreground font-mono">
                      {permission}
                    </div>
                  </TableCell>
                  {ROLES.map(role => (
                    <TableCell key={role} className="text-center">
                      {permissionsMatrix[role]?.[permission] ? (
                        <span className="text-green-600 font-bold text-xl">✓</span>
                      ) : (
                        <span className="text-red-600 font-bold text-xl">✗</span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
