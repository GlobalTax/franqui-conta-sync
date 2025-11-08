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
  BarChart3,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

  const reportItems = [
    { label: "Balance de Situación", path: "/reportes/balance" },
    { label: "Libro Mayor", path: "/reportes/mayor" },
    { label: "Libro Diario", path: "/reportes/diario" },
  ];

  const isReportActive = reportItems.some(item => location.pathname === item.path);

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
          
          {/* Menú de Reportes */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={`w-full justify-start gap-3 hover:bg-accent ${
                  isReportActive ? "bg-accent text-accent-foreground" : ""
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                Reportes
                <ChevronDown className="ml-auto h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {reportItems.map((item) => (
                <DropdownMenuItem key={item.path} asChild>
                  <Link to={item.path} className="cursor-pointer">
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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