import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RefreshCw, XCircle, Clock, CheckCircle2, AlertTriangle, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, isPast, format } from "date-fns";
import { es } from "date-fns/locale";

interface Invite {
  id: string;
  email: string;
  role: string;
  franchisee_id: string | null;
  centro: string | null;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  invited_by: string | null;
}

interface PendingInvitesTableProps {
  refreshKey?: number;
}

const roleLabels: Record<string, string> = {
  admin: "Asesoría (Admin)",
  gestor: "Gestor",
  franquiciado: "Franquiciado",
  empleado: "Empleado",
};

const roleIcons: Record<string, string> = {
  admin: "🛡️",
  gestor: "👔",
  franquiciado: "🍔",
  empleado: "👤",
};

const PendingInvitesTable = ({ refreshKey }: PendingInvitesTableProps) => {
  const { toast } = useToast();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadInvites = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("invites")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setInvites(data as Invite[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadInvites();
  }, [refreshKey]);

  const getStatus = (invite: Invite) => {
    if (invite.accepted_at) return "accepted";
    if (isPast(new Date(invite.expires_at))) return "expired";
    return "pending";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Aceptada
          </Badge>
        );
      case "expired":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Expirada
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400">
            <Clock className="h-3 w-3 mr-1" />
            Pendiente
          </Badge>
        );
    }
  };

  const handleResend = async (invite: Invite) => {
    setActionLoading(invite.id);
    try {
      const { data, error } = await supabase.functions.invoke("send-invite", {
        body: {
          email: invite.email,
          role: invite.role,
          franchisee_id: invite.franchisee_id || undefined,
          centro: invite.centro || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Invitación reenviada",
        description: `Se ha reenviado la invitación a ${invite.email}`,
      });
      loadInvites();
    } catch (err: any) {
      toast({
        title: "Error al reenviar",
        description: err.message || "No se pudo reenviar la invitación",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (invite: Invite) => {
    setActionLoading(invite.id);
    try {
      const { error } = await supabase
        .from("invites")
        .delete()
        .eq("id", invite.id);
      if (error) throw error;

      toast({
        title: "Invitación cancelada",
        description: `Se ha cancelado la invitación a ${invite.email}`,
      });
      loadInvites();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "No se pudo cancelar la invitación",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Cargando invitaciones...</div>;
  }

  if (invites.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Send className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p className="font-medium">No hay invitaciones</p>
        <p className="text-sm">Las invitaciones enviadas aparecerán aquí</p>
      </div>
    );
  }

  const pending = invites.filter(i => getStatus(i) === "pending").length;
  const accepted = invites.filter(i => getStatus(i) === "accepted").length;
  const expired = invites.filter(i => getStatus(i) === "expired").length;

  return (
    <div className="space-y-4">
      {/* Summary counters */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-amber-500" />
          <span className="font-medium">{pending}</span>
          <span className="text-muted-foreground">pendientes</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span className="font-medium">{accepted}</span>
          <span className="text-muted-foreground">aceptadas</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <span className="font-medium">{expired}</span>
          <span className="text-muted-foreground">expiradas</span>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Centro</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Enviada</TableHead>
            <TableHead>Expira</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invites.map((invite) => {
            const status = getStatus(invite);
            const isLoading = actionLoading === invite.id;

            return (
              <TableRow key={invite.id} className={status === "expired" ? "opacity-60" : ""}>
                <TableCell className="font-medium">{invite.email}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {roleIcons[invite.role] || "❓"} {roleLabels[invite.role] || invite.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {invite.centro || "Todos"}
                </TableCell>
                <TableCell>{getStatusBadge(status)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true, locale: es })}
                      </TooltipTrigger>
                      <TooltipContent>
                        {format(new Date(invite.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        {formatDistanceToNow(new Date(invite.expires_at), { addSuffix: true, locale: es })}
                      </TooltipTrigger>
                      <TooltipContent>
                        {format(new Date(invite.expires_at), "dd/MM/yyyy HH:mm", { locale: es })}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell className="text-right">
                  {status === "pending" && (
                    <div className="flex gap-1 justify-end">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleResend(invite)}
                              disabled={isLoading}
                            >
                              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Reenviar invitación</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleCancel(invite)}
                              disabled={isLoading}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Cancelar invitación</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                  {status === "expired" && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleResend(invite)}
                            disabled={isLoading}
                          >
                            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Reenviar invitación</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default PendingInvitesTable;
