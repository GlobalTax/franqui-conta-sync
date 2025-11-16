import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useLearningPatterns } from '@/hooks/useAutoPostingAnalytics';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

export function LearningPatternsTable() {
  const { data: patterns, isLoading } = useLearningPatterns();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Patrones de Aprendizaje</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Cargando patrones...</p>
        </CardContent>
      </Card>
    );
  }

  if (!patterns || patterns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Patrones de Aprendizaje</CardTitle>
          <CardDescription>Patrones detectados por el sistema de learning</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No hay patrones registrados aún</p>
        </CardContent>
      </Card>
    );
  }

  const activePatterns = patterns.filter((p) => p.is_active);
  const inactivePatterns = patterns.filter((p) => !p.is_active);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Patrones de Aprendizaje</CardTitle>
            <CardDescription>
              {activePatterns.length} activos • {inactivePatterns.length} inactivos
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="h-3 w-3 text-success" />
              {activePatterns.length} activos
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proveedor</TableHead>
                <TableHead>Cuenta Gasto</TableHead>
                <TableHead>Cuenta IVA</TableHead>
                <TableHead>Cuenta AP</TableHead>
                <TableHead className="text-center">Aplicaciones</TableHead>
                <TableHead className="text-center">Confianza</TableHead>
                <TableHead className="text-center">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patterns.slice(0, 10).map((pattern) => (
                <TableRow key={pattern.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {pattern.supplier_name || 'Sin proveedor'}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {pattern.learned_expense_account}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {pattern.learned_tax_account}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {pattern.learned_ap_account}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="font-mono">
                      {pattern.occurrence_count}x
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={
                        pattern.confidence_score >= 90
                          ? 'default'
                          : pattern.confidence_score >= 70
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {pattern.confidence_score.toFixed(0)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {pattern.is_active ? (
                      <Badge variant="outline" className="gap-1 text-success border-success/50">
                        <CheckCircle2 className="h-3 w-3" />
                        Activo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-muted-foreground">
                        <XCircle className="h-3 w-3" />
                        Inactivo
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {patterns.length > 10 && (
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Mostrando 10 de {patterns.length} patrones totales
          </p>
        )}
      </CardContent>
    </Card>
  );
}
