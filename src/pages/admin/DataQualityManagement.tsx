import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, CheckCircle2, AlertCircle, TrendingUp } from "lucide-react";
import { useDQIssues, useDQStats } from "@/hooks/useDQIssues";
import { RunDQCheckButton } from "@/components/dq/RunDQCheckButton";
import { DQIssueDetailDialog } from "@/components/dq/DQIssueDetailDialog";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";

export default function DataQualityManagement() {
  const [filters, setFilters] = useState<{
    tipo?: string;
    severidad?: string;
    resuelto?: boolean;
  }>({});
  const [selectedIssue, setSelectedIssue] = useState<any>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const { data: issues, isLoading } = useDQIssues(filters);
  const { data: stats } = useDQStats(
    format(subDays(new Date(), 30), "yyyy-MM-dd"),
    format(new Date(), "yyyy-MM-dd")
  );

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case "critica":
        return "destructive";
      case "alta":
        return "default";
      case "media":
        return "secondary";
      default:
        return "outline";
    }
  };

  const viewDetail = (issue: any) => {
    setSelectedIssue(issue);
    setDetailDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Issues Activos</p>
                <p className="text-3xl font-bold mt-2">{stats?.totalActivos || 0}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Críticos</p>
                <p className="text-3xl font-bold mt-2 text-destructive">
                  {stats?.criticos || 0}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tasa Resolución</p>
                <p className="text-3xl font-bold mt-2">{stats?.tasaResolucion || 0}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <RunDQCheckButton />
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Select
              value={filters.tipo || "all"}
              onValueChange={(value) =>
                setFilters({ ...filters, tipo: value === "all" ? undefined : value })
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="PLAN_SIN_REAL">Plan sin real</SelectItem>
                <SelectItem value="REAL_SIN_PLAN">Real sin plan</SelectItem>
                <SelectItem value="COSTE_ATIPICO">Coste atípico</SelectItem>
                <SelectItem value="EMPLEADO_SIN_CENTRO">Sin centro</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.severidad || "all"}
              onValueChange={(value) =>
                setFilters({ ...filters, severidad: value === "all" ? undefined : value })
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Severidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="critica">Crítica</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="media">Media</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={
                filters.resuelto === undefined
                  ? "all"
                  : filters.resuelto
                  ? "true"
                  : "false"
              }
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  resuelto: value === "all" ? undefined : value === "true",
                })
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="false">Pendientes</SelectItem>
                <SelectItem value="true">Resueltos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Issues */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando issues...</div>
          ) : !issues || issues.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay issues de calidad
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Severidad</TableHead>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Centro</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell>
                      <Badge variant="outline">{issue.tipo}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getSeverityVariant(issue.severidad)}>
                        {issue.severidad.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {issue.employee
                        ? `${issue.employee.nombre} ${issue.employee.apellidos}`
                        : "—"}
                    </TableCell>
                    <TableCell>{issue.centro || "—"}</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(issue.periodo_inicio), "dd/MM/yyyy")} -{" "}
                      {format(new Date(issue.periodo_fin), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>
                      {issue.resuelto ? (
                        <Badge variant="secondary">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Resuelto
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <AlertCircle className="mr-1 h-3 w-3" />
                          Pendiente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => viewDetail(issue)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DQIssueDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        issue={selectedIssue}
      />
    </div>
  );
}
