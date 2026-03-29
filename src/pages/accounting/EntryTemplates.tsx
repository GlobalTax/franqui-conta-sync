import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileText, Pencil, Trash2 } from "lucide-react";
import { useEntryTemplates, useCreateEntryTemplate, useDeleteEntryTemplate } from "@/hooks/useEntryTemplates";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useView } from "@/contexts/ViewContext";
import type { TemplateFormData } from "@/types/entry-templates";

const CATEGORY_LABELS: Record<string, string> = {
  compras: "Compras",
  ventas: "Ventas",
  tesoreria: "Tesorería",
  personal: "Personal",
  general: "General",
};

const EMPTY_LINE = { account_code: '', movement_type: 'debit' as const, amount_formula: '', description: '' };

export default function EntryTemplates() {
  const { selectedView } = useView();
  const { data: templates, isLoading } = useEntryTemplates();
  const createTemplate = useCreateEntryTemplate();
  const deleteTemplate = useDeleteEntryTemplate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '', description: '', category: 'general',
    lines: [{ ...EMPTY_LINE }, { ...EMPTY_LINE, movement_type: 'credit' }],
  });

  const handleDelete = () => {
    if (templateToDelete) {
      deleteTemplate.mutate(templateToDelete);
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  const openCreateDialog = () => {
    setFormData({
      name: '', description: '', category: 'general',
      lines: [{ ...EMPTY_LINE }, { ...EMPTY_LINE, movement_type: 'credit' }],
    });
    setFormOpen(true);
  };

  const openEditDialog = (template: any) => {
    setFormData({
      name: template.name,
      description: template.description || '',
      category: template.category,
      lines: template.entry_template_lines.map((l: any) => ({
        account_code: l.account_code,
        movement_type: l.movement_type,
        amount_formula: l.amount_formula || '',
        description: l.description || '',
      })),
    });
    setFormOpen(true);
  };

  const addLine = () => {
    setFormData(prev => ({
      ...prev,
      lines: [...prev.lines, { ...EMPTY_LINE }],
    }));
  };

  const removeLine = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== idx),
    }));
  };

  const updateLine = (idx: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.map((l, i) => i === idx ? { ...l, [field]: value } : l),
    }));
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) return;
    if (formData.lines.length < 2) return;

    createTemplate.mutate(formData, {
      onSuccess: () => setFormOpen(false),
    });
  };

  const breadcrumbs = [
    { label: "Contabilidad", href: "/contabilidad/apuntes" },
    { label: "Plantillas de Asientos" },
  ];

  if (!selectedView) {
    return (
      <div className="container mx-auto py-6">
        <PageHeader title="Plantillas de Asientos" breadcrumbs={breadcrumbs} />
        <Alert>
          <AlertDescription>
            Selecciona una vista (centro o empresa) para gestionar las plantillas de asientos.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Plantillas de Asientos"
        breadcrumbs={breadcrumbs}
        actions={
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Plantilla
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Plantillas Disponibles</CardTitle>
          <CardDescription>
            Plantillas del sistema y personalizadas para tu organización
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : templates && templates.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Líneas</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="font-medium">{template.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {CATEGORY_LABELS[template.category] || template.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md truncate">
                      {template.description || "-"}
                    </TableCell>
                    <TableCell>
                      {template.entry_template_lines.length} líneas
                    </TableCell>
                    <TableCell>
                      {template.is_system ? (
                        <Badge variant="secondary">Sistema</Badge>
                      ) : (
                        <Badge variant="default">Personalizada</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {!template.is_system && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(template)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setTemplateToDelete(template.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                No hay plantillas disponibles
              </p>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Crear Primera Plantilla
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {formData.name ? 'Editar' : 'Nueva'} Plantilla de Asiento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nombre</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Compra mercancías"
                />
              </div>
              <div>
                <Label>Categoría</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descripción de la plantilla..."
                rows={2}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Líneas del asiento</Label>
                <Button size="sm" variant="outline" onClick={addLine}>
                  <Plus className="h-3 w-3 mr-1" /> Línea
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cuenta</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Fórmula</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formData.lines.map((line, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Input
                          value={line.account_code}
                          onChange={(e) => updateLine(idx, 'account_code', e.target.value)}
                          placeholder="6000000"
                          className="w-28"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={line.movement_type}
                          onValueChange={(v) => updateLine(idx, 'movement_type', v)}
                        >
                          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="debit">Debe</SelectItem>
                            <SelectItem value="credit">Haber</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={line.amount_formula}
                          onChange={(e) => updateLine(idx, 'amount_formula', e.target.value)}
                          placeholder="base, total..."
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={line.description}
                          onChange={(e) => updateLine(idx, 'description', e.target.value)}
                          placeholder="Descripción"
                        />
                      </TableCell>
                      <TableCell>
                        {formData.lines.length > 2 && (
                          <Button size="icon" variant="ghost" onClick={() => removeLine(idx)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createTemplate.isPending}>
              {createTemplate.isPending ? 'Guardando...' : 'Guardar Plantilla'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar plantilla?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La plantilla será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
