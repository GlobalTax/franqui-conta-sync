// ============================================================================
// COMPONENT: TemplatesList - Lista de plantillas de provisiones
// ============================================================================

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { ProvisionTemplate } from "@/hooks/useProvisionTemplates";

interface TemplatesListProps {
  templates: ProvisionTemplate[];
  onUseTemplate: (template: ProvisionTemplate) => void;
  onDelete: (id: string) => void;
}

export function TemplatesList({
  templates,
  onUseTemplate,
  onDelete,
}: TemplatesListProps) {
  if (templates.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No hay plantillas guardadas</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((template) => (
        <Card key={template.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <CardTitle className="text-base">{template.template_name}</CardTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(template.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {template.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {template.description}
              </p>
            )}

            <div className="space-y-1 text-sm">
              {template.supplier_name && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Proveedor:</span>
                  <span className="font-medium">{template.supplier_name}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-muted-foreground">Cuenta gasto:</span>
                <Badge variant="outline">{template.expense_account}</Badge>
              </div>

              {template.default_amount && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Importe sugerido:</span>
                  <span className="font-mono font-medium">
                    {formatCurrency(template.default_amount)}
                  </span>
                </div>
              )}
            </div>

            <Button
              className="w-full"
              variant="outline"
              onClick={() => onUseTemplate(template)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Usar plantilla
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
