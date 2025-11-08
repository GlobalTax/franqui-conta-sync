import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  FileText,
  CreditCard,
  GitCompare,
  TrendingUp,
  Settings,
  LogOut,
  BookOpen,
  FileSpreadsheet,
  Shield,
  Building2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminCheck } from "@/hooks/useAdminCheck";

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { isAdmin } = useAdminCheck();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión correctamente",
    });
    navigate("/login");
  };

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    { icon: FileText, label: "Fact. Recibidas", path: "/invoices" },
    { icon: FileText, label: "Fact. Emitidas", path: "/facturas/emitidas" },
    { icon: Building2, label: "Proveedores", path: "/proveedores" },
    { icon: CreditCard, label: "Bancos", path: "/banks" },
    { icon: GitCompare, label: "Conciliación", path: "/reconciliation" },
    { icon: FileSpreadsheet, label: "Asientos Contables", path: "/contabilidad/apuntes" },
    { icon: BookOpen, label: "Plan Cuentas", path: "/accounts" },
    { icon: TrendingUp, label: "P&L", path: "/pnl" },
    { icon: Settings, label: "Configuración", path: "/settings" },
    ...(isAdmin ? [{ icon: Shield, label: "Administración", path: "/admin" }] : []),
  ];

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-card">
        <div className="flex h-16 items-center border-b border-border px-6">
          <h1 className="text-lg font-bold text-foreground">FranquiContaSync</h1>
        </div>
        <nav className="space-y-1 p-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}>
                <Button
                  variant="ghost"
                  className={`w-full justify-start gap-3 hover:bg-accent ${
                    isActive ? "bg-accent text-accent-foreground" : ""
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-4 left-4 right-4">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 hover:bg-accent"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Cerrar Sesión
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;