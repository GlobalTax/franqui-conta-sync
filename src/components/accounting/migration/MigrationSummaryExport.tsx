import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import { generateMigrationSummary } from "@/lib/migration/migrationSummaryService";
import { generateMigrationPDF } from "@/lib/migration/generateMigrationPDF";
import { generateMigrationExcel } from "@/lib/migration/generateMigrationExcel";
import { toast } from "sonner";

interface MigrationSummaryExportProps {
  fiscalYearId: string;
  centroCode: string;
}

export function MigrationSummaryExport({
  fiscalYearId,
  centroCode,
}: MigrationSummaryExportProps) {
  const [loading, setLoading] = useState(false);
  const [includeLogs, setIncludeLogs] = useState(true);
  const [includeValidations, setIncludeValidations] = useState(true);

  const handleExportPDF = async () => {
    setLoading(true);
    try {
      const summary = await generateMigrationSummary(fiscalYearId);
      generateMigrationPDF(summary, {
        includeLogs,
        includeValidations,
      });
      toast.success("PDF generado correctamente");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error al generar el PDF");
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    setLoading(true);
    try {
      const summary = await generateMigrationSummary(fiscalYearId);
      generateMigrationExcel(summary);
      toast.success("Excel generado correctamente");
    } catch (error) {
      console.error("Error generating Excel:", error);
      toast.error("Error al generar el Excel");
    } finally {
      setLoading(false);
    }
  };

  const handleExportBoth = async () => {
    setLoading(true);
    try {
      const summary = await generateMigrationSummary(fiscalYearId);
      generateMigrationPDF(summary, {
        includeLogs,
        includeValidations,
      });
      generateMigrationExcel(summary);
      toast.success("PDF y Excel generados correctamente");
    } catch (error) {
      console.error("Error generating files:", error);
      toast.error("Error al generar los archivos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Exportar Resumen de Migración
        </CardTitle>
        <CardDescription>
          Descargue un informe completo de la migración realizada para este ejercicio fiscal
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Export Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="h-auto flex-col gap-2 py-4"
            onClick={handleExportPDF}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <FileText className="h-6 w-6" />
            )}
            <div className="text-center">
              <div className="font-semibold">PDF Oficial</div>
              <div className="text-xs text-muted-foreground">
                Documento ejecutivo
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-auto flex-col gap-2 py-4"
            onClick={handleExportExcel}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-6 w-6" />
            )}
            <div className="text-center">
              <div className="font-semibold">Excel Detallado</div>
              <div className="text-xs text-muted-foreground">
                Análisis completo
              </div>
            </div>
          </Button>
        </div>

        {/* Configuration */}
        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="logs"
              checked={includeLogs}
              onCheckedChange={(checked) => setIncludeLogs(checked as boolean)}
            />
            <label
              htmlFor="logs"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Incluir logs de auditoría
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="validations"
              checked={includeValidations}
              onCheckedChange={(checked) =>
                setIncludeValidations(checked as boolean)
              }
            />
            <label
              htmlFor="validations"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Incluir validaciones
            </label>
          </div>
        </div>

        {/* Generate Both Button */}
        <Button
          className="w-full"
          onClick={handleExportBoth}
          disabled={loading}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Generar Resumen Completo (PDF + Excel)
        </Button>
      </CardContent>
    </Card>
  );
}
