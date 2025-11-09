import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PLRulesTable } from "@/components/pl/PLRulesTable";
import { PLRuleFormDialog } from "@/components/pl/PLRuleFormDialog";
import { UnmappedAccountsPanel } from "@/components/pl/UnmappedAccountsPanel";
import { usePLTemplates } from "@/hooks/usePLTemplates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, FileText } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const PLRulesManagement = () => {
  const { data: templates, isLoading: isLoadingTemplates } = usePLTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("PGC_2025");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  const handleCreateRule = () => {
    setEditingRule(null);
    setIsFormOpen(true);
  };

  const handleEditRule = (rule: any) => {
    setEditingRule(rule);
    setIsFormOpen(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reglas de Mapeo P&L</h1>
          <p className="text-muted-foreground mt-1">
            Asocia cuentas del PGC a rubros de PyG según plantillas
          </p>
        </div>
        <Button onClick={handleCreateRule}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Regla
        </Button>
      </div>

      {/* Template Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">
                Plantilla de P&L
              </label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map((t) => (
                    <SelectItem key={t.id} value={t.code}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Badge variant="outline" className="h-fit">
              {templates?.find(t => t.code === selectedTemplate)?.code}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Alert de ayuda */}
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          <strong>Prioridad:</strong> Número más bajo = más específico. 
          Ej: <code className="bg-muted px-1">606%</code> (prioridad 5) gana sobre <code className="bg-muted px-1">60%</code> (prioridad 10).
        </AlertDescription>
      </Alert>

      {/* Tabs: Reglas vs Cuentas sin Mapear */}
      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules">Reglas de Mapeo</TabsTrigger>
          <TabsTrigger value="unmapped">
            Cuentas sin Mapear
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          <PLRulesTable
            templateCode={selectedTemplate}
            onEdit={handleEditRule}
          />
        </TabsContent>

        <TabsContent value="unmapped">
          <UnmappedAccountsPanel
            templateCode={selectedTemplate}
          />
        </TabsContent>
      </Tabs>

      {/* Dialog Form */}
      <PLRuleFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        templateCode={selectedTemplate}
        editingRule={editingRule}
      />
    </div>
  );
};

export default PLRulesManagement;
