// ============================================================================
// PAGE: Provisions - Gestión de provisiones de gastos
// ============================================================================

import { useState } from "react";
import { Plus, FileSpreadsheet, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProvisionForm } from "@/components/provisions/ProvisionForm";
import { ProvisionsList } from "@/components/provisions/ProvisionsList";
import { TemplatesList } from "@/components/provisions/TemplatesList";
import { useProvisions } from "@/hooks/useProvisions";
import { useProvisionTemplates, type ProvisionTemplate } from "@/hooks/useProvisionTemplates";
import { useProvisionPosting } from "@/hooks/useProvisionPosting";

export default function Provisions() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ProvisionTemplate | undefined>();

  const {
    provisions,
    isLoading,
    createProvision,
    deleteProvision,
    isCreating,
  } = useProvisions();

  const { templates, deleteTemplate } = useProvisionTemplates();
  const { postProvision, cancelProvision } = useProvisionPosting();

  const handleCreateProvision = async (data: any) => {
    await createProvision(data);
    setIsFormOpen(false);
    setSelectedTemplate(undefined);
  };

  const handleUseTemplate = (template: ProvisionTemplate) => {
    setSelectedTemplate(template);
    setIsFormOpen(true);
  };

  const handlePost = async (id: string) => {
    await postProvision({ provisionId: id });
  };

  const handleCancel = async (id: string, reason: string) => {
    await cancelProvision({ provisionId: id, reason });
  };

  const draftProvisions = provisions.filter((p) => p.status === "draft");
  const activeProvisions = provisions.filter((p) => p.status === "active");
  const completedProvisions = provisions.filter(
    (p) => p.status === "invoiced" || p.status === "cancelled"
  );

  const totalActive = activeProvisions.reduce((sum, p) => sum + p.amount, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando provisiones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Provisiones de Gastos</h1>
          <p className="text-muted-foreground">
            Registra gastos estimados para el cierre mensual del P&L
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva provisión
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total provisiones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{provisions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Borradores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-600">{draftProvisions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{activeProvisions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Importe total activo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {totalActive.toLocaleString("es-ES", {
                style: "currency",
                currency: "EUR",
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Content */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">
            Activas ({activeProvisions.length})
          </TabsTrigger>
          <TabsTrigger value="draft">
            Borradores ({draftProvisions.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completadas ({completedProvisions.length})
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Receipt className="h-4 w-4 mr-2" />
            Plantillas ({templates.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <ProvisionsList
            provisions={activeProvisions}
            onPost={handlePost}
            onCancel={handleCancel}
            onDelete={deleteProvision}
          />
        </TabsContent>

        <TabsContent value="draft" className="space-y-4">
          <ProvisionsList
            provisions={draftProvisions}
            onPost={handlePost}
            onCancel={handleCancel}
            onDelete={deleteProvision}
          />
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <ProvisionsList
            provisions={completedProvisions}
            onPost={handlePost}
            onCancel={handleCancel}
            onDelete={deleteProvision}
          />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <TemplatesList
            templates={templates}
            onUseTemplate={handleUseTemplate}
            onDelete={deleteTemplate}
          />
        </TabsContent>
      </Tabs>

      {/* Dialog formulario */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? `Provisión desde: ${selectedTemplate.template_name}` : "Nueva provisión"}
            </DialogTitle>
          </DialogHeader>
          <ProvisionForm
            onSubmit={handleCreateProvision}
            onCancel={() => {
              setIsFormOpen(false);
              setSelectedTemplate(undefined);
            }}
            isSubmitting={isCreating}
            template={selectedTemplate}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
