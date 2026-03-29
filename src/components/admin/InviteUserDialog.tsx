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
import { Copy, CheckCircle2, AlertTriangle } from "lucide-react";

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
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [emailFailed, setEmailFailed] = useState(false);

  const { data: franchisees } = useFranchisees();
  const { data: franchiseesWithCentres } = useAllUserCentres();

  const selectedFranchiseeCentres = franchiseesWithCentres?.find(
    f => f.id === franchiseeId
  )?.centres || [];

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    toast({
      title: "Enlace copiado",
      description: "El enlace de invitación se ha copiado al portapapeles",
    });
  };

  const resetForm = () => {
    setEmail("");
    setRole("gestor");
    setFranchiseeId("");
    setCentroCode("");
    setInviteLink(null);
    setEmailFailed(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setInviteLink(null);
    setEmailFailed(false);

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

      if (data?.email_sent) {
        toast({
          title: "Invitación enviada",
          description: `Se ha enviado una invitación por email a ${email}`,
        });
        resetForm();
        onOpenChange(false);
        onSuccess();
      } else {
        // Invite created but email failed
        setInviteLink(data?.invite_link || null);
        setEmailFailed(true);
        toast({
          title: "Invitación creada",
          description: data?.email_error || "El email no se pudo enviar. Puedes copiar el enlace manualmente.",
          variant: "destructive",
        });
        onSuccess();
      }
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo crear la invitación",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const needsFranchisee = ["gestor", "franquiciado", "empleado"].includes(role);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invitar Usuario</DialogTitle>
        </DialogHeader>

        {emailFailed && inviteLink ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  Invitación creada, pero el email no se envió
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Puedes compartir el enlace manualmente por WhatsApp u otro medio.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Enlace de invitación para {email}</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={inviteLink}
                  className="text-xs font-mono"
                />
                <Button type="button" variant="outline" onClick={handleCopyLink} className="shrink-0">
                  <Copy className="h-4 w-4 mr-1" />
                  Copiar
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" onClick={() => { resetForm(); onOpenChange(false); }}>
                Cerrar
              </Button>
            </DialogFooter>
          </div>
        ) : (
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
              <Button type="button" variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Enviando..." : "Enviar Invitación"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InviteUserDialog;
