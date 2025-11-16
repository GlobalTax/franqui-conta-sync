// ============================================================================
// MODULE-SPECIFIC SHORTCUTS - Context-aware keyboard shortcuts
// ============================================================================

import { useHotkeys } from 'react-hotkeys-hook';
import { toast } from 'sonner';

// ============================================================================
// INVOICE DETAIL SHORTCUTS
// ============================================================================

interface InvoiceDetailShortcutsProps {
  onEdit?: () => void;
  onDuplicate?: () => void;
  onPrint?: () => void;
  onSave?: () => void;
  onPost?: () => void;
  onDelete?: () => void;
  enabled?: boolean;
}

export function useInvoiceDetailShortcuts({
  onEdit,
  onDuplicate,
  onPrint,
  onSave,
  onPost,
  onDelete,
  enabled = true,
}: InvoiceDetailShortcutsProps = {}) {
  
  useHotkeys('e', () => {
    if (onEdit) {
      onEdit();
      toast.success('Modo edición');
    }
  }, { enabled, scopes: ['invoice-detail'] });

  useHotkeys('d', () => {
    if (onDuplicate) {
      onDuplicate();
      toast.success('Duplicando factura...');
    }
  }, { enabled, scopes: ['invoice-detail'] });

  useHotkeys('p', () => {
    if (onPrint) {
      onPrint();
      toast.success('Imprimiendo...');
    }
  }, { enabled, scopes: ['invoice-detail'] });

  useHotkeys('shift+s', (e) => {
    e.preventDefault();
    if (onSave) {
      onSave();
      toast.success('Guardando...');
    }
  }, { enabled, scopes: ['invoice-detail'], enableOnFormTags: true });

  useHotkeys('shift+p', (e) => {
    e.preventDefault();
    if (onPost) {
      onPost();
      toast.success('Contabilizando...');
    }
  }, { enabled, scopes: ['invoice-detail'], enableOnFormTags: true });

  useHotkeys('shift+delete', () => {
    if (onDelete) {
      onDelete();
    }
  }, { enabled, scopes: ['invoice-detail'] });
}

// ============================================================================
// INBOX SHORTCUTS
// ============================================================================

interface InboxShortcutsProps {
  onApprove?: () => void;
  onReject?: () => void;
  onIgnore?: () => void;
  onAssign?: () => void;
  enabled?: boolean;
}

export function useInboxShortcuts({
  onApprove,
  onReject,
  onIgnore,
  onAssign,
  enabled = true,
}: InboxShortcutsProps = {}) {
  
  useHotkeys('a', () => {
    if (onApprove) {
      onApprove();
      toast.success('Aprobando selección...');
    }
  }, { enabled, scopes: ['inbox'] });

  useHotkeys('r', () => {
    if (onReject) {
      onReject();
      toast.success('Rechazando selección...');
    }
  }, { enabled, scopes: ['inbox'] });

  useHotkeys('x', () => {
    if (onIgnore) {
      onIgnore();
      toast.success('Ignorando factura...');
    }
  }, { enabled, scopes: ['inbox'] });

  useHotkeys('i', () => {
    if (onAssign) {
      onAssign();
      toast.info('Asignar centro...');
    }
  }, { enabled, scopes: ['inbox'] });
}

// ============================================================================
// SUPPLIER SHORTCUTS
// ============================================================================

interface SupplierShortcutsProps {
  onEdit?: () => void;
  onNew?: () => void;
  onDelete?: () => void;
  enabled?: boolean;
}

export function useSupplierShortcuts({
  onEdit,
  onNew,
  onDelete,
  enabled = true,
}: SupplierShortcutsProps = {}) {
  
  useHotkeys('e', () => {
    if (onEdit) {
      onEdit();
      toast.success('Editando proveedor...');
    }
  }, { enabled, scopes: ['suppliers'] });

  useHotkeys('n', () => {
    if (onNew) {
      onNew();
      toast.success('Nuevo proveedor');
    }
  }, { enabled, scopes: ['suppliers'] });

  useHotkeys('delete', () => {
    if (onDelete) {
      onDelete();
    }
  }, { enabled, scopes: ['suppliers'] });
}

// ============================================================================
// BANK SHORTCUTS
// ============================================================================

interface BankShortcutsProps {
  onReconcile?: () => void;
  onMatch?: () => void;
  onImport?: () => void;
  enabled?: boolean;
}

export function useBankShortcuts({
  onReconcile,
  onMatch,
  onImport,
  enabled = true,
}: BankShortcutsProps = {}) {
  
  useHotkeys('r', () => {
    if (onReconcile) {
      onReconcile();
      toast.success('Conciliando...');
    }
  }, { enabled, scopes: ['banks'] });

  useHotkeys('m', () => {
    if (onMatch) {
      onMatch();
      toast.success('Matching automático...');
    }
  }, { enabled, scopes: ['banks'] });

  useHotkeys('i', () => {
    if (onImport) {
      onImport();
      toast.info('Importar extracto...');
    }
  }, { enabled, scopes: ['banks'] });
}

// ============================================================================
// ACCOUNTING ENTRY SHORTCUTS
// ============================================================================

interface EntryShortcutsProps {
  onSave?: () => void;
  onPost?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  enabled?: boolean;
}

export function useAccountingEntryShortcuts({
  onSave,
  onPost,
  onDuplicate,
  onDelete,
  enabled = true,
}: EntryShortcutsProps = {}) {
  
  useHotkeys('shift+s', (e) => {
    e.preventDefault();
    if (onSave) {
      onSave();
      toast.success('Guardando asiento...');
    }
  }, { enabled, scopes: ['entry'], enableOnFormTags: true });

  useHotkeys('shift+p', (e) => {
    e.preventDefault();
    if (onPost) {
      onPost();
      toast.success('Contabilizando asiento...');
    }
  }, { enabled, scopes: ['entry'], enableOnFormTags: true });

  useHotkeys('d', () => {
    if (onDuplicate) {
      onDuplicate();
      toast.success('Duplicando asiento...');
    }
  }, { enabled, scopes: ['entry'] });

  useHotkeys('shift+delete', () => {
    if (onDelete) {
      onDelete();
    }
  }, { enabled, scopes: ['entry'] });
}
