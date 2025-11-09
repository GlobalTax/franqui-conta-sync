import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function AdminDebug() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDebugInfo = async () => {
      console.log('[AdminDebug] 🔍 Iniciando diagnóstico completo...');
      
      const info: any = {
        timestamp: new Date().toISOString(),
        auth: {},
        role: {},
        errors: []
      };

      // 1. Verificar autenticación
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        info.auth = {
          authenticated: !!user,
          userId: user?.id || null,
          email: user?.email || null,
          error: userError?.message || null
        };
        console.log('[AdminDebug] 👤 Auth:', info.auth);
      } catch (error: any) {
        info.errors.push(`Auth error: ${error.message}`);
      }

      // 2. Verificar rol de admin
      if (info.auth.userId) {
        try {
          const { data, error } = await supabase.rpc('has_role', {
            _user_id: info.auth.userId,
            _role: 'admin'
          });
          
          info.role = {
            hasRole: data === true,
            result: data,
            error: error?.message || null
          };
          console.log('[AdminDebug] 🔐 Role check:', info.role);
        } catch (error: any) {
          info.errors.push(`Role check error: ${error.message}`);
        }

        // 3. Verificar user_roles directamente
        try {
          const { data: roles, error: rolesError } = await supabase
            .from('user_roles')
            .select('*')
            .eq('user_id', info.auth.userId);
          
          info.userRoles = {
            roles: roles || [],
            count: roles?.length || 0,
            error: rolesError?.message || null
          };
          console.log('[AdminDebug] 📋 User roles:', info.userRoles);
        } catch (error: any) {
          info.errors.push(`User roles query error: ${error.message}`);
        }
      }

      setDebugInfo(info);
      setLoading(false);
      console.log('[AdminDebug] ✅ Diagnóstico completo:', info);
    };

    loadDebugInfo();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Panel de Diagnóstico Admin</h1>
        <p className="text-muted-foreground">
          Información técnica sobre autenticación y permisos
        </p>
      </div>

      {/* Autenticación */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          {debugInfo?.auth?.authenticated ? (
            <CheckCircle2 className="h-5 w-5 text-success" />
          ) : (
            <XCircle className="h-5 w-5 text-destructive" />
          )}
          <h2 className="text-xl font-semibold">Estado de Autenticación</h2>
        </div>
        
        <div className="space-y-2 font-mono text-sm">
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-muted-foreground">Autenticado:</span>
            <Badge variant={debugInfo?.auth?.authenticated ? "default" : "destructive"}>
              {debugInfo?.auth?.authenticated ? "SÍ" : "NO"}
            </Badge>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-muted-foreground">User ID:</span>
            <code className="text-xs bg-muted px-2 py-1 rounded">
              {debugInfo?.auth?.userId || "null"}
            </code>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-muted-foreground">Email:</span>
            <span>{debugInfo?.auth?.email || "N/A"}</span>
          </div>
          {debugInfo?.auth?.error && (
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Error:</span>
              <span className="text-destructive text-xs">{debugInfo.auth.error}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Verificación de Rol */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          {debugInfo?.role?.hasRole ? (
            <CheckCircle2 className="h-5 w-5 text-success" />
          ) : (
            <XCircle className="h-5 w-5 text-destructive" />
          )}
          <h2 className="text-xl font-semibold">Verificación de Rol Admin</h2>
        </div>
        
        <div className="space-y-2 font-mono text-sm">
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-muted-foreground">has_role('admin'):</span>
            <Badge variant={debugInfo?.role?.hasRole ? "default" : "destructive"}>
              {debugInfo?.role?.hasRole ? "TRUE" : "FALSE"}
            </Badge>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-muted-foreground">Resultado raw:</span>
            <code className="text-xs bg-muted px-2 py-1 rounded">
              {JSON.stringify(debugInfo?.role?.result)}
            </code>
          </div>
          {debugInfo?.role?.error && (
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Error:</span>
              <span className="text-destructive text-xs">{debugInfo.role.error}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Roles directos de la tabla */}
      {debugInfo?.userRoles && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            {debugInfo.userRoles.count > 0 ? (
              <CheckCircle2 className="h-5 w-5 text-success" />
            ) : (
              <XCircle className="h-5 w-5 text-warning" />
            )}
            <h2 className="text-xl font-semibold">Roles en la Base de Datos</h2>
          </div>
          
          <div className="space-y-2 font-mono text-sm">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Total de roles:</span>
              <Badge>{debugInfo.userRoles.count}</Badge>
            </div>
            {debugInfo.userRoles.roles.length > 0 ? (
              <div className="mt-4">
                <p className="text-muted-foreground mb-2">Roles asignados:</p>
                <div className="space-y-2">
                  {debugInfo.userRoles.roles.map((role: any) => (
                    <div key={role.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                      <Badge variant="outline">{role.role}</Badge>
                      <code className="text-xs">{role.id}</code>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-warning mt-4">⚠️ No hay roles asignados a este usuario</p>
            )}
            {debugInfo.userRoles.error && (
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Error:</span>
                <span className="text-destructive text-xs">{debugInfo.userRoles.error}</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Errores generales */}
      {debugInfo?.errors && debugInfo.errors.length > 0 && (
        <Card className="p-6 border-destructive">
          <div className="flex items-center gap-2 mb-4">
            <XCircle className="h-5 w-5 text-destructive" />
            <h2 className="text-xl font-semibold text-destructive">Errores Detectados</h2>
          </div>
          <ul className="space-y-2">
            {debugInfo.errors.map((error: string, idx: number) => (
              <li key={idx} className="text-sm text-destructive font-mono">
                • {error}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Timestamp */}
      <div className="text-xs text-muted-foreground text-center">
        Diagnóstico generado: {debugInfo?.timestamp}
      </div>
    </div>
  );
}
