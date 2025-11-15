import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileSpreadsheet } from "lucide-react";
import { useFixedAssets } from "@/hooks/useFixedAssets";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useView } from "@/contexts/ViewContext";
import { formatCurrency } from "@/lib/utils";
import * as XLSX from 'xlsx';

export default function AssetsRegister() {
  const { selectedView } = useView();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());

  const { data: assets, isLoading } = useFixedAssets();

  const breadcrumbs = [
    { label: "Reportes", href: "/reportes" },
    { label: "Libro de Bienes de Inversión" },
  ];

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // Filtrar activos del año seleccionado
  const filteredAssets = assets?.filter(asset => {
    const year = new Date(asset.acquisition_date).getFullYear();
    return year.toString() === selectedYear || asset.status === 'active';
  }) || [];

  // Calcular totales
  const totals = filteredAssets.reduce((acc, asset) => ({
    acquisition: acc.acquisition + asset.acquisition_value,
    accumulated: acc.accumulated + (asset.accumulated_depreciation || 0),
    current: acc.current + (asset.current_value || asset.acquisition_value),
  }), { acquisition: 0, accumulated: 0, current: 0 });

  const exportToExcel = () => {
    // Crear workbook
    const wb = XLSX.utils.book_new();

    // Hoja 1: Resumen
    const summaryData = [
      ['Libro de Bienes de Inversión'],
      ['Ejercicio:', selectedYear],
      ['Centro:', selectedView?.name || ''],
      ['Fecha generación:', new Date().toLocaleDateString('es-ES')],
      [],
      ['Código', 'Descripción', 'F. Adquisición', 'Valor Adq.', 'Amor. Acum.', 'VNC', 'Estado'],
      ...filteredAssets.map(asset => [
        asset.asset_code,
        asset.description,
        new Date(asset.acquisition_date).toLocaleDateString('es-ES'),
        asset.acquisition_value,
        asset.accumulated_depreciation || 0,
        asset.current_value || asset.acquisition_value,
        asset.status === 'active' ? 'Activo' : asset.status === 'fully_depreciated' ? 'Amortizado' : 'Baja',
      ]),
      [],
      ['TOTALES', '', '', totals.acquisition, totals.accumulated, totals.current, ''],
    ];

    const ws = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Estilos de columnas
    ws['!cols'] = [
      { wch: 12 }, // Código
      { wch: 40 }, // Descripción
      { wch: 15 }, // Fecha
      { wch: 15 }, // Valor Adq
      { wch: 15 }, // Amor. Acum
      { wch: 15 }, // VNC
      { wch: 12 }, // Estado
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Libro de Bienes');

    // Guardar archivo
    XLSX.writeFile(wb, `libro-bienes-${selectedYear}.xlsx`);
  };

  if (!selectedView || selectedView.type !== 'centre') {
    return (
      <div className="container mx-auto py-6">
        <PageHeader title="Libro de Bienes de Inversión" breadcrumbs={breadcrumbs} />
        <Alert>
          <AlertDescription>
            Selecciona un centro para ver el libro de bienes.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground mb-1 tracking-tight">
              Libro de Bienes de Inversión
            </h1>
            <p className="text-sm text-muted-foreground">
              Registro oficial de activos fijos e inmovilizado
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 px-4 py-2 bg-card rounded-lg border border-border">
              <Label className="text-xs font-medium text-muted-foreground">
                Ejercicio
              </Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-28 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={exportToExcel}
              className="gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Exportar Excel
            </Button>
          </div>
        </div>

        {/* Tabla principal */}
        <Card>
          <CardHeader>
            <CardTitle>Activos Fijos Registrados</CardTitle>
            <CardDescription>
              Centro: {selectedView.name} | Ejercicio: {selectedYear}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Cargando libro de bienes...
              </div>
            ) : (
              <>
                <div className="rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>F. Adquisición</TableHead>
                        <TableHead className="text-right">Valor Adq.</TableHead>
                        <TableHead className="text-right">Amor. Acum.</TableHead>
                        <TableHead className="text-right">VNC</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAssets.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            No hay activos registrados en este ejercicio
                          </TableCell>
                        </TableRow>
                      ) : (
                        <>
                          {filteredAssets.map((asset) => (
                            <TableRow key={asset.id}>
                              <TableCell className="font-mono text-sm">{asset.asset_code}</TableCell>
                              <TableCell className="font-medium">
                                {asset.description}
                                {asset.location && (
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    📍 {asset.location}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                {new Date(asset.acquisition_date).toLocaleDateString('es-ES')}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(asset.acquisition_value)}
                              </TableCell>
                              <TableCell className="text-right text-orange-600">
                                {formatCurrency(asset.accumulated_depreciation || 0)}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatCurrency(asset.current_value || asset.acquisition_value)}
                              </TableCell>
                              <TableCell>
                                {asset.status === 'active' ? 'Activo' :
                                 asset.status === 'fully_depreciated' ? 'Amortizado' : 'Baja'}
                              </TableCell>
                            </TableRow>
                          ))}
                          {/* Totales */}
                          <TableRow className="bg-muted/50 font-semibold">
                            <TableCell colSpan={3}>TOTALES</TableCell>
                            <TableCell className="text-right">{formatCurrency(totals.acquisition)}</TableCell>
                            <TableCell className="text-right text-orange-600">{formatCurrency(totals.accumulated)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(totals.current)}</TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        </>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Resumen */}
                <div className="mt-6 grid grid-cols-3 gap-6 p-6 bg-muted/30 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Total activos</p>
                    <p className="text-2xl font-bold">{filteredAssets.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Valor de adquisición</p>
                    <p className="text-2xl font-bold">{formatCurrency(totals.acquisition)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Valor neto contable</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(totals.current)}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
