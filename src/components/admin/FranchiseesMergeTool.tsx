import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Copy, AlertTriangle, ArrowRight, Building2, Users } from "lucide-react";

interface FranchiseesMergeToolProps {
  duplicate: {
    id: string;
    name: string;
    email: string;
    company_tax_id: string;
    duplicates: Array<{
      id: string;
      name: string;
      email: string;
      company_tax_id: string;
    }>;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const FranchiseesMergeTool = ({ 
  duplicate, 
  open, 
  onOpenChange,
  onSuccess 
}: FranchiseesMergeToolProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMain, setSelectedMain] = useState<string>(duplicate.id);
  const [relationsPreview, setRelationsPreview] = useState<{
    centres: number;
    companies: number;
  } | null>(null);

  const loadRelationsPreview = async () => {
    try {
      const duplicateIds = [duplicate.id, ...duplicate.duplicates.map(d => d.id)];
      
      const [centresResult, companiesResult] = await Promise.all([
        supabase.from("centres").select("id").in("franchisee_id", duplicateIds),
        supabase.from("companies").select("id").in("franchisee_id", duplicateIds)
      ]);

      setRelationsPreview({
        centres: centresResult.data?.length || 0,
        companies: companiesResult.data?.length || 0,
      });
    } catch (error) {
      console.error("Error loading relations preview:", error);
    }
  };

  const handleMerge = async () => {
    setIsLoading(true);
    
    try {
      const duplicateIds = duplicate.duplicates.map(d => d.id);
      
      // 1. Migrar centros
      const { error: centresError } = await supabase
        .from("centres")
        .update({ franchisee_id: selectedMain })
        .in("franchisee_id", duplicateIds);

      if (centresError) throw centresError;

      // 2. Migrar companies
      const { error: companiesError } = await supabase
        .from("companies")
        .update({ franchisee_id: selectedMain })
        .in("franchisee_id", duplicateIds);

      if (companiesError) throw companiesError;

      // 3. Migrar user_roles si existen
      const { error: rolesError } = await supabase
        .from("user_roles")
        .update({ franchisee_id: selectedMain })
        .in("franchisee_id", duplicateIds)
        .not("franchisee_id", "is", null);

      if (rolesError) throw rolesError;

      // 4. Eliminar duplicados
      const { error: deleteError } = await supabase
        .from("franchisees")
        .delete()
        .in("id", duplicateIds);

      if (deleteError) throw deleteError;

      toast({
        title: "Fusión exitosa",
        description: `${duplicateIds.length} franquiciado${duplicateIds.length > 1 ? 's' : ''} fusionado${duplicateIds.length > 1 ? 's' : ''} correctamente`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error merging franchisees:", error);
      toast({
        title: "Error en la fusión",
        description: error.message || "No se pudieron fusionar los franquiciados",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useState(() => {
    if (open) {
      loadRelationsPreview();
    }
  });

  const allFranchisees = [
    { ...duplicate, id: duplicate.id },
    ...duplicate.duplicates
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Fusionar Franquiciados Duplicados
          </DialogTitle>
          <DialogDescription>
            Selecciona el registro principal y fusiona todos los duplicados. 
            Todas las relaciones (centros, sociedades) se migrarán al registro principal.
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-900 dark:text-yellow-100">
            Esta acción no se puede deshacer
          </AlertTitle>
          <AlertDescription className="text-yellow-800 dark:text-yellow-200">
            Los franquiciados duplicados serán eliminados permanentemente después de migrar sus relaciones.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-3">Selecciona el registro principal:</h3>
            <div className="space-y-2">
              {allFranchisees.map((f) => (
                <Card
                  key={f.id}
                  className={`cursor-pointer transition-all ${
                    selectedMain === f.id
                      ? "border-primary border-2 bg-primary/5"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedMain(f.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{f.name}</h4>
                          {selectedMain === f.id && (
                            <Badge variant="default">Principal</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Email: {f.email || "Sin email"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          CIF: {f.company_tax_id || "Sin CIF"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {relationsPreview && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Vista Previa de la Fusión</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>Centros que se migrarán:</span>
                  </div>
                  <Badge variant="outline">{relationsPreview.centres}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>Sociedades que se migrarán:</span>
                  </div>
                  <Badge variant="outline">{relationsPreview.companies}</Badge>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">
                    <strong>{duplicate.duplicates.length}</strong> registro{duplicate.duplicates.length > 1 ? 's' : ''} 
                    duplicado{duplicate.duplicates.length > 1 ? 's' : ''} será{duplicate.duplicates.length > 1 ? 'n' : ''} eliminado{duplicate.duplicates.length > 1 ? 's' : ''}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleMerge}
            disabled={isLoading}
          >
            {isLoading ? "Fusionando..." : (
              <>
                <ArrowRight className="h-4 w-4 mr-2" />
                Fusionar Franquiciados
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
