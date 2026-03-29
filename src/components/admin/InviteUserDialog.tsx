import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useFranchisees } from "@/hooks/useFranchisees";
import { useAllUserCentres } from "@/hooks/useAllUserCentres";

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const InviteUserDialog = ({ open, onOpenChange, onSuccess }: InviteUserDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("gestor");
  const [franchiseeId, setFranchiseeId] = useState<string>("");
  const [centroCode, setCentroCode] = useState<string>("");

  const { data: franchisees } = useFranchisees();
  const { data: franchiseesWithCentres } = useAllUserCentres();

  // Get centres for selected franchisee
  const selectedFranchiseeCentres = franchiseesWithCentres?.find(
    f => f.id === franchiseeId
  )?.centres || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-invite", {
        body: { 
          email, 
          role,
          franchisee_id: franchiseeId || undefined,
          centro: centroCode || undefined,
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Invitación enviada",
        description: `Se ha enviado una invitación a ${email}`,
      });
      
      setEmail("");
      setRole("gestor");
      setFranchiseeId("");
      setCentroCode("");
      onOpenChange(false);
      onSuccess();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo enviar la invitación",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const needsFranchisee = ["gestor", "franquiciado", "empleado"].includes(role);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invitar Usuario</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@example.com"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="role">Rol</Label>
            <Select value={role} onValueChange={(v) => {
              setRole(v);
              if (v === "admin") {
                setFranchiseeId("");
                setCentroCode("");
              }
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Asesoría (Admin)</SelectItem>
                <SelectItem value="gestor">Gestor</SelectItem>
                <SelectItem value="franquiciado">Franquiciado</SelectItem>
                <SelectItem value="empleado">Empleado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {needsFranchisee && (
            <div className="grid gap-2">
              <Label>Franquiciado</Label>
              <Select value={franchiseeId} onValueChange={(v) => {
                setFranchiseeId(v);
                setCentroCode("");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar franquiciado..." />
                </SelectTrigger>
                <SelectContent>
                  {franchisees?.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {needsFranchisee && franchiseeId && selectedFranchiseeCentres.length > 0 && (
            <div className="grid gap-2">
              <Label>Restaurante <span className="text-muted-foreground text-xs">(opcional — todos si vacío)</span></Label>
              <Select value={centroCode} onValueChange={setCentroCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los restaurantes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los restaurantes</SelectItem>
                  {selectedFranchiseeCentres.map(c => (
                    <SelectItem key={c.id} value={c.codigo}>
                      {c.codigo} - {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Enviando..." : "Enviar Invitación"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InviteUserDialog;
