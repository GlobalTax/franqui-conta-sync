import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getRolePermissions, updateRolePermission } from "@/lib/supabase-queries";
import { Loader2 } from "lucide-react";

const PERMISSION_CATEGORIES = {
  "Empleados": ["employees.view", "employees.create", "employees.edit", "employees.delete", "employees.export"],
  "Horarios": ["schedules.view", "schedules.create", "schedules.edit", "schedules.delete", "schedules.import"],
  "Nóminas": ["payrolls.view", "payrolls.create", "payrolls.edit", "payrolls.delete", "payrolls.import", "payrolls.export"],
  "Ausencias": ["absences.view", "absences.create", "absences.edit", "absences.delete"],
  "Centros": ["centres.view", "centres.edit", "centres.manage_users", "centres.manage_companies"],
  "Reportes": ["reports.view", "reports.export"],
  "Calidad de Datos": ["dq_issues.view", "dq_issues.resolve"],
  "Alertas": ["alerts.view", "alerts.create", "alerts.edit", "alerts.delete"],
  "Administración": ["users.manage", "roles.manage", "franchisees.manage", "settings.view", "settings.edit", "audit_logs.view"],
  "Importación": ["import.payrolls", "import.schedules", "import.employees", "import.absences"]
};

const PERMISSION_LABELS: Record<string, string> = {
  "employees.view": "Ver empleados",
  "employees.create": "Crear empleados",
  "employees.edit": "Editar empleados",
  "employees.delete": "Eliminar empleados",
  "employees.export": "Exportar empleados",
  "schedules.view": "Ver horarios",
  "schedules.create": "Crear horarios",
  "schedules.edit": "Editar horarios",
  "schedules.delete": "Eliminar horarios",
  "schedules.import": "Importar horarios",
  "payrolls.view": "Ver nóminas",
  "payrolls.create": "Crear nóminas",
  "payrolls.edit": "Editar nóminas",
  "payrolls.delete": "Eliminar nóminas",
  "payrolls.import": "Importar nóminas",
  "payrolls.export": "Exportar nóminas",
  "absences.view": "Ver ausencias",
  "absences.create": "Crear ausencias",
  "absences.edit": "Editar ausencias",
  "absences.delete": "Eliminar ausencias",
  "centres.view": "Ver centros",
  "centres.edit": "Editar centros",
  "centres.manage_users": "Gestionar usuarios de centros",
  "centres.manage_companies": "Gestionar sociedades",
  "reports.view": "Ver reportes",
  "reports.export": "Exportar reportes",
  "dq_issues.view": "Ver problemas de calidad",
  "dq_issues.resolve": "Resolver problemas de calidad",
  "alerts.view": "Ver alertas",
  "alerts.create": "Crear alertas",
  "alerts.edit": "Editar alertas",
  "alerts.delete": "Eliminar alertas",
  "users.manage": "Gestionar usuarios",
  "roles.manage": "Gestionar permisos",
  "franchisees.manage": "Gestionar franchisees",
  "settings.view": "Ver configuración",
  "settings.edit": "Editar configuración",
  "audit_logs.view": "Ver logs de auditoría",
  "import.payrolls": "Importar nóminas",
  "import.schedules": "Importar horarios",
  "import.employees": "Importar empleados",
  "import.absences": "Importar ausencias"
};

export function RolePermissionsEditor() {
  const [selectedRole, setSelectedRole] = useState<string>("gestor");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPermissions();
  }, [selectedRole]);

  const loadPermissions = async () => {
    setLoading(true);
    const { data, error } = await getRolePermissions(selectedRole);
    
    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los permisos",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    const permissionsMap: Record<string, boolean> = {};
    data?.forEach(p => {
      permissionsMap[p.permission] = p.granted;
    });
    setPermissions(permissionsMap);
    setLoading(false);
  };

  const handleTogglePermission = async (permission: string, granted: boolean) => {
    const newPermissions = { ...permissions, [permission]: granted };
    setPermissions(newPermissions);
  };

  const handleSave = async () => {
    setSaving(true);
    
    for (const [permission, granted] of Object.entries(permissions)) {
      const { error } = await updateRolePermission(selectedRole, permission, granted);
      if (error) {
        toast({
          title: "Error",
          description: `No se pudo actualizar el permiso ${permission}`,
          variant: "destructive"
        });
        setSaving(false);
        return;
      }
    }

    toast({
      title: "Guardado",
      description: "Los permisos se han actualizado correctamente"
    });
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permisos por Rol</CardTitle>
        <CardDescription>
          Configure los permisos base que tendrá cada rol en el sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Rol:</label>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="gestor">Gestor</SelectItem>
              <SelectItem value="franquiciado">Franquiciado</SelectItem>
              <SelectItem value="asesoria">Asesoría</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(PERMISSION_CATEGORIES).map(([category, perms]) => (
              <div key={category} className="space-y-3">
                <h3 className="font-semibold text-lg">{category}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-4">
                  {perms.map(perm => (
                    <div key={perm} className="flex items-center space-x-2">
                      <Checkbox
                        id={perm}
                        checked={permissions[perm] || false}
                        onCheckedChange={(checked) => 
                          handleTogglePermission(perm, checked as boolean)
                        }
                        disabled={selectedRole === "admin"}
                      />
                      <label
                        htmlFor={perm}
                        className="text-sm cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {PERMISSION_LABELS[perm] || perm}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button 
            variant="outline" 
            onClick={loadPermissions}
            disabled={saving}
          >
            Restaurar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saving || selectedRole === "admin"}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Cambios
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
