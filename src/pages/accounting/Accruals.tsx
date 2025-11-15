// ============================================================================
// PAGE: Accruals - Gestión de periodificaciones
// ============================================================================

import { useState } from "react";
import { Plus, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccrualForm } from "@/components/accruals/AccrualForm";
import { AccrualsList } from "@/components/accruals/AccrualsList";
import { AccrualCalendar } from "@/components/accruals/AccrualCalendar";
import { useAccruals, useAccrualEntries, type Accrual } from "@/hooks/useAccruals";
import { useAccrualPosting } from "@/hooks/useAccrualPosting";

export default function Accruals() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAccrual, setSelectedAccrual] = useState<Accrual | null>(null);

  const {
    accruals,
    isLoading,
    createAccrual,
    deleteAccrual,
    isCreating,
  } = useAccruals();

  const { data: entries = [] } = useAccrualEntries(selectedAccrual?.id || null);
  const { generateEntries, postEntry, isGenerating, isPosting } = useAccrualPosting();

  const handleCreateAccrual = async (data: any) => {
    await createAccrual({ ...data, status: "active" });
    setIsFormOpen(false);
  };

  const handleGenerate = async (accrualId: string) => {
    await generateEntries({ accrualId });
  };

  const handlePostEntry = async (entryId: string) => {
    if (!selectedAccrual) return;
    await postEntry({ entryId, accrualId: selectedAccrual.id });
  };

  const activeAccruals = accruals.filter((a) => a.status === "active");
  const completedAccruals = accruals.filter((a) => a.status === "completed");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando periodificaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Periodificaciones</h1>
          <p className="text-muted-foreground">
            Gestiona la distribución de gastos e ingresos en varios periodos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva periodificación
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total periodificaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{accruals.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{activeAccruals.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{completedAccruals.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Asientos generados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{entries.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Content */}
      {selectedAccrual ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Calendario de periodificación</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedAccrual.description}
                </p>
              </div>
              <Button variant="outline" onClick={() => setSelectedAccrual(null)}>
                ← Volver
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <AccrualCalendar
              entries={entries}
              onPost={handlePostEntry}
              isPosting={isPosting}
            />
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active">
              Activas ({activeAccruals.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completadas ({completedAccruals.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            <AccrualsList
              accruals={activeAccruals}
              onView={setSelectedAccrual}
              onDelete={deleteAccrual}
              onGenerate={handleGenerate}
            />
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            <AccrualsList
              accruals={completedAccruals}
              onView={setSelectedAccrual}
              onDelete={deleteAccrual}
              onGenerate={handleGenerate}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Dialog formulario */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nueva periodificación</DialogTitle>
          </DialogHeader>
          <AccrualForm
            onSubmit={handleCreateAccrual}
            onCancel={() => setIsFormOpen(false)}
            isSubmitting={isCreating}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
