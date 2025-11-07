import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

const SystemSettings = () => {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Seguridad</h3>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="session-duration">Duración de sesión (minutos)</Label>
            <Input id="session-duration" type="number" defaultValue="60" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="invite-expiry">Expiración de invitaciones (días)</Label>
            <Input id="invite-expiry" type="number" defaultValue="7" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="max-attempts">Intentos máximos de login</Label>
            <Input id="max-attempts" type="number" defaultValue="5" />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Notificaciones</h3>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="notification-email">Email de notificaciones del sistema</Label>
            <Input id="notification-email" type="email" placeholder="admin@example.com" />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Alertas de cambios de permisos</Label>
              <div className="text-sm text-muted-foreground">
                Notificar cuando se modifiquen roles de usuarios
              </div>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Alertas de nuevos usuarios</Label>
              <div className="text-sm text-muted-foreground">
                Notificar cuando se registren nuevos usuarios
              </div>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Organización</h3>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="org-name">Nombre de la organización</Label>
            <Input id="org-name" defaultValue="FranquiContaSync" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="timezone">Zona horaria</Label>
            <Input id="timezone" defaultValue="Europe/Madrid" />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Integraciones</h3>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Configuración Orquest API</Label>
            <div className="text-sm text-muted-foreground">
              Configurado correctamente ✓
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Configuración A3Nom</Label>
            <div className="text-sm text-muted-foreground">
              Pendiente de configurar
            </div>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button>Guardar Configuración</Button>
      </div>
    </div>
  );
};

export default SystemSettings;
