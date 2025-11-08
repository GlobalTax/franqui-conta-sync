import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Home,
  FileText,
  CreditCard,
  Building2,
  Users,
  Settings,
  LogOut,
  TrendingUp,
  Menu,
  FolderOpen,
  Receipt,
  Landmark,
  BookOpen,
  BarChart3,
  FileSpreadsheet,
  ChevronDown,
  GitCompare,
  Shield,
  Store,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useOrganization } from "@/hooks/useOrganization";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { CompanySelector } from "@/components/accounting/CompanySelector";
import { useView } from "@/contexts/ViewContext";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NavLink } from "./NavLink";
import { useState } from "react";

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { isAdmin } = useAdminCheck();
  const { currentMembership } = useOrganization();
  const { selectedView, setSelectedView } = useView();
  const [fiscalYear, setFiscalYear] = useState("2025");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión correctamente",
    });
    navigate("/login");
  };

  const navItems = [
    { icon: Home, label: "Dashboard", path: "/" },
    { icon: FileText, label: "Fact. Recibidas", path: "/invoices" },
    { icon: FileText, label: "Fact. Emitidas", path: "/facturas/emitidas" },
    { icon: Building2, label: "Proveedores", path: "/proveedores" },
    { icon: CreditCard, label: "Bancos", path: "/banks" },
    { icon: GitCompare, label: "Conciliación", path: "/reconciliation" },
    { icon: FileSpreadsheet, label: "Asientos Contables", path: "/contabilidad/apuntes" },
    { icon: BookOpen, label: "Plan Cuentas", path: "/accounts" },
    { icon: TrendingUp, label: "P&L", path: "/pnl" },
    ...(isAdmin ? [{ icon: Shield, label: "Administración", path: "/admin" }] : []),
  ];

  const reportItems = [
    { icon: BarChart3, label: "Balance de Situación", path: "/reportes/balance" },
    { icon: BookOpen, label: "Libro Mayor", path: "/reportes/mayor" },
    { icon: FileSpreadsheet, label: "Libro Diario", path: "/reportes/diario" },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Sidebar - Dark Professional */}
      <div className="w-72 border-r border-sidebar-border bg-sidebar flex flex-col text-sidebar-foreground">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-white/10">
          <Building2 className="h-6 w-6 mr-3 text-white" />
          <h1 className="text-xl font-bold">FranquiContaSync</h1>
        </div>

        {/* Company/Centre Selector - PROMINENTE */}
        {currentMembership?.organization_id && (
          <div className="p-4 border-b border-white/10">
            <label className="text-xs text-white/60 font-semibold mb-2 block uppercase tracking-wide">
              Vista Contable
            </label>
            <CompanySelector
              franchiseeId={currentMembership.organization_id}
              value={selectedView}
              onChange={setSelectedView}
            />
          </div>
        )}

        {/* View indicator inside sidebar - Always visible when selectedView exists */}
        {selectedView && (
          <div className="px-4 pb-4 border-b border-white/10">
            {selectedView.type === 'company' ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold shadow-sm">
                <Building2 className="h-4 w-4" />
                <span className="uppercase tracking-wide">Consolidado</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-full bg-success text-success-foreground px-3 py-1 text-xs font-semibold shadow-sm">
                <Store className="h-4 w-4" />
                <span className="uppercase tracking-wide">Centro</span>
              </div>
            )}
            <div className="mt-2 text-xs text-white/70">
              Vista actual: <span className="font-medium text-white">{selectedView.name}</span>
            </div>
          </div>
        )}

        {/* Selector de Año Fiscal - PROMINENTE */}
        <div className="px-4 pb-4 border-b border-white/10">
          <label className="text-xs text-white/60 font-semibold mb-2 block uppercase tracking-wide">
            Ejercicio
          </label>
          <Select value={fiscalYear} onValueChange={setFiscalYear}>
            <SelectTrigger className="bg-white/10 border-white/20 text-white hover:bg-white/15">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sección: Accesos Directos */}
        <div className="p-4">
          <div className="text-xs text-white/60 font-semibold mb-3 uppercase tracking-wide">
            Accesos Directos
          </div>
          <nav className="space-y-1">
            {navItems.slice(0, 4).map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                activeClassName="bg-white/10 text-white font-medium"
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Sección: Contabilidad */}
        <div className="px-4 pb-4 border-t border-white/10 pt-4">
          <div className="text-xs text-white/60 font-semibold mb-3 uppercase tracking-wide">
            Contabilidad
          </div>
          <nav className="space-y-1">
            {navItems.slice(4).map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                activeClassName="bg-white/10 text-white font-medium"
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </NavLink>
            ))}

            {/* Reportes Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start px-3 py-2 text-white/70 hover:bg-white/5 hover:text-white h-auto"
                >
                  <BarChart3 className="h-5 w-5 mr-3" />
                  <span className="flex-1 text-left">Reportes</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Informes Contables</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {reportItems.map((item) => (
                  <DropdownMenuItem key={item.path} onClick={() => navigate(item.path)}>
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>

        {/* Footer con Logout */}
        <div className="mt-auto p-4 border-t border-white/10">
          <Button
            variant="ghost"
            className="w-full justify-start text-white/70 hover:bg-white/5 hover:text-white"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 mr-3" />
            Cerrar Sesión
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-16 border-b bg-card px-6 flex items-center justify-end">
          <NotificationBell />
        </div>

        {/* View indicator badge */}
        {selectedView && (
          <div className="px-6 py-3 bg-gradient-to-r from-muted/40 to-muted/20 border-b border-border/50">
            <div className="flex items-center gap-3">
              {selectedView.type === 'company' ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-1.5 text-sm font-semibold shadow-sm">
                  <Building2 className="h-4 w-4" />
                  <span className="uppercase tracking-wide">Consolidado</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-full bg-success text-success-foreground px-4 py-1.5 text-sm font-semibold shadow-sm">
                  <Store className="h-4 w-4" />
                  <span className="uppercase tracking-wide">Centro</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Vista actual:</span>
                <span className="font-semibold text-foreground">{selectedView.name}</span>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
