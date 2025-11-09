import { useEffect } from 'react';

interface UseInvoiceHotkeysProps {
  onSearch?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onEdit?: () => void;
  onNew?: () => void;
  onClose?: () => void;
  onNavigateUp?: () => void;
  onNavigateDown?: () => void;
  onSelect?: () => void;
  enabled?: boolean;
}

export function useInvoiceHotkeys({
  onSearch,
  onApprove,
  onReject,
  onEdit,
  onNew,
  onClose,
  onNavigateUp,
  onNavigateDown,
  onSelect,
  enabled = true,
}: UseInvoiceHotkeysProps) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K → Búsqueda rápida
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onSearch?.();
        return;
      }

      // Escape → Cerrar panel
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
        return;
      }

      // A → Aprobar
      if (e.key === 'a' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        onApprove?.();
        return;
      }

      // R → Rechazar
      if (e.key === 'r' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        onReject?.();
        return;
      }

      // E → Editar
      if (e.key === 'e' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        onEdit?.();
        return;
      }

      // N → Nueva factura
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        onNew?.();
        return;
      }

      // ↑ → Navegar arriba
      if (e.key === 'ArrowUp') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        onNavigateUp?.();
        return;
      }

      // ↓ → Navegar abajo
      if (e.key === 'ArrowDown') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        onNavigateDown?.();
        return;
      }

      // Enter → Seleccionar/Abrir
      if (e.key === 'Enter') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON') return;
        e.preventDefault();
        onSelect?.();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    enabled,
    onSearch,
    onApprove,
    onReject,
    onEdit,
    onNew,
    onClose,
    onNavigateUp,
    onNavigateDown,
    onSelect,
  ]);
}
