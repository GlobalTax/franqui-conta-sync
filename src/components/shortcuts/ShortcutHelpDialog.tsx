// ============================================================================
// SHORTCUT HELP DIALOG - Visual guide for keyboard shortcuts
// ============================================================================

import { useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Keyboard, Command } from 'lucide-react';
import { SHORTCUTS_LIST } from '@/lib/shortcuts/ShortcutManager';

export function ShortcutHelpDialog() {
  const [open, setOpen] = useState(false);

  // Toggle help dialog with "?"
  useHotkeys('shift+/', () => setOpen(!open), { 
    description: 'Show Shortcuts Help',
    scopes: ['global']
  });

  // Close with Escape
  useHotkeys('escape', () => setOpen(false), { 
    description: 'Close Dialog',
    enabled: open
  });

  const categories = {
    navigation: SHORTCUTS_LIST.filter(s => s.category === 'navigation'),
    actions: SHORTCUTS_LIST.filter(s => s.category === 'actions'),
    selection: SHORTCUTS_LIST.filter(s => s.category === 'selection'),
    search: SHORTCUTS_LIST.filter(s => s.category === 'search'),
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            Atajos de Teclado
          </DialogTitle>
          <DialogDescription>
            Navega y ejecuta acciones rápidamente sin usar el mouse
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Navigation */}
          <section>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Command className="h-4 w-4" />
              Navegación (g + tecla)
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {categories.navigation.map((shortcut) => (
                <ShortcutItem key={shortcut.keys} {...shortcut} />
              ))}
            </div>
          </section>

          {/* Actions */}
          <section>
            <h3 className="text-sm font-semibold mb-3">
              Acciones Rápidas (n + tecla para "Nuevo")
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {categories.actions.map((shortcut) => (
                <ShortcutItem key={shortcut.keys} {...shortcut} />
              ))}
            </div>
          </section>

          {/* Selection */}
          <section>
            <h3 className="text-sm font-semibold mb-3">
              Selección en Listas
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {categories.selection.map((shortcut) => (
                <ShortcutItem key={shortcut.keys} {...shortcut} />
              ))}
            </div>
          </section>

          {/* Search */}
          <section>
            <h3 className="text-sm font-semibold mb-3">
              Búsqueda
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {categories.search.map((shortcut) => (
                <ShortcutItem key={shortcut.keys} {...shortcut} />
              ))}
            </div>
          </section>
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Tip:</strong> Presiona <Badge variant="outline">?</Badge> en cualquier momento para ver esta ayuda
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ShortcutItem({ keys, description }: { keys: string; description: string }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors">
      <span className="text-sm">{description}</span>
      <div className="flex gap-1">
        {keys.split(' → ').map((key, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-muted-foreground text-xs">→</span>}
            <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5">
              {key}
            </Badge>
          </span>
        ))}
      </div>
    </div>
  );
}
