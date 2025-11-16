// ============================================================================
// KEYBOARD SHORTCUTS MANAGER - Global keyboard shortcuts system
// ============================================================================

import { useNavigate } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';
import { toast } from 'sonner';

export interface ShortcutAction {
  keys: string;
  description: string;
  category: 'navigation' | 'actions' | 'search' | 'selection';
  action: () => void;
  scopes?: string[];
}

/**
 * Hook para gestionar shortcuts globales
 */
export function useGlobalShortcuts() {
  const navigate = useNavigate();

  // ============================================================================
  // NAVIGATION SHORTCUTS (g + letter)
  // ============================================================================

  useHotkeys('g,d', () => navigate('/'), { 
    description: 'Go to Dashboard',
    scopes: ['global']
  });

  useHotkeys('g,i', () => navigate('/invoices'), { 
    description: 'Go to Invoices',
    scopes: ['global']
  });

  useHotkeys('g,e', () => navigate('/facturas/emitidas'), { 
    description: 'Go to Issued Invoices',
    scopes: ['global']
  });

  useHotkeys('g,b', () => navigate('/banks'), { 
    description: 'Go to Banks',
    scopes: ['global']
  });

  useHotkeys('g,a', () => navigate('/contabilidad/apuntes'), { 
    description: 'Go to Accounting Entries',
    scopes: ['global']
  });

  useHotkeys('g,p', () => navigate('/profit-loss'), { 
    description: 'Go to P&L',
    scopes: ['global']
  });

  useHotkeys('g,r', () => navigate('/informes/balance-sumas-saldos'), { 
    description: 'Go to Trial Balance',
    scopes: ['global']
  });

  useHotkeys('g,s', () => navigate('/proveedores'), { 
    description: 'Go to Suppliers',
    scopes: ['global']
  });

  useHotkeys('g,x', () => navigate('/admin'), { 
    description: 'Go to Admin',
    scopes: ['global']
  });

  useHotkeys('g,c', () => navigate('/accounts'), { 
    description: 'Go to Chart of Accounts',
    scopes: ['global']
  });

  useHotkeys('g,o', () => navigate('/digitalizacion'), { 
    description: 'Go to OCR Digitalization',
    scopes: ['global']
  });

  // ============================================================================
  // ACTION SHORTCUTS (n + letter for "New")
  // ============================================================================

  useHotkeys('n,i', () => {
    navigate('/invoices/new-received');
    toast.success('Nueva factura recibida');
  }, { 
    description: 'New Received Invoice',
    scopes: ['global']
  });

  useHotkeys('n,e', () => {
    navigate('/facturas/emitidas/new');
    toast.success('Nueva factura emitida');
  }, { 
    description: 'New Issued Invoice',
    scopes: ['global']
  });

  useHotkeys('n,a', () => {
    navigate('/contabilidad/apuntes/nuevo');
    toast.success('Nuevo asiento contable');
  }, { 
    description: 'New Accounting Entry',
    scopes: ['global']
  });

  useHotkeys('n,u', () => {
    navigate('/invoices/bulk-upload');
    toast.success('Upload masivo de facturas');
  }, { 
    description: 'Bulk Upload Invoices',
    scopes: ['global']
  });

  useHotkeys('n,s', () => {
    navigate('/proveedores?new=true');
    toast.success('Nuevo proveedor');
  }, { 
    description: 'New Supplier',
    scopes: ['global']
  });

  // ============================================================================
  // SEARCH SHORTCUTS
  // ============================================================================

  useHotkeys('/', (e) => {
    e.preventDefault();
    // Focus en el search input si existe
    const searchInput = document.querySelector<HTMLInputElement>('[data-search-input]');
    if (searchInput) {
      searchInput.focus();
    }
  }, { 
    description: 'Focus Search',
    scopes: ['global']
  });

  // ============================================================================
  // THEME TOGGLE
  // ============================================================================

  useHotkeys('meta+t,ctrl+t', (e) => {
    e.preventDefault();
    // Trigger theme toggle
    const themeButton = document.querySelector('[data-theme-toggle]') as HTMLButtonElement;
    if (themeButton) {
      themeButton.click();
    }
  }, { 
    description: 'Toggle Theme',
    scopes: ['global']
  });
}

/**
 * Hook para shortcuts específicos de listas (j/k navigation)
 */
export function useListNavigationShortcuts(
  items: any[],
  selectedIndex: number,
  onSelectIndex: (index: number) => void,
  onOpen?: (item: any) => void
) {
  // Navigate down
  useHotkeys('j', () => {
    if (selectedIndex < items.length - 1) {
      onSelectIndex(selectedIndex + 1);
    }
  }, { 
    description: 'Select Next',
    scopes: ['list']
  });

  // Navigate up
  useHotkeys('k', () => {
    if (selectedIndex > 0) {
      onSelectIndex(selectedIndex - 1);
    }
  }, { 
    description: 'Select Previous',
    scopes: ['list']
  });

  // Open selected
  useHotkeys('enter', () => {
    if (onOpen && items[selectedIndex]) {
      onOpen(items[selectedIndex]);
    }
  }, { 
    description: 'Open Selected',
    scopes: ['list'],
    enabled: !!onOpen
  });
}

/**
 * Hook para shortcuts de acciones en selección múltiple
 */
export function useBulkActionShortcuts(
  selectedItems: any[],
  onApprove?: () => void,
  onReject?: () => void,
  onDelete?: () => void
) {
  useHotkeys('a,a', () => {
    if (onApprove && selectedItems.length > 0) {
      onApprove();
      toast.success(`${selectedItems.length} items aprobados`);
    }
  }, { 
    description: 'Approve Selected',
    scopes: ['bulk'],
    enabled: !!onApprove && selectedItems.length > 0
  });

  useHotkeys('a,r', () => {
    if (onReject && selectedItems.length > 0) {
      onReject();
      toast.success(`${selectedItems.length} items rechazados`);
    }
  }, { 
    description: 'Reject Selected',
    scopes: ['bulk'],
    enabled: !!onReject && selectedItems.length > 0
  });

  useHotkeys('a,d', () => {
    if (onDelete && selectedItems.length > 0) {
      onDelete();
      toast.success(`${selectedItems.length} items eliminados`);
    }
  }, { 
    description: 'Delete Selected',
    scopes: ['bulk'],
    enabled: !!onDelete && selectedItems.length > 0
  });
}

/**
 * Lista de todos los shortcuts disponibles (para help dialog)
 */
export const SHORTCUTS_LIST: ShortcutAction[] = [
  // Navigation
  { keys: 'g → d', description: 'Ir al Dashboard', category: 'navigation', action: () => {} },
  { keys: 'g → i', description: 'Ir a Facturas Recibidas', category: 'navigation', action: () => {} },
  { keys: 'g → e', description: 'Ir a Facturas Emitidas', category: 'navigation', action: () => {} },
  { keys: 'g → b', description: 'Ir a Bancos', category: 'navigation', action: () => {} },
  { keys: 'g → a', description: 'Ir a Asientos Contables', category: 'navigation', action: () => {} },
  { keys: 'g → p', description: 'Ir a P&L', category: 'navigation', action: () => {} },
  { keys: 'g → r', description: 'Ir a Balance de Sumas y Saldos', category: 'navigation', action: () => {} },
  { keys: 'g → s', description: 'Ir a Proveedores', category: 'navigation', action: () => {} },
  { keys: 'g → c', description: 'Ir a Plan de Cuentas', category: 'navigation', action: () => {} },
  { keys: 'g → o', description: 'Ir a Digitalización OCR', category: 'navigation', action: () => {} },
  { keys: 'g → x', description: 'Ir a Admin', category: 'navigation', action: () => {} },

  // Actions
  { keys: 'n → i', description: 'Nueva Factura Recibida', category: 'actions', action: () => {} },
  { keys: 'n → e', description: 'Nueva Factura Emitida', category: 'actions', action: () => {} },
  { keys: 'n → a', description: 'Nuevo Asiento Contable', category: 'actions', action: () => {} },
  { keys: 'n → u', description: 'Upload Masivo', category: 'actions', action: () => {} },
  { keys: 'n → s', description: 'Nuevo Proveedor', category: 'actions', action: () => {} },
  { keys: '⌘+T', description: 'Cambiar Tema (Light/Dark)', category: 'actions', action: () => {} },

  // Selection
  { keys: 'j', description: 'Seleccionar Siguiente', category: 'selection', action: () => {} },
  { keys: 'k', description: 'Seleccionar Anterior', category: 'selection', action: () => {} },
  { keys: 'Enter', description: 'Abrir Seleccionado', category: 'selection', action: () => {} },
  { keys: 'a → a', description: 'Aprobar Seleccionados', category: 'actions', action: () => {} },
  { keys: 'a → r', description: 'Rechazar Seleccionados', category: 'actions', action: () => {} },

  // Search
  { keys: '/', description: 'Buscar', category: 'search', action: () => {} },
  { keys: 'Cmd+K', description: 'Abrir Command Palette', category: 'search', action: () => {} },
  { keys: 'Esc', description: 'Cerrar Diálogos', category: 'navigation', action: () => {} },
  { keys: '?', description: 'Mostrar Ayuda de Shortcuts', category: 'navigation', action: () => {} },
];
