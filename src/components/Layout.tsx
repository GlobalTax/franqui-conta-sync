import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Home,
  FileText,
  CreditCard,
  Building2,
  CheckCircle2,
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
import { CentreSelector } from "@/components/accounting/CentreSelector";
import { useView } from "@/contexts/ViewContext";
import { useEnsureDefaultView } from "@/hooks/useEnsureDefaultView";
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
  
  // Ensure a default view is selected when data loads
  useEnsureDefaultView();

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
    { icon: FolderOpen, label: "Cierre Ejercicio", path: "/contabilidad/cierre-ejercicio" },
    ...(isAdmin ? [{ icon: Shield, label: "Administración", path: "/admin" }] : []),
  ];

  const ivaItems = [
    { icon: FileText, label: "Facturas Expedidas", path: "/iva/expedidas" },
    { icon: Receipt, label: "Facturas Recibidas", path: "/iva/recibidas" },
    { icon: FileSpreadsheet, label: "Modelo 303", path: "/iva/modelo-303" },
  ];

  const reportItems = [
    { icon: FileSpreadsheet, label: "Sumas y Saldos", path: "/reportes/sumas-y-saldos" },
    { icon: BarChart3, label: "Balance de Situación", path: "/reportes/balance" },
    { icon: BookOpen, label: "Libro Mayor", path: "/reportes/mayor" },
    { icon: FileSpreadsheet, label: "Libro Diario", path: "/reportes/diario" },
  ];

  return (
    <div className="min-h-screen flex w-full">
      {/* Sidebar - Clear Modern */}
      <div className="w-72 border-r border-sidebar-border bg-sidebar flex flex-col shadow-soft-lg">
        {/* Logo with gold accent */}
        <div className="h-20 flex items-center px-8 border-b border-border/50">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-accent-gold to-accent-gold/80 mr-3">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-display font-bold text-foreground">
            FranquiConta<span className="text-accent-gold">Sync</span>
          </h1>
        </div>

        {/* Company/Centre Selector */}
        {currentMembership?.organization_id && (
          <div className="p-6 border-b border-border/50">
            <label className="text-xs text-muted-foreground font-semibold mb-2 block uppercase tracking-wider">
              Vista Contable
            </label>
            <CentreSelector
              franchiseeId={currentMembership.organization_id}
              value={selectedView}
              onChange={setSelectedView}
            />
          </div>
        )}

        {/* Selector de Año Fiscal */}
        <div className="px-6 pb-6 border-b border-border/50">
          {/* View indicator inside sidebar */}
          {selectedView && (
            <div className="mb-4 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                {selectedView.type === 'all' || selectedView.type === 'company' ? (
                  <Building2 className="h-4 w-4 text-primary" />
                ) : (
                  <Store className="h-4 w-4 text-success" />
                )}
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                  {selectedView.type === 'all' || selectedView.type === 'company' ? 'Consolidado' : 'Centro'}
                </span>
              </div>
              <p className="text-sm font-medium text-foreground">{selectedView.name}</p>
            </div>
          )}
          
          <label className="text-xs text-muted-foreground font-semibold mb-2 block uppercase tracking-wider">
            Ejercicio
          </label>
          <Select value={fiscalYear} onValueChange={setFiscalYear}>
            <SelectTrigger className="bg-background border-border/50 hover:border-primary/50 transition-colors">
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
        <div className="p-6">
          <div className="text-xs text-muted-foreground font-semibold mb-3 uppercase tracking-wider">
            Accesos Directos
          </div>
          <nav className="space-y-1">
            {navItems.slice(0, 4).map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-foreground/70 hover:bg-primary/5 hover:text-primary transition-all duration-200 group"
                activeClassName="bg-primary text-white font-semibold shadow-soft"
              >
                <item.icon className="h-5 w-5 group-hover:scale-110 transition-transform" />
                <span className="text-sm">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Sección: Contabilidad */}
        <div className="px-6 pb-6 border-t border-border/50 pt-6">
          <div className="text-xs text-muted-foreground font-semibold mb-3 uppercase tracking-wider">
            Contabilidad
          </div>
          <nav className="space-y-1">
            {navItems.slice(4).map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-foreground/70 hover:bg-primary/5 hover:text-primary transition-all duration-200 group"
                activeClassName="bg-primary text-white font-semibold shadow-soft"
              >
                <item.icon className="h-5 w-5 group-hover:scale-110 transition-transform" />
                <span className="text-sm">{item.label}</span>
              </NavLink>
            ))}

            {/* IVA Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start px-4 py-3 text-foreground/70 hover:bg-primary/5 hover:text-primary h-auto rounded-xl font-normal"
                >
                  <FileSpreadsheet className="h-5 w-5 mr-3" />
                  <span className="flex-1 text-left text-sm">IVA</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Libros y Modelos de IVA</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {ivaItems.map((item) => (
                  <DropdownMenuItem key={item.path} onClick={() => navigate(item.path)}>
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Reportes Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start px-4 py-3 text-foreground/70 hover:bg-primary/5 hover:text-primary h-auto rounded-xl font-normal"
                >
                  <BarChart3 className="h-5 w-5 mr-3" />
                  <span className="flex-1 text-left text-sm">Reportes</span>
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
        <div className="mt-auto p-6 border-t border-border/50">
          <Button
            variant="ghost"
            className="w-full justify-start text-foreground/70 hover:bg-destructive/10 hover:text-destructive rounded-xl"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 mr-3" />
            <span className="text-sm">Cerrar Sesión</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-20 border-b border-border/50 bg-card/80 backdrop-blur-sm px-8 flex items-center justify-end shadow-soft">
          <NotificationBell />
        </div>

        {/* Content */}
        <main className="flex-1 overflow-auto bg-gradient-to-br from-background to-muted/30">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
