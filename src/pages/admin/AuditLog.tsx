import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { getAuditLogs } from "@/lib/supabase-queries";
import { useToast } from "@/hooks/use-toast";

const AuditLog = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("all");

  useEffect(() => {
    loadLogs();
  }, [actionFilter]);

  const loadLogs = async () => {
    setLoading(true);
    const { data, error } = await getAuditLogs({
      action: actionFilter !== "all" ? actionFilter : undefined
    });

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los logs",
        variant: "destructive",
      });
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "INSERT": return <Badge variant="default">CREATE</Badge>;
      case "UPDATE": return <Badge variant="secondary">UPDATE</Badge>;
      case "DELETE": return <Badge variant="destructive">DELETE</Badge>;
      default: return <Badge variant="outline">{action}</Badge>;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("es-ES");
  };

  if (loading) {
    return <div className="text-center py-8">Cargando registros de auditoría...</div>;
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Registro de Auditoría</h3>
          <div className="flex gap-4">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por acción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las acciones</SelectItem>
                <SelectItem value="INSERT">CREATE</SelectItem>
                <SelectItem value="UPDATE">UPDATE</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead>Tabla</TableHead>
              <TableHead>Cambios</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-sm">
                  {formatDate(log.created_at)}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div className="font-medium">{log.user_email || "Sistema"}</div>
                  </div>
                </TableCell>
                <TableCell>
                  {getActionBadge(log.action)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{log.table_name}</Badge>
                </TableCell>
                <TableCell>
                  <div className="text-xs text-muted-foreground max-w-md truncate">
                    {log.diff && Object.keys(log.diff).length > 0 
                      ? `${Object.keys(log.diff).length} campos modificados`
                      : "—"
                    }
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {logs.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No hay registros de auditoría
          </div>
        )}
      </Card>
    </div>
  );
};

export default AuditLog;
