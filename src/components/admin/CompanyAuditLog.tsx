import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Props {
  companyId: string;
}

const CompanyAuditLog = ({ companyId }: Props) => {
  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ["company-audit-log", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("table_name", "companies")
        .eq("row_id", companyId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });

  const getActionBadge = (action: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      INSERT: "default",
      UPDATE: "secondary",
      DELETE: "destructive",
    };
    return <Badge variant={variants[action] || "secondary"}>{action}</Badge>;
  };

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Registro de todas las modificaciones realizadas en esta sociedad.
          Se registran inserciones, actualizaciones y eliminaciones con el usuario responsable.
        </AlertDescription>
      </Alert>

      <Card className="p-6">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Cargando historial...</p>
          </div>
        ) : !auditLogs || auditLogs.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-2">Sin historial</h3>
            <p className="text-muted-foreground">
              No hay registros de auditoría para esta sociedad.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Cambios</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">
                    {new Date(log.created_at).toLocaleString("es-ES")}
                  </TableCell>
                  <TableCell>
                    {getActionBadge(log.action)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.user_email || "Sistema"}
                  </TableCell>
                  <TableCell>
                    {log.diff ? (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-primary hover:underline">
                          Ver cambios
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                          {JSON.stringify(log.diff, null, 2)}
                        </pre>
                      </details>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
};

export default CompanyAuditLog;
