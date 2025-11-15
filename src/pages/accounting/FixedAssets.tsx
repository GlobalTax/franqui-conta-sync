import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFixedAssets, useCreateFixedAsset, useUpdateFixedAsset, useDeleteFixedAsset, FixedAsset } from "@/hooks/useFixedAssets";
import { AssetForm, AssetFormData } from "@/components/fixed-assets/AssetForm";
import { AssetsList } from "@/components/fixed-assets/AssetsList";
import { DepreciationSchedule } from "@/components/fixed-assets/DepreciationSchedule";
import { BulkDepreciationCalc } from "@/components/fixed-assets/BulkDepreciationCalc";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useView } from "@/contexts/ViewContext";
import { useNavigate } from "react-router-dom";

export default function FixedAssets() {
  const { selectedView } = useView();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("active");
  const [showForm, setShowForm] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<FixedAsset | null>(null);

  const { data: assets, isLoading } = useFixedAssets(activeTab);
  const createMutation = useCreateFixedAsset();
  const updateMutation = useUpdateFixedAsset();
  const deleteMutation = useDeleteFixedAsset();

  const breadcrumbs = [
    { label: "Contabilidad", href: "/contabilidad/apuntes" },
    { label: "Activos Fijos" },
  ];

  if (!selectedView || selectedView.type !== 'centre') {
    return (
      <div className="container mx-auto py-6">
        <PageHeader title="Activos Fijos" breadcrumbs={breadcrumbs} />
        <Alert>
          <AlertDescription>
            Selecciona un centro para gestionar activos fijos.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleCreate = () => {
    setSelectedAsset(null);
    setShowForm(true);
  };

  const handleEdit = (asset: FixedAsset) => {
    setSelectedAsset(asset);
    setShowForm(true);
  };

  const handleView = (asset: FixedAsset) => {
    setSelectedAsset(asset);
    setShowSchedule(true);
  };

  const handleDelete = async (assetId: string) => {
    if (confirm("¿Estás seguro de eliminar este activo fijo?")) {
      await deleteMutation.mutateAsync(assetId);
    }
  };

  const handleSubmit = async (data: AssetFormData) => {
    if (selectedAsset) {
      await updateMutation.mutateAsync({ id: selectedAsset.id, ...data });
    } else {
      await createMutation.mutateAsync({
        ...data,
        centro_code: selectedView.id,
      } as any);
    }
    setShowForm(false);
    setSelectedAsset(null);
  };

  const activeAssets = assets?.filter(a => a.status === 'active') || [];
  const depreciatedAssets = assets?.filter(a => a.status === 'fully_depreciated') || [];
  const disposedAssets = assets?.filter(a => a.status === 'disposed') || [];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground mb-1 tracking-tight">
              Activos Fijos
            </h1>
            <p className="text-sm text-muted-foreground">
              Gestión y amortización de inmovilizado material
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/reportes/libro-bienes')}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              Libro de Bienes
            </Button>
            <Button size="sm" onClick={handleCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Activo
            </Button>
          </div>
        </div>

        {/* Cálculo mensual */}
        <BulkDepreciationCalc />

        {/* Tabs de activos */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="active">
              Activos ({activeAssets.length})
            </TabsTrigger>
            <TabsTrigger value="fully_depreciated">
              Amortizados ({depreciatedAssets.length})
            </TabsTrigger>
            <TabsTrigger value="disposed">
              Dados de baja ({disposedAssets.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Cargando activos...
              </div>
            ) : (
              <AssetsList
                assets={activeAssets}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )}
          </TabsContent>

          <TabsContent value="fully_depreciated" className="mt-6">
            <AssetsList
              assets={depreciatedAssets}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </TabsContent>

          <TabsContent value="disposed" className="mt-6">
            <AssetsList
              assets={disposedAssets}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog formulario */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedAsset ? "Editar activo fijo" : "Nuevo activo fijo"}
            </DialogTitle>
            <DialogDescription>
              {selectedAsset ? "Modifica los datos del activo" : "Registra un nuevo activo fijo"}
            </DialogDescription>
          </DialogHeader>
          <AssetForm
            asset={selectedAsset || undefined}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setSelectedAsset(null);
            }}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog cuadro amortización */}
      <Dialog open={showSchedule} onOpenChange={setShowSchedule}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cuadro de Amortización</DialogTitle>
            <DialogDescription>
              Proyección completa de amortización del activo
            </DialogDescription>
          </DialogHeader>
          {selectedAsset && <DepreciationSchedule asset={selectedAsset} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
