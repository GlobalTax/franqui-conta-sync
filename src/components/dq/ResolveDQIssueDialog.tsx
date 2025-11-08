import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useResolveDQIssue } from "@/hooks/useDQIssues";

interface ResolveDQIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issueId: string;
  onResolved?: () => void;
}

export function ResolveDQIssueDialog({
  open,
  onOpenChange,
  issueId,
  onResolved,
}: ResolveDQIssueDialogProps) {
  const [notas, setNotas] = useState("");
  const resolveIssue = useResolveDQIssue();

  const handleResolve = async () => {
    await resolveIssue.mutateAsync({ id: issueId, notas });
    setNotas("");
    onOpenChange(false);
    onResolved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolver Issue de Calidad</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notas">Notas de Resolución (opcional)</Label>
            <Textarea
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Describe cómo se resolvió el problema..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleResolve} disabled={resolveIssue.isPending}>
              {resolveIssue.isPending ? "Resolviendo..." : "Marcar como Resuelto"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
