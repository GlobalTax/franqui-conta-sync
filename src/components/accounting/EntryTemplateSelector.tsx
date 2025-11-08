import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useEntryTemplates } from "@/hooks/useEntryTemplates";
import { EntryTemplateWithLines } from "@/types/entry-templates";
import { Badge } from "@/components/ui/badge";
import { FileText, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EntryTemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: EntryTemplateWithLines, amounts: Record<string, number>) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  compras: "Compras",
  ventas: "Ventas",
  tesoreria: "Tesorería",
  personal: "Personal",
  general: "General",
};

export function EntryTemplateSelector({
  open,
  onOpenChange,
  onSelectTemplate,
}: EntryTemplateSelectorProps) {
  const { data: templates, isLoading } = useEntryTemplates();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<EntryTemplateWithLines | null>(null);
  const [amounts, setAmounts] = useState<Record<string, number>>({});

  const filteredTemplates = templates?.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedTemplates = filteredTemplates?.reduce((acc, template) => {
    const category = template.category || "general";
    if (!acc[category]) acc[category] = [];
    acc[category].push(template);
    return acc;
  }, {} as Record<string, EntryTemplateWithLines[]>);

  const handleTemplateSelect = (template: EntryTemplateWithLines) => {
    setSelectedTemplate(template);
    // Initialize amounts
    const initialAmounts: Record<string, number> = {};
    const uniqueFormulas = [...new Set(template.entry_template_lines.map(l => l.amount_formula).filter(Boolean))];
    uniqueFormulas.forEach(formula => {
      if (formula === 'base' || formula === 'total') {
        initialAmounts[formula!] = 0;
      }
    });
    setAmounts(initialAmounts);
  };

  const handleApplyTemplate = () => {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate, amounts);
      onOpenChange(false);
      setSelectedTemplate(null);
      setAmounts({});
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Seleccionar Plantilla de Asiento</DialogTitle>
          <DialogDescription>
            Elige una plantilla predefinida para crear el asiento contable más rápido
          </DialogDescription>
        </DialogHeader>

        {!selectedTemplate ? (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar plantilla..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-[400px] pr-4">
              {isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-8">Cargando plantillas...</p>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedTemplates || {}).map(([category, categoryTemplates]) => (
                    <div key={category}>
                      <h3 className="text-sm font-semibold mb-3 text-foreground">
                        {CATEGORY_LABELS[category] || category}
                      </h3>
                      <div className="grid gap-2">
                        {categoryTemplates.map((template) => (
                          <button
                            key={template.id}
                            onClick={() => handleTemplateSelect(template)}
                            className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent transition-colors text-left"
                          >
                            <FileText className="h-5 w-5 text-primary mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-sm">{template.name}</p>
                                {template.is_system && (
                                  <Badge variant="secondary" className="text-xs">Sistema</Badge>
                                )}
                              </div>
                              {template.description && (
                                <p className="text-xs text-muted-foreground">{template.description}</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                {template.entry_template_lines.length} líneas
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-1">{selectedTemplate.name}</h3>
              <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
            </div>

            <div className="space-y-3">
              <Label>Importes</Label>
              {Object.keys(amounts).map((key) => (
                <div key={key} className="grid grid-cols-2 gap-2 items-center">
                  <Label htmlFor={key} className="text-sm">
                    {key === 'base' ? 'Base Imponible' : key === 'total' ? 'Importe Total' : key}:
                  </Label>
                  <Input
                    id={key}
                    type="number"
                    step="0.01"
                    value={amounts[key] || ''}
                    onChange={(e) => setAmounts({ ...amounts, [key]: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                Atrás
              </Button>
              <Button onClick={handleApplyTemplate}>
                Aplicar Plantilla
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
