import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreatePLRule, useUpdatePLRule } from "@/hooks/usePLRules";
import { usePLRubrics, usePLTemplate } from "@/hooks/usePLTemplates";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import type { PLRuleMatchKind } from "@/types/profit-loss";

interface PLRuleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateCode: string;
  editingRule?: any;
}

export const PLRuleFormDialog = ({
  open,
  onOpenChange,
  templateCode,
  editingRule,
}: PLRuleFormDialogProps) => {
  const { data: template } = usePLTemplate(templateCode);
  const { data: rubrics } = usePLRubrics(template?.id || "");
  const createMutation = useCreatePLRule();
  const updateMutation = useUpdatePLRule();

  const [formData, setFormData] = useState({
    rubric_code: "",
    priority: 100,
    match_kind: "account_like" as PLRuleMatchKind,
    account: "",
    account_like: "",
    account_from: "",
    account_to: "",
    group_code: "",
    channel: "",
    notes: "",
  });

  useEffect(() => {
    if (editingRule) {
      setFormData({
        rubric_code: editingRule.rubric_code,
        priority: editingRule.priority,
        match_kind: editingRule.match_kind,
        account: editingRule.account || "",
        account_like: editingRule.account_like || "",
        account_from: editingRule.account_from || "",
        account_to: editingRule.account_to || "",
        group_code: editingRule.group_code || "",
        channel: editingRule.channel || "",
        notes: editingRule.notes || "",
      });
    } else {
      setFormData({
        rubric_code: "",
        priority: 100,
        match_kind: "account_like",
        account: "",
        account_like: "",
        account_from: "",
        account_to: "",
        group_code: "",
        channel: "",
        notes: "",
      });
    }
  }, [editingRule, open]);

  const handleSubmit = async () => {
    if (!formData.rubric_code) {
      toast.error("Selecciona un rubro destino");
      return;
    }

    if (formData.match_kind === "account_exact" && !formData.account) {
      toast.error("Ingresa una cuenta exacta");
      return;
    }
    if (formData.match_kind === "account_like" && !formData.account_like) {
      toast.error("Ingresa un patrón de cuenta (ej: 60%)");
      return;
    }

    const payload: any = {
      template_id: template?.id,
      rubric_code: formData.rubric_code,
      priority: formData.priority,
      match_kind: formData.match_kind,
      notes: formData.notes,
    };

    if (formData.match_kind === "account_exact") payload.account = formData.account;
    if (formData.match_kind === "account_like") payload.account_like = formData.account_like;
    if (formData.match_kind === "account_range") {
      payload.account_from = formData.account_from;
      payload.account_to = formData.account_to;
    }
    if (formData.match_kind === "group") payload.group_code = formData.group_code;
    if (formData.match_kind === "channel") payload.channel = formData.channel;

    try {
      if (editingRule) {
        await updateMutation.mutateAsync({ id: editingRule.id, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingRule ? "Editar Regla" : "Nueva Regla de Mapeo"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Rubro Destino */}
          <div>
            <Label>Rubro Destino *</Label>
            <Select
              value={formData.rubric_code}
              onValueChange={(value) => setFormData({ ...formData, rubric_code: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un rubro" />
              </SelectTrigger>
              <SelectContent>
                {rubrics?.map((r: any) => (
                  <SelectItem key={r.code} value={r.code}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{r.code}</span>
                      <span>{r.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Prioridad */}
          <div>
            <Label>Prioridad *</Label>
            <Input
              type="number"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Menor = más específico (ej: 5 gana sobre 10)
            </p>
          </div>

          {/* Tipo de Match */}
          <div>
            <Label>Tipo de Mapeo *</Label>
            <Select
              value={formData.match_kind}
              onValueChange={(value: PLRuleMatchKind) => setFormData({ ...formData, match_kind: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="account_like">Prefijo PGC (70%, 606%)</SelectItem>
                <SelectItem value="account_exact">Cuenta Exacta (7000000)</SelectItem>
                <SelectItem value="account_range">Rango de Cuentas</SelectItem>
                <SelectItem value="group">Grupo PGC (60, 606, 642)</SelectItem>
                <SelectItem value="channel">Canal (in_store, delivery)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Campos dinámicos según match_kind */}
          {formData.match_kind === "account_exact" && (
            <div>
              <Label>Cuenta Exacta *</Label>
              <Input
                placeholder="7000000"
                value={formData.account}
                onChange={(e) => setFormData({ ...formData, account: e.target.value })}
              />
            </div>
          )}

          {formData.match_kind === "account_like" && (
            <div>
              <Label>Patrón de Cuenta *</Label>
              <Input
                placeholder="70%, 606%, 6400%"
                value={formData.account_like}
                onChange={(e) => setFormData({ ...formData, account_like: e.target.value })}
              />
              <Alert className="mt-2">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Usa <code>%</code> como comodín. Ej: <code>606%</code> captura 6060000, 6060001, etc.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {formData.match_kind === "account_range" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Desde *</Label>
                <Input
                  placeholder="6000000"
                  value={formData.account_from}
                  onChange={(e) => setFormData({ ...formData, account_from: e.target.value })}
                />
              </div>
              <div>
                <Label>Hasta *</Label>
                <Input
                  placeholder="6099999"
                  value={formData.account_to}
                  onChange={(e) => setFormData({ ...formData, account_to: e.target.value })}
                />
              </div>
            </div>
          )}

          {formData.match_kind === "group" && (
            <div>
              <Label>Código de Grupo PGC *</Label>
              <Input
                placeholder="60, 606, 642"
                value={formData.group_code}
                onChange={(e) => setFormData({ ...formData, group_code: e.target.value })}
              />
            </div>
          )}

          {formData.match_kind === "channel" && (
            <div>
              <Label>Canal *</Label>
              <Select
                value={formData.channel}
                onValueChange={(value) => setFormData({ ...formData, channel: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un canal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_store">In Store</SelectItem>
                  <SelectItem value="drive_thru">Drive Thru</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                  <SelectItem value="kiosk">Kiosko</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Notas */}
          <div>
            <Label>Notas (opcional)</Label>
            <Textarea
              placeholder="Justificación o comentarios sobre esta regla..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            {editingRule ? "Guardar Cambios" : "Crear Regla"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
