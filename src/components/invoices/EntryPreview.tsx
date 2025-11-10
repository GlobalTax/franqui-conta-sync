import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle, AlertTriangle, FileText, XCircle, Edit } from "lucide-react";

interface EntryPreviewLine {
  account: string;
  account_name?: string;
  debit: number;
  credit: number;
  description: string;
  line_number: number;
}

interface Props {
  readyToPost: boolean;
  blockingIssues: string[];
  warnings: string[];
  confidenceScore: number;
  preview: EntryPreviewLine[];
  onPost?: () => void;
  onEdit?: () => void;
  isLoading?: boolean;
}

export function EntryPreview({
  readyToPost,
  blockingIssues,
  warnings,
  confidenceScore,
  preview,
  onPost,
  onEdit,
  isLoading = false
}: Props) {
  
  const totalDebit = preview.reduce((sum, line) => sum + line.debit, 0);
  const totalCredit = preview.reduce((sum, line) => sum + line.credit, 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01;
  
  const getConfidenceBadge = () => {
    if (confidenceScore >= 80) return { color: "bg-green-100 text-green-800 border-green-300", label: "Alta" };
    if (confidenceScore >= 50) return { color: "bg-yellow-100 text-yellow-800 border-yellow-300", label: "Media" };
    return { color: "bg-red-100 text-red-800 border-red-300", label: "Baja" };
  };
  
  const badge = getConfidenceBadge();
  
  return (
    <div className="space-y-4">
      {/* Header con estado */}
      <Card className={`p-6 border-2 ${readyToPost ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {readyToPost ? (
              <CheckCircle className="h-6 w-6 text-green-600" />
            ) : (
              <XCircle className="h-6 w-6 text-red-600" />
            )}
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {readyToPost ? '✅ Listo para Contabilizar' : '⚠️ Requiere Revisión'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {readyToPost 
                  ? 'El asiento ha pasado todas las validaciones'
                  : 'Hay errores que impiden la contabilización automática'
                }
              </p>
            </div>
          </div>
          
          <Badge className={`${badge.color} border`}>
            {badge.label} - {confidenceScore}%
          </Badge>
        </div>
        
        <div className="flex gap-2">
          {readyToPost && onPost && (
            <Button 
              onClick={onPost}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <FileText className="mr-2 h-4 w-4" />
              Contabilizar Asiento
            </Button>
          )}
          
          {onEdit && (
            <Button 
              variant="outline"
              onClick={onEdit}
              disabled={isLoading}
            >
              <Edit className="mr-2 h-4 w-4" />
              Editar Manualmente
            </Button>
          )}
        </div>
      </Card>
      
      {/* Blocking Issues */}
      {blockingIssues.length > 0 && (
        <Alert variant="destructive" className="border-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="font-semibold">❌ Errores Bloqueantes</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4 mt-2 space-y-1">
              {blockingIssues.map((issue, i) => (
                <li key={i} className="text-sm">{issue}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Warnings */}
      {warnings.length > 0 && (
        <Alert className="border-2 border-yellow-300 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-900 font-semibold">⚠️ Advertencias</AlertTitle>
          <AlertDescription className="text-yellow-800">
            <ul className="list-disc pl-4 mt-2 space-y-1 text-sm">
              {warnings.map((warn, i) => (
                <li key={i}>{warn}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Preview Table */}
      <Card className="p-6">
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          Preview del Asiento Contable
        </h4>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Línea</TableHead>
                <TableHead className="w-32">Cuenta</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right w-32">Debe</TableHead>
                <TableHead className="text-right w-32">Haber</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.map((line) => (
                <TableRow key={line.line_number}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {line.line_number}
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="font-mono font-bold text-sm">{line.account}</span>
                      {line.account_name && (
                        <p className="text-xs text-muted-foreground mt-0.5">{line.account_name}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm">{line.description}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {line.debit > 0 ? (
                      <span className="text-blue-700 font-semibold">{line.debit.toFixed(2)} €</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {line.credit > 0 ? (
                      <span className="text-green-700 font-semibold">{line.credit.toFixed(2)} €</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              
              {/* Totales */}
              <TableRow className="bg-muted font-bold border-t-2 border-border">
                <TableCell colSpan={3} className="text-right font-semibold">TOTALES</TableCell>
                <TableCell className="text-right font-mono text-blue-700">
                  {totalDebit.toFixed(2)} €
                </TableCell>
                <TableCell className="text-right font-mono text-green-700">
                  {totalCredit.toFixed(2)} €
                </TableCell>
              </TableRow>
              
              {/* Estado de cuadre */}
              <TableRow className="border-t">
                <TableCell colSpan={3} className="text-right text-sm">
                  {balanced ? (
                    <span className="text-green-600 flex items-center justify-end gap-1.5 font-medium">
                      <CheckCircle className="h-4 w-4" />
                      Asiento cuadrado
                    </span>
                  ) : (
                    <span className="text-red-600 flex items-center justify-end gap-1.5 font-medium">
                      <XCircle className="h-4 w-4" />
                      Descuadre: {Math.abs(totalDebit - totalCredit).toFixed(2)} €
                    </span>
                  )}
                </TableCell>
                <TableCell colSpan={2}></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
