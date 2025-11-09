import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, GripVertical, Save, X } from "lucide-react";
import { usePLRules, useDeletePLRule, useUpdatePLRule } from "@/hooks/usePLRules";
import { usePLRubrics, usePLTemplate } from "@/hooks/usePLTemplates";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PLRulesTableProps {
  templateCode: string;
  onEdit: (rule: any) => void;
}

export const PLRulesTable = ({ templateCode, onEdit }: PLRulesTableProps) => {
  const { data: template } = usePLTemplate(templateCode);
  const { data: rules, isLoading } = usePLRules(template?.id || "");
  const { data: rubrics } = usePLRubrics(template?.id || "");
  const deleteMutation = useDeletePLRule();
  const updateMutation = useUpdatePLRule();

  const [selectedRules, setSelectedRules] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingPriority, setEditingPriority] = useState<string | null>(null);
  const [priorityValue, setPriorityValue] = useState<number>(0);
  const [filterRubric, setFilterRubric] = useState<string>("all");
  const [filterMatchKind, setFilterMatchKind] = useState<string>("all");

  const renderCondition = (rule: any) => {
    switch (rule.match_kind) {
      case "account_exact":
        return <code className="bg-muted px-2 py-1 rounded">{rule.account}</code>;
      case "account_like":
        return <code className="bg-primary/10 px-2 py-1 rounded text-primary">{rule.account_like}</code>;
      case "account_range":
        return <code className="bg-muted px-2 py-1 rounded">{rule.account_from} - {rule.account_to}</code>;
      case "group":
        return <code className="bg-secondary/50 px-2 py-1 rounded">{rule.group_code}*</code>;
      case "channel":
        return <Badge variant="outline">{rule.channel}</Badge>;
      case "centre":
        return <Badge variant="secondary">Centro específico</Badge>;
      default:
        return "—";
    }
  };

  const matchKindLabels: Record<string, string> = {
    account_exact: "Cuenta Exacta",
    account_like: "Prefijo PGC",
    account_range: "Rango",
    group: "Grupo",
    channel: "Canal",
    centre: "Centro",
  };

  const handleDeleteSelected = () => {
    if (selectedRules.length === 0) {
      toast.error("Selecciona al menos una regla");
      return;
    }
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    for (const ruleId of selectedRules) {
      await deleteMutation.mutateAsync(ruleId);
    }
    setSelectedRules([]);
    setDeleteDialogOpen(false);
    toast.success(`${selectedRules.length} regla(s) eliminada(s)`);
  };

  const handleSavePriority = async (ruleId: string) => {
    await updateMutation.mutateAsync({
      id: ruleId,
      priority: priorityValue,
    });
    setEditingPriority(null);
    toast.success("Prioridad actualizada");
  };

  const filteredRules = rules?.filter(r => {
    if (filterRubric !== "all" && r.rubric_code !== filterRubric) return false;
    if (filterMatchKind !== "all" && r.match_kind !== filterMatchKind) return false;
    return true;
  }) || [];

  if (isLoading) return <div>Cargando reglas...</div>;

  return (
    <>
      <Card className="p-6">
        {/* Filtros */}
        <div className="flex gap-4 mb-4">
          <Select value={filterRubric} onValueChange={setFilterRubric}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por rubro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los rubros</SelectItem>
              {rubrics?.map((r: any) => (
                <SelectItem key={r.code} value={r.code}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterMatchKind} onValueChange={setFilterMatchKind}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="account_like">Prefijo PGC</SelectItem>
              <SelectItem value="account_exact">Cuenta Exacta</SelectItem>
              <SelectItem value="group">Grupo</SelectItem>
              <SelectItem value="channel">Canal</SelectItem>
            </SelectContent>
          </Select>

          {selectedRules.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelected}
              className="ml-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar ({selectedRules.length})
            </Button>
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedRules.length === filteredRules.length && filteredRules.length > 0}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedRules(filteredRules.map(r => r.id));
                    } else {
                      setSelectedRules([]);
                    }
                  }}
                />
              </TableHead>
              <TableHead className="w-20">Orden</TableHead>
              <TableHead className="w-24">Prioridad</TableHead>
              <TableHead>Rubro Destino</TableHead>
              <TableHead>Tipo de Match</TableHead>
              <TableHead>Condición</TableHead>
              <TableHead className="w-32 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRules.map((rule, idx) => (
              <TableRow key={rule.id} className={selectedRules.includes(rule.id) ? "bg-muted/50" : ""}>
                <TableCell>
                  <Checkbox
                    checked={selectedRules.includes(rule.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedRules([...selectedRules, rule.id]);
                      } else {
                        setSelectedRules(selectedRules.filter(id => id !== rule.id));
                      }
                    }}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    <span className="text-sm font-mono text-muted-foreground">#{idx + 1}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {editingPriority === rule.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        className="w-16 h-8"
                        value={priorityValue}
                        onChange={(e) => setPriorityValue(parseInt(e.target.value))}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSavePriority(rule.id)}
                      >
                        <Save className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingPriority(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Badge
                      variant={rule.priority < 20 ? "default" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => {
                        setEditingPriority(rule.id);
                        setPriorityValue(rule.priority);
                      }}
                    >
                      {rule.priority}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{rule.rubric_code}</span>
                    <span className="font-medium">
                      {(rubrics as any)?.find((r: any) => r.code === rule.rubric_code)?.name || rule.rubric_code}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{matchKindLabels[rule.match_kind]}</Badge>
                </TableCell>
                <TableCell>{renderCondition(rule)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => onEdit(rule)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedRules([rule.id]);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredRules.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No se encontraron reglas para esta plantilla
          </div>
        )}
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar {selectedRules.length} regla(s)? 
              Las cuentas asociadas quedarán sin mapear.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
