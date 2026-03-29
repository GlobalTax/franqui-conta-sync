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
  Layers,
  FlaskConical,
  Zap,
  Database,
  Inbox,
  Search,
  Trash2,
  Sparkles,
  Upload,
  Calendar,
  DollarSign,
  ClipboardList,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useOrganization } from "@/hooks/useOrganization";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ThemeToggle } from "@/components/ui/theme-toggle";
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
import { logger } from "@/lib/logger";
import CompactOrgSelector from "@/components/filters/CompactOrgSelector";
import { CommandPaletteButton } from "@/components/layout/CommandPaletteButton";

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

  logger.debug('Layout', '🔐 isAdmin:', isAdmin);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión correctamente",
    });
    navigate("/login");
  };

  const principalItems = [
    { icon: Home, label: "Dashboard", path: "/" },
    { icon: Building2, label: "Mi Empresa", path: "/mi-empresa/mis-datos" },
    { icon: Sparkles, label: "Digitalización", path: "/digitalizacion", highlight: true },
    { icon: FileText, label: "Fact. Recibidas", path: "/invoices" },
    { icon: FileText, label: "Fact. Emitidas", path: "/facturas/emitidas" },
    { icon: Building2, label: "Proveedores", path: "/proveedores" },
  ];

  const tesoreriaItems = [
    { icon: CreditCard, label: "Bancos", path: "/banks" },
    { icon: GitCompare, label: "Conciliación", path: "/treasury/reconciliation" },
    { icon: Landmark, label: "Conexiones Bancarias", path: "/treasury/salt-edge-connections" },
  ];

  const contabilidadItems = [
    { icon: FileSpreadsheet, label: "Asientos Contables", path: "/contabilidad/apuntes" },
    { icon: BookOpen, label: "Plan Cuentas", path: "/accounts" },
    { icon: Calendar, label: "Cierre Diario", path: "/contabilidad/cierre-diario" },
    { icon: DollarSign, label: "Costes Laborales", path: "/contabilidad/costes-laborales" },
    { icon: FolderOpen, label: "Cierre Ejercicio", path: "/contabilidad/cierre-ejercicio" },
    { icon: Upload, label: "Ejercicios Históricos", path: "/contabilidad/ejercicios-historicos" },
    { icon: Layers, label: "Activos Fijos", path: "/contabilidad/activos-fijos" },
    { icon: Zap, label: "Periodificaciones", path: "/contabilidad/periodificaciones" },
    { icon: Receipt, label: "Provisiones", path: "/contabilidad/provisiones" },
    { icon: Database, label: "Asiento Existencias", path: "/contabilidad/existencias" },
  ];

  const complianceItems = [
    { icon: Shield, label: "Auditoría & Compliance", path: "/auditoria" },
    { icon: ClipboardList, label: "Modelos Fiscales", path: "/cumplimiento/modelos-fiscales" },
  ];

  const ivaItems = [
    { icon: FileText, label: "Facturas Expedidas", path: "/iva/expedidas" },
    { icon: Receipt, label: "Facturas Recibidas", path: "/iva/recibidas" },
    { icon: FileSpreadsheet, label: "Modelo 303", path: "/iva/modelo-303" },
  ];

  const reportItems = [
    { icon: TrendingUp, label: "P&L (Pérdidas y Ganancias)", path: "/pnl" },
    { icon: TrendingUp, label: "P&L Consolidado", path: "/pnl/consolidado" },
    { icon: FileSpreadsheet, label: "Sumas y Saldos", path: "/reportes/sumas-y-saldos" },
    { icon: BarChart3, label: "Balance de Situación", path: "/reportes/balance" },
    { icon: BookOpen, label: "Libro Mayor", path: "/reportes/mayor" },
    { icon: FileSpreadsheet, label: "Libro Diario", path: "/reportes/diario" },
    { icon: BarChart3, label: "Consolidado Multi-Centro", path: "/reportes/consolidado" },
    { icon: Layers, label: "Libro de Bienes", path: "/reportes/libro-bienes" },
  ];

  const analyticsItems = [
    { icon: Zap, label: "Métricas OCR", path: "/analytics/ocr" },
    { icon: Database, label: "Caché OCR", path: "/analytics/ocr-cache" },
  ];

  const configurationItems = [
    { icon: Sparkles, label: "AP Learning", path: "/configuracion/ap-learning" },
  ];

  return (
    <div className="min-h-screen flex w-full">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-sidebar flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="h-4 w-4 text-white" strokeWidth={2} />
            </div>
            <h1 className="text-base font-semibold text-foreground tracking-tight">
              FranquiContaSync
            </h1>
          </div>
        </div>

        {/* Company/Centre Selector */}
        {currentMembership?.organization_id && (
          <div className="p-5 space-y-4 border-b border-border">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Vista contable
              </label>
              <CentreSelector
                value={selectedView}
                onChange={setSelectedView}
              />
            </div>

            {selectedView && (
              <div className="p-3 bg-muted rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-1.5">
                  {selectedView.type === 'all' || selectedView.type === 'company' ? (
                    <Building2 className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
                  ) : (
                    <Store className="h-3.5 w-3.5 text-success" strokeWidth={2} />
                  )}
                  <span className="text-xs font-medium text-muted-foreground">
                    {selectedView.type === 'all' || selectedView.type === 'company' ? 'Consolidado' : 'Centro'}
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground">
                  {selectedView.name}
                </p>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Ejercicio fiscal
              </label>
              <Select value={fiscalYear} onValueChange={setFiscalYear}>
                <SelectTrigger className="w-full bg-card border border-input hover:border-primary/30 transition-all rounded-lg h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-6 overflow-auto">
          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-2 px-2">
              Principal
            </h3>
            <div className="space-y-0.5">
              {principalItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-foreground/70 hover:bg-accent hover:text-foreground transition-all duration-150 group ${
                    item.highlight ? 'bg-primary/5 border border-primary/20' : ''
                  }`}
                  activeClassName="bg-primary/10 text-primary font-medium"
                >
                  <item.icon className={`h-4 w-4 ${item.highlight ? 'text-primary' : ''}`} strokeWidth={2} />
                  <span className={`text-sm ${item.highlight ? 'font-medium' : ''}`}>{item.label}</span>
                  {item.highlight && (
                    <Sparkles className="h-3 w-3 ml-auto text-primary animate-pulse" />
                  )}
                </NavLink>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-2 px-2">
              Tesorería
            </h3>
            <div className="space-y-0.5">
              {tesoreriaItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-foreground/70 hover:bg-accent hover:text-foreground transition-all duration-150 group"
                  activeClassName="bg-primary/10 text-primary font-medium"
                >
                  <item.icon className="h-4 w-4" strokeWidth={2} />
                  <span className="text-sm">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-2 px-2">
              Contabilidad
            </h3>
            <div className="space-y-0.5">
              {contabilidadItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-foreground/70 hover:bg-accent hover:text-foreground transition-all duration-150 group"
                  activeClassName="bg-primary/10 text-primary font-medium"
                >
                  <item.icon className="h-4 w-4" strokeWidth={2} />
                  <span className="text-sm">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>

          {/* IVA Dropdown */}
          <div>
            <DropdownMenu>
              <DropdownMenuTrigger className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-foreground/70 hover:bg-accent hover:text-foreground transition-all duration-150 group">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4" strokeWidth={2} />
                  <span className="text-sm">IVA</span>
                </div>
                <ChevronDown className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52 rounded-lg border-border">
                {ivaItems.map((item) => (
                  <DropdownMenuItem key={item.path} asChild>
                    <NavLink
                      to={item.path}
                      className="flex items-center gap-3 px-3 py-2 text-sm rounded-md cursor-pointer"
                    >
                      <item.icon className="h-4 w-4" strokeWidth={2} />
                      <span>{item.label}</span>
                    </NavLink>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Cumplimiento */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-2 px-2">
              Cumplimiento
            </h3>
            <div className="space-y-0.5">
              {complianceItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-foreground/70 hover:bg-accent hover:text-foreground transition-all duration-150 group"
                  activeClassName="bg-primary/10 text-primary font-medium"
                >
                  <item.icon className="h-4 w-4" strokeWidth={2} />
                  <span className="text-sm">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>

          {/* Informes Dropdown */}
          <div>
            <DropdownMenu>
              <DropdownMenuTrigger className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-foreground/70 hover:bg-accent hover:text-foreground transition-all duration-150 group">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-4 w-4" strokeWidth={2} />
                  <span className="text-sm">Informes</span>
                </div>
                <ChevronDown className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52 rounded-lg border-border">
                {reportItems.map((item) => (
                  <DropdownMenuItem key={item.path} asChild>
                    <NavLink
                      to={item.path}
                      className="flex items-center gap-3 px-3 py-2 text-sm rounded-md cursor-pointer"
                    >
                      <item.icon className="h-4 w-4" strokeWidth={2} />
                      <span>{item.label}</span>
                    </NavLink>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* IA Assistant */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-2 px-2">
              Inteligencia Artificial
            </h3>
            <div className="space-y-0.5">
              <NavLink
                to="/ai-assistant"
                end
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-foreground/70 hover:bg-accent hover:text-foreground transition-all duration-150 group bg-primary/5 border border-primary/20"
                activeClassName="bg-primary/10 text-primary font-medium"
              >
                <Sparkles className="h-4 w-4 text-primary" strokeWidth={2} />
                <span className="text-sm font-medium">Asistente Claude</span>
                <Badge className="ml-auto bg-primary/20 text-primary border-0 text-[10px] px-1.5 py-0">
                  IA
                </Badge>
              </NavLink>
            </div>
          </div>

          {/* Analytics Section */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-2 px-2">
              Análisis
            </h3>
            <div className="space-y-0.5">
              {analyticsItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-foreground/70 hover:bg-accent hover:text-foreground transition-all duration-150 group"
                  activeClassName="bg-primary/10 text-primary font-medium"
                >
                  <item.icon className="h-4 w-4" strokeWidth={2} />
                  <span className="text-sm">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>

          {/* Configuration Section */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-2 px-2">
              Configuración
            </h3>
            <div className="space-y-0.5">
              {configurationItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-foreground/70 hover:bg-accent hover:text-foreground transition-all duration-150 group"
                  activeClassName="bg-primary/10 text-primary font-medium"
                >
                  <item.icon className="h-4 w-4" strokeWidth={2} />
                  <span className="text-sm">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>

          {/* Admin Section */}
          {isAdmin && (
            <div className="pt-2 border-t border-border">
              <h3 className="text-xs font-medium text-muted-foreground mb-2 px-2">
                Sistema
              </h3>
              <div className="space-y-0.5">
                <NavLink
                  to="/admin"
                  end
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-foreground/70 hover:bg-accent hover:text-foreground transition-all duration-150 group relative"
                  activeClassName="bg-primary/10 text-primary font-medium"
                >
                  <Shield className="h-4 w-4" strokeWidth={2} />
                  <span className="text-sm font-medium">Administración</span>
                  <Badge className="ml-auto bg-primary/20 text-primary border-0 text-[10px] px-1.5 py-0">
                    ADMIN
                  </Badge>
                </NavLink>
                <NavLink
                  to="/admin/pl-rules"
                  end
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-foreground/70 hover:bg-accent hover:text-foreground transition-all duration-150 group"
                  activeClassName="bg-primary/10 text-primary font-medium"
                >
                  <Layers className="h-4 w-4" strokeWidth={2} />
                  <span className="text-sm">Reglas P&L</span>
                </NavLink>
                <NavLink
                  to="/admin/demo-data"
                  end
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-foreground/70 hover:bg-accent hover:text-foreground transition-all duration-150 group"
                  activeClassName="bg-primary/10 text-primary font-medium"
                >
                  <FlaskConical className="h-4 w-4" strokeWidth={2} />
                  <span className="text-sm">Datos Demo</span>
                </NavLink>
              </div>
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start gap-3 text-foreground/70 hover:text-destructive hover:bg-destructive/10 rounded-lg h-9"
          >
            <LogOut className="h-4 w-4" strokeWidth={2} />
            <span className="text-sm">Cerrar sesión</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-16 border-b border-border bg-card px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <CompactOrgSelector />
            <CommandPaletteButton onClick={() => {
              // El CommandPalette se activa automáticamente con Cmd+K
              // Este botón es solo visual indicator
              const event = new KeyboardEvent('keydown', {
                key: 'k',
                metaKey: true,
                bubbles: true
              });
              document.dispatchEvent(event);
            }} />
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationBell />
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-auto bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
