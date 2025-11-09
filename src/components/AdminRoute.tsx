import { Navigate } from "react-router-dom";
import { useAdminCheck } from "@/hooks/useAdminCheck";

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAdminCheck();

  console.log('[AdminRoute] 🛡️ Estado:', { isAdmin, loading });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Verificando permisos de administrador...</p>
          <p className="mt-2 text-xs text-muted-foreground">Comprobando rol de admin...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    console.log('[AdminRoute] 🚫 Acceso denegado - Redirigiendo a /');
    return <Navigate to="/" replace />;
  }

  console.log('[AdminRoute] ✅ Acceso permitido');
  return <>{children}</>;
}
