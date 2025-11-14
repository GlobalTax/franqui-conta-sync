import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Building2, Mail, Phone, MapPin } from "lucide-react";
import { useSuppliers, useDeleteSupplier } from "@/hooks/useSuppliers";
import { Badge } from "@/components/ui/badge";
import { SupplierFormDialog } from "@/components/suppliers/SupplierFormDialog";
import type { Supplier } from "@/hooks/useSuppliers";

const Suppliers = () => {
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const { data: suppliers, isLoading } = useSuppliers({ search, active: true });
  const deleteSupplier = useDeleteSupplier();

  const handleOpenDialog = (supplier?: Supplier) => {
    setEditingSupplier(supplier || null);
    setShowDialog(true);
  };

  const handleDeactivate = async (id: string) => {
    if (confirm("¿Estás seguro de que quieres desactivar este proveedor?")) {
      await deleteSupplier.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando proveedores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Proveedores
            </h1>
            <p className="text-muted-foreground mt-2">
              Gestión de proveedores y datos fiscales
            </p>
          </div>
          <Button className="gap-2" onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4" />
            Nuevo Proveedor
          </Button>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, CIF o nombre comercial..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
          <div className="p-4">
            {!suppliers || suppliers.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">No hay proveedores</h3>
                <p className="text-muted-foreground mt-2">
                  {search ? "No se encontraron proveedores con ese criterio" : "Comienza creando tu primer proveedor"}
                </p>
                {!search && (
                  <Button className="mt-4 gap-2" onClick={() => handleOpenDialog()}>
                    <Plus className="h-4 w-4" />
                    Nuevo Proveedor
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {suppliers.map((supplier) => (
                  <div
                    key={supplier.id}
                    className="rounded-lg border border-border p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                          <Building2 className="h-6 w-6 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-foreground">{supplier.name}</p>
                            {supplier.commercial_name && (
                              <Badge variant="outline" className="text-xs">
                                {supplier.commercial_name}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">CIF: {supplier.tax_id}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {supplier.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {supplier.email}
                              </div>
                            )}
                            {supplier.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {supplier.phone}
                              </div>
                            )}
                            {supplier.city && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {supplier.city}
                              </div>
                            )}
                          </div>
                          {supplier.default_account_code && (
                            <p className="text-sm text-muted-foreground">
                              Cuenta PGC: {supplier.default_account_code}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Plazo de pago: {supplier.payment_terms} días
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(supplier)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeactivate(supplier.id)}
                        >
                          Desactivar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <SupplierFormDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        editingSupplier={editingSupplier}
        onSuccess={() => {
          setShowDialog(false);
        }}
      />
    </div>
  );
};

export default Suppliers;
