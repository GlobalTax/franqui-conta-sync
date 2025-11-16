// ============================================================================
// COMMAND PALETTE BUTTON - Visual button to trigger Cmd+K
// ============================================================================

import { Button } from '@/components/ui/button';
import { Search, Command } from 'lucide-react';

export function CommandPaletteButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="outline"
      className="relative flex items-center gap-2 text-muted-foreground"
      onClick={onClick}
    >
      <Search className="h-4 w-4" />
      <span className="hidden md:inline text-sm">Buscar...</span>
      <kbd className="hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
        <Command className="h-3 w-3" />K
      </kbd>
    </Button>
  );
}
