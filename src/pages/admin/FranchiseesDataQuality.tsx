import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  Mail, 
  FileText, 
  Users, 
  Building2,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { useFranchiseesDataQuality } from "@/hooks/useFranchiseesDataQuality";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const FranchiseesDataQuality = () => {
  const { data, isLoading } = useFranchiseesDataQuality();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const { duplicates, issues, relationshipIssues, metrics } = data || {};

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <TrendingUp className="h-6 w-6 text-green-500" />;
    return <TrendingDown className="h-6 w-6 text-red-500" />;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "default";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Diagnóstico de Calidad de Franquiciados</h2>
        <p className="text-muted-foreground">Análisis completo de problemas de datos y relaciones</p>
      </div>

      {/* Quality Score Card */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Puntuación de Calidad</CardTitle>
              <CardDescription>Índice general de calidad de datos</CardDescription>
            </div>
            {getScoreIcon(metrics?.quality_score || 0)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className={`text-5xl font-bold ${getScoreColor(metrics?.quality_score || 0)}`}>
                {metrics?.quality_score.toFixed(1)}
              </span>
              <span className="text-2xl text-muted-foreground">/ 100</span>
            </div>
            <Progress value={metrics?.quality_score || 0} className="h-3" />
            <p className="text-sm text-muted-foreground">
              {metrics?.quality_score >= 80 && "✅ Excelente calidad de datos"}
              {metrics?.quality_score >= 60 && metrics?.quality_score < 80 && "⚠️ Calidad aceptable, con margen de mejora"}
              {metrics?.quality_score < 60 && "❌ Calidad baja, requiere atención urgente"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Franquiciados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{metrics?.total_franchisees}</span>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Duplicados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-yellow-500">{metrics?.with_duplicates}</span>
              <Copy className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Emails Inválidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-red-500">{metrics?.with_invalid_email}</span>
              <Mail className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sin Centros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-orange-500">{metrics?.without_centres}</span>
              <Building2 className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Duplicates Section */}
      {duplicates && duplicates.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Copy className="h-5 w-5 text-yellow-500" />
              <CardTitle>Franquiciados Duplicados ({duplicates.length})</CardTitle>
            </div>
            <CardDescription>
              Registros con nombres idénticos o muy similares que probablemente deberían ser consolidados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {duplicates.map((dup) => (
                <Alert key={dup.id} className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertTitle className="font-semibold">{dup.name}</AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 space-y-2">
                      <div className="text-sm">
                        <strong>Principal:</strong> {dup.email || "Sin email"} | {dup.company_tax_id || "Sin CIF"}
                      </div>
                      <div className="text-sm">
                        <strong>Duplicados encontrados ({dup.duplicates.length}):</strong>
                        <ul className="list-disc list-inside ml-4 mt-1">
                          {dup.duplicates.map((d) => (
                            <li key={d.id}>
                              {d.email || "Sin email"} | {d.company_tax_id || "Sin CIF"}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Quality Issues Section */}
      {issues && issues.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <CardTitle>Problemas de Calidad de Datos ({issues.length})</CardTitle>
            </div>
            <CardDescription>
              Datos inconsistentes, faltantes o con formato incorrecto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Franquiciado</TableHead>
                  <TableHead>Problema</TableHead>
                  <TableHead>Campo</TableHead>
                  <TableHead>Valor Actual</TableHead>
                  <TableHead>Severidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.slice(0, 20).map((issue, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{issue.franchisee_name}</TableCell>
                    <TableCell>{issue.description}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{issue.field}</code>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                      {issue.current_value}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getSeverityColor(issue.severity)}>
                        {issue.severity}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {issues.length > 20 && (
              <p className="text-sm text-muted-foreground text-center mt-4">
                ... y {issues.length - 20} problemas más
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Relationship Issues Section */}
      {relationshipIssues && relationshipIssues.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <CardTitle>Problemas de Relaciones ({relationshipIssues.length})</CardTitle>
            </div>
            <CardDescription>
              Franquiciados sin centros o sociedades asociadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Franquiciado</TableHead>
                  <TableHead>Problema</TableHead>
                  <TableHead className="text-center">Centros</TableHead>
                  <TableHead className="text-center">Sociedades</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relationshipIssues.slice(0, 20).map((issue, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{issue.franchisee_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{issue.issue}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {issue.centres_count === 0 ? (
                        <XCircle className="h-4 w-4 text-red-500 inline" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-green-500 inline" />
                      )}
                      <span className="ml-2">{issue.centres_count}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      {issue.companies_count === 0 ? (
                        <XCircle className="h-4 w-4 text-red-500 inline" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-green-500 inline" />
                      )}
                      <span className="ml-2">{issue.companies_count}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {relationshipIssues.length > 20 && (
              <p className="text-sm text-muted-foreground text-center mt-4">
                ... y {relationshipIssues.length - 20} problemas más
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary Section */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Acciones Recomendadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics?.with_duplicates > 0 && (
              <Alert>
                <Copy className="h-4 w-4" />
                <AlertTitle>Consolidar Duplicados</AlertTitle>
                <AlertDescription>
                  Hay {metrics.with_duplicates} franquiciados con duplicados. Se recomienda consolidarlos en un solo registro.
                </AlertDescription>
              </Alert>
            )}
            
            {metrics?.with_invalid_email > 0 && (
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertTitle>Corregir Emails</AlertTitle>
                <AlertDescription>
                  {metrics.with_invalid_email} franquiciados tienen emails inválidos o en campos incorrectos.
                </AlertDescription>
              </Alert>
            )}
            
            {metrics?.without_centres > 0 && (
              <Alert>
                <Building2 className="h-4 w-4" />
                <AlertTitle>Asociar Centros</AlertTitle>
                <AlertDescription>
                  {metrics.without_centres} franquiciados no tienen centros asociados. Verificar si deben tenerlos.
                </AlertDescription>
              </Alert>
            )}

            {metrics?.quality_score >= 80 && (
              <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-900 dark:text-green-100">¡Excelente!</AlertTitle>
                <AlertDescription className="text-green-800 dark:text-green-200">
                  La calidad de los datos de franquiciados es buena. Mantener las buenas prácticas de mantenimiento.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FranchiseesDataQuality;
