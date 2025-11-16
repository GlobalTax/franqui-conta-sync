// ============================================================================
// COMMAND PALETTE - Universal search and actions (Cmd+K)
// ============================================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  FileText,
  FileInput,
  FileOutput,
  Building2,
  Landmark,
  Calculator,
  BarChart3,
  Users,
  Settings,
  Plus,
  Upload,
  Search,
  TrendingUp,
  BookOpen,
  Home,
  Sparkles,
  Clock,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  onSelect: () => void;
  keywords?: string[];
  category: 'navigation' | 'actions' | 'invoices' | 'suppliers' | 'accounts' | 'recent';
}

// Cache for search results
const searchCache = new Map<string, CommandItem[]>();

// Recent commands (stored in localStorage)
const RECENT_COMMANDS_KEY = 'commandPaletteRecent';
const MAX_RECENT = 5;

function getRecentCommands(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_COMMANDS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addRecentCommand(commandId: string) {
  try {
    const recent = getRecentCommands();
    const filtered = recent.filter(id => id !== commandId);
    const updated = [commandId, ...filtered].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore errors
  }
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dynamicItems, setDynamicItems] = useState<CommandItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const navigate = useNavigate();

  // Toggle with Cmd+K
  useHotkeys('meta+k,ctrl+k', (e) => {
    e.preventDefault();
    setOpen(!open);
  }, { 
    enableOnFormTags: true,
    preventDefault: true
  });

  // Close with Escape
  useHotkeys('escape', () => {
    if (open) setOpen(false);
  }, {
    enabled: open
  });

  // Load recent commands when opening
  useEffect(() => {
    if (open) {
      setRecentIds(getRecentCommands());
    }
  }, [open]);

  // Handler to execute command and save to recents
  const handleSelectCommand = useCallback((command: CommandItem) => {
    command.onSelect();
    addRecentCommand(command.id);
    setOpen(false);
    setSearch('');
  }, []);

  // ============================================================================
  // STATIC COMMANDS (Navigation + Actions)
  // ============================================================================

  const staticCommands: CommandItem[] = [
    // Navigation
    {
      id: 'nav-dashboard',
      label: 'Dashboard',
      description: 'Ir al dashboard principal',
      icon: <Home className="h-4 w-4" />,
      onSelect: () => navigate('/'),
      keywords: ['inicio', 'home'],
      category: 'navigation',
    },
    {
      id: 'nav-digitalization',
      label: 'Digitalización OCR',
      description: 'Inbox de facturas OCR',
      icon: <Sparkles className="h-4 w-4" />,
      onSelect: () => navigate('/digitalizacion'),
      keywords: ['ocr', 'digitalizacion', 'inbox'],
      category: 'navigation',
    },
    {
      id: 'nav-invoices',
      label: 'Facturas Recibidas',
      description: 'Ver todas las facturas recibidas',
      icon: <FileInput className="h-4 w-4" />,
      onSelect: () => navigate('/invoices'),
      keywords: ['facturas', 'recibidas', 'proveedores'],
      category: 'navigation',
    },
    {
      id: 'nav-invoices-issued',
      label: 'Facturas Emitidas',
      description: 'Ver facturas emitidas a clientes',
      icon: <FileOutput className="h-4 w-4" />,
      onSelect: () => navigate('/facturas/emitidas'),
      keywords: ['facturas', 'emitidas', 'clientes'],
      category: 'navigation',
    },
    {
      id: 'nav-banks',
      label: 'Bancos',
      description: 'Gestionar cuentas bancarias',
      icon: <Landmark className="h-4 w-4" />,
      onSelect: () => navigate('/banks'),
      keywords: ['bancos', 'cuentas', 'treasury'],
      category: 'navigation',
    },
    {
      id: 'nav-entries',
      label: 'Asientos Contables',
      description: 'Ver todos los asientos contables',
      icon: <BookOpen className="h-4 w-4" />,
      onSelect: () => navigate('/contabilidad/apuntes'),
      keywords: ['asientos', 'contabilidad', 'journal'],
      category: 'navigation',
    },
    {
      id: 'nav-accounts',
      label: 'Plan de Cuentas',
      description: 'Gestionar plan contable',
      icon: <Calculator className="h-4 w-4" />,
      onSelect: () => navigate('/accounts'),
      keywords: ['plan', 'cuentas', 'contable'],
      category: 'navigation',
    },
    {
      id: 'nav-pl',
      label: 'P&L (Pérdidas y Ganancias)',
      description: 'Ver informe de resultados',
      icon: <BarChart3 className="h-4 w-4" />,
      onSelect: () => navigate('/profit-loss'),
      keywords: ['pl', 'perdidas', 'ganancias', 'resultados', 'pyg'],
      category: 'navigation',
    },
    {
      id: 'nav-trial-balance',
      label: 'Balance de Sumas y Saldos',
      description: 'Ver balance de sumas y saldos',
      icon: <FileText className="h-4 w-4" />,
      onSelect: () => navigate('/informes/balance-sumas-saldos'),
      keywords: ['balance', 'sumas', 'saldos'],
      category: 'navigation',
    },
    {
      id: 'nav-suppliers',
      label: 'Proveedores',
      description: 'Gestionar proveedores',
      icon: <Users className="h-4 w-4" />,
      onSelect: () => navigate('/proveedores'),
      keywords: ['proveedores', 'suppliers'],
      category: 'navigation',
    },
    {
      id: 'nav-admin',
      label: 'Administración',
      description: 'Configuración y ajustes',
      icon: <Settings className="h-4 w-4" />,
      onSelect: () => navigate('/admin'),
      keywords: ['admin', 'configuracion', 'settings'],
      category: 'navigation',
    },

    // Actions
    {
      id: 'action-new-invoice',
      label: 'Nueva Factura Recibida',
      description: 'Crear nueva factura recibida',
      icon: <Plus className="h-4 w-4" />,
      onSelect: () => {
        navigate('/invoices/new-received');
        toast.success('Nueva factura recibida');
      },
      keywords: ['nueva', 'crear', 'factura', 'recibida'],
      category: 'actions',
    },
    {
      id: 'action-bulk-upload',
      label: 'Upload Masivo de Facturas',
      description: 'Subir múltiples facturas a la vez',
      icon: <Upload className="h-4 w-4" />,
      onSelect: () => {
        navigate('/invoices/bulk-upload');
        toast.success('Upload masivo');
      },
      keywords: ['upload', 'masivo', 'bulk', 'subir'],
      category: 'actions',
    },
    {
      id: 'action-new-entry',
      label: 'Nuevo Asiento Contable',
      description: 'Crear nuevo asiento manual',
      icon: <Calculator className="h-4 w-4" />,
      onSelect: () => {
        navigate('/contabilidad/apuntes/nuevo');
        toast.success('Nuevo asiento contable');
      },
      keywords: ['nuevo', 'asiento', 'contable', 'manual'],
      category: 'actions',
    },
    {
      id: 'action-new-issued',
      label: 'Nueva Factura Emitida',
      description: 'Crear nueva factura emitida',
      icon: <Plus className="h-4 w-4" />,
      onSelect: () => {
        navigate('/facturas/emitidas/new');
        toast.success('Nueva factura emitida');
      },
      keywords: ['nueva', 'crear', 'factura', 'emitida', 'cliente'],
      category: 'actions',
    },
  ];

  // ============================================================================
  // DYNAMIC SEARCH (Invoices, Suppliers, Accounts)
  // ============================================================================

  useEffect(() => {
    if (search.length < 2) {
      setDynamicItems([]);
      setIsLoading(false);
      return;
    }

    // Check cache first
    if (searchCache.has(search)) {
      setDynamicItems(searchCache.get(search)!);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timeoutId = setTimeout(async () => {
      const searchTerm = search.toLowerCase();
      const items: CommandItem[] = [];

      try {
        // Search invoices
        const { data: invoices } = await supabase
          .from('invoices_received')
          .select('id, invoice_number, supplier_name, total')
          .or(`invoice_number.ilike.%${searchTerm}%,supplier_name.ilike.%${searchTerm}%`)
          .limit(5);

        if (invoices) {
          invoices.forEach((inv) => {
            items.push({
              id: `invoice-${inv.id}`,
              label: `Factura ${inv.invoice_number || 'Sin número'}`,
              description: `${inv.supplier_name || 'Sin proveedor'} - ${inv.total || 0}€`,
              icon: <FileText className="h-4 w-4" />,
              onSelect: () => navigate(`/invoices/${inv.id}`),
              category: 'invoices',
            });
          });
        }

        // Search suppliers
        const { data: suppliers } = await supabase
          .from('suppliers')
          .select('id, name, tax_id')
          .or(`name.ilike.%${searchTerm}%,tax_id.ilike.%${searchTerm}%`)
          .limit(5);

        if (suppliers) {
          suppliers.forEach((sup) => {
            items.push({
              id: `supplier-${sup.id}`,
              label: sup.name,
              description: `${sup.tax_id || 'Sin CIF'}`,
              icon: <Building2 className="h-4 w-4" />,
              onSelect: () => navigate(`/proveedores?id=${sup.id}`),
              category: 'suppliers',
            });
          });
        }

        // Search accounts
        const { data: accounts } = await supabase
          .from('accounts')
          .select('code, name')
          .or(`code.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`)
          .limit(5);

        if (accounts) {
          accounts.forEach((acc) => {
            items.push({
              id: `account-${acc.code}`,
              label: `${acc.code} - ${acc.name}`,
              description: 'Cuenta contable',
              icon: <Calculator className="h-4 w-4" />,
              onSelect: () => {
                // Copy account code to clipboard
                navigator.clipboard.writeText(acc.code);
                toast.success(`Cuenta ${acc.code} copiada al portapapeles`);
              },
              category: 'accounts',
            });
          });
        }

        // Save to cache
        searchCache.set(search, items);
        setDynamicItems(items);
      } catch (error) {
        console.error('[CommandPalette] Search error:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [search, navigate]);

  // ============================================================================
  // FILTER & GROUP COMMANDS
  // ============================================================================

  const allCommands = useMemo(() => [...staticCommands, ...dynamicItems], [dynamicItems]);

  // Recent commands
  const recentCommands = useMemo(() => {
    if (recentIds.length === 0) return [];
    return recentIds
      .map(id => allCommands.find(cmd => cmd.id === id))
      .filter(Boolean) as CommandItem[];
  }, [recentIds, allCommands]);

  const commandsByCategory = useMemo(() => {
    return {
      recent: recentCommands,
      navigation: allCommands.filter(c => c.category === 'navigation'),
      actions: allCommands.filter(c => c.category === 'actions'),
      invoices: allCommands.filter(c => c.category === 'invoices'),
      suppliers: allCommands.filter(c => c.category === 'suppliers'),
      accounts: allCommands.filter(c => c.category === 'accounts'),
    };
  }, [allCommands, recentCommands]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Buscar páginas, acciones, facturas, proveedores..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center gap-2 py-6">
            <Search className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {isLoading ? 'Buscando...' : `No se encontraron resultados para "${search}"`}
            </p>
          </div>
        </CommandEmpty>

        {/* Recent Commands */}
        {!search && commandsByCategory.recent.length > 0 && (
          <CommandGroup heading={
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              Recientes
            </div>
          }>
            {commandsByCategory.recent.map((item) => (
              <CommandItem
                key={item.id}
                onSelect={() => handleSelectCommand(item)}
              >
                <span className="mr-2">{item.icon}</span>
                <div className="flex flex-col">
                  <span>{item.label}</span>
                  {item.description && (
                    <span className="text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        )}

        {/* Navigation */}
        {commandsByCategory.navigation.length > 0 && (
          <>
            {!search && commandsByCategory.recent.length > 0 && <CommandSeparator />}
            <CommandGroup heading="Navegación">
              {commandsByCategory.navigation.map((item) => (
                <CommandItem
                  key={item.id}
                  onSelect={() => handleSelectCommand(item)}
                >
                  <span className="mr-2">{item.icon}</span>
                  <div className="flex flex-col">
                    <span>{item.label}</span>
                    {item.description && (
                      <span className="text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Actions */}
        {commandsByCategory.actions.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Acciones Rápidas">
              {commandsByCategory.actions.map((item) => (
                <CommandItem
                  key={item.id}
                  onSelect={() => handleSelectCommand(item)}
                >
                  <span className="mr-2">{item.icon}</span>
                  <div className="flex flex-col">
                    <span>{item.label}</span>
                    {item.description && (
                      <span className="text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Invoices */}
        {commandsByCategory.invoices.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Facturas">
              {commandsByCategory.invoices.map((item) => (
                <CommandItem
                  key={item.id}
                  onSelect={() => handleSelectCommand(item)}
                >
                  <span className="mr-2">{item.icon}</span>
                  <div className="flex flex-col">
                    <span>{item.label}</span>
                    {item.description && (
                      <span className="text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Suppliers */}
        {commandsByCategory.suppliers.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Proveedores">
              {commandsByCategory.suppliers.map((item) => (
                <CommandItem
                  key={item.id}
                  onSelect={() => handleSelectCommand(item)}
                >
                  <span className="mr-2">{item.icon}</span>
                  <div className="flex flex-col">
                    <span>{item.label}</span>
                    {item.description && (
                      <span className="text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Accounts */}
        {commandsByCategory.accounts.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Cuentas Contables">
              {commandsByCategory.accounts.map((item) => (
                <CommandItem
                  key={item.id}
                  onSelect={() => handleSelectCommand(item)}
                >
                  <span className="mr-2">{item.icon}</span>
                  <span>{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>

      <div className="border-t p-2 text-xs text-muted-foreground text-center">
        Usa <kbd className="px-1 py-0.5 bg-muted rounded">↑</kbd>{' '}
        <kbd className="px-1 py-0.5 bg-muted rounded">↓</kbd> para navegar,{' '}
        <kbd className="px-1 py-0.5 bg-muted rounded">Enter</kbd> para seleccionar,{' '}
        <kbd className="px-1 py-0.5 bg-muted rounded">Esc</kbd> para cerrar
      </div>
    </CommandDialog>
  );
}
