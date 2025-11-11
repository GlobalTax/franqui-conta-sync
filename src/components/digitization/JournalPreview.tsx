import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type { JournalLine } from '@/lib/accounting/core/validators';
import type { AccountMappingResult } from '@/lib/accounting/types';

interface JournalPreviewProps {
  preview: JournalLine[];
  issues: string[];
  mapping: AccountMappingResult;
}

export function JournalPreview({ preview, issues, mapping }: JournalPreviewProps) {
  const totalDebit = preview.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredit = preview.reduce((sum, line) => sum + (line.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Preview Asiento Contable
          {isBalanced && issues.length === 0 ? (
            <CheckCircle2 className="h-5 w-5 text-success" />
          ) : (
            <AlertCircle className="h-5 w-5 text-destructive" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {issues.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside">
                {issues.map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="text-sm text-muted-foreground">
          <strong>Estrategia aplicada:</strong> {mapping.rationale}
        </div>

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-2">Cuenta</th>
                <th className="text-right p-2">Debe</th>
                <th className="text-right p-2">Haber</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((line, idx) => (
                <tr key={idx} className="border-t">
                  <td className="p-2">
                    <div className="font-mono">{line.account}</div>
                    {line.description && (
                      <div className="text-xs text-muted-foreground">{line.description}</div>
                    )}
                  </td>
                  <td className="text-right p-2 font-mono">
                    {line.debit > 0 ? line.debit.toFixed(2) : '-'}
                  </td>
                  <td className="text-right p-2 font-mono">
                    {line.credit > 0 ? line.credit.toFixed(2) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 bg-muted font-semibold">
              <tr>
                <td className="p-2">TOTALES</td>
                <td className="text-right p-2 font-mono">{totalDebit.toFixed(2)}</td>
                <td className="text-right p-2 font-mono">{totalCredit.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {!isBalanced && (
          <Alert variant="destructive">
            <AlertDescription>
              Diferencia: {Math.abs(totalDebit - totalCredit).toFixed(2)} €
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
