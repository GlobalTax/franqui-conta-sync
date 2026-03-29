import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useView } from '@/contexts/ViewContext';
import { useModelo111, useModelo190, useModelo347, useModelo390 } from '@/hooks/useFiscalModels';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTablePro } from '@/components/common/DataTablePro';
import { Skeleton } from '@/components/ui/skeleton';

const currentYear = new Date().getFullYear();
const currentTrimestre = Math.ceil((new Date().getMonth() + 1) / 3);

export default function FiscalModels() {
  const { selectedView } = useView();
  const centroCode = selectedView?.type === 'centre' ? selectedView.id : undefined;

  const [year, setYear] = useState(currentYear);
  const [trimestre, setTrimestre] = useState(currentTrimestre);

  const { data: m111, isLoading: loading111 } = useModelo111(centroCode, year, trimestre);
  const { data: m190, isLoading: loading190 } = useModelo190(centroCode, year);
  const { data: m347, isLoading: loading347 } = useModelo347(centroCode, year);
  const { data: m390, isLoading: loading390 } = useModelo390(centroCode, year);

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

  if (!selectedView) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Seleccione un centro para generar los modelos fiscales</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Cumplimiento', href: '/compliance' },
          { label: 'Modelos Fiscales' },
        ]}
        title="Modelos Fiscales"
        subtitle="Generación automática de modelos tributarios"
      />

      <div className="flex gap-4">
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={String(trimestre)} onValueChange={(v) => setTrimestre(Number(v))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">T1 (Ene-Mar)</SelectItem>
            <SelectItem value="2">T2 (Abr-Jun)</SelectItem>
            <SelectItem value="3">T3 (Jul-Sep)</SelectItem>
            <SelectItem value="4">T4 (Oct-Dic)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="111">
        <TabsList>
          <TabsTrigger value="111">
            <FileText className="h-4 w-4 mr-1" />
            Modelo 111
          </TabsTrigger>
          <TabsTrigger value="190">Modelo 190</TabsTrigger>
          <TabsTrigger value="347">Modelo 347</TabsTrigger>
          <TabsTrigger value="390">Modelo 390</TabsTrigger>
        </TabsList>

        {/* MODELO 111 */}
        <TabsContent value="111" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Modelo 111 - Retenciones IRPF</CardTitle>
              <CardDescription>T{trimestre} {year} - Retenciones e ingresos a cuenta</CardDescription>
            </CardHeader>
            <CardContent>
              {loading111 ? <Skeleton className="h-40" /> : m111 ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Rendimientos trabajo</div>
                        <div className="text-lg font-bold">{m111.perceptoresTrabajo} perceptores</div>
                        <div className="text-sm">Base: {fmt(m111.baseRetencionTrabajo)}</div>
                        <div className="text-sm font-medium">Retenciones: {fmt(m111.retencionTrabajo)}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Act. profesionales</div>
                        <div className="text-lg font-bold">{m111.perceptoresProfesionales} perceptores</div>
                        <div className="text-sm">Base: {fmt(m111.baseRetencionProfesionales)}</div>
                        <div className="text-sm font-medium">Retenciones: {fmt(m111.retencionProfesionales)}</div>
                      </CardContent>
                    </Card>
                    <Card className="border-primary">
                      <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Total a ingresar</div>
                        <div className="text-2xl font-bold text-primary">{fmt(m111.totalRetenciones)}</div>
                        <div className="text-sm">{m111.totalPerceptores} perceptores totales</div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No hay datos de retenciones para este período
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MODELO 190 */}
        <TabsContent value="190" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Modelo 190 - Resumen Anual Retenciones</CardTitle>
              <CardDescription>Ejercicio {year}</CardDescription>
            </CardHeader>
            <CardContent>
              {loading190 ? <Skeleton className="h-40" /> : m190 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Perceptores</div>
                        <div className="text-2xl font-bold">{m190.totalPerceptores}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Total Retribuciones</div>
                        <div className="text-2xl font-bold">{fmt(m190.totalRetribuciones)}</div>
                      </CardContent>
                    </Card>
                    <Card className="border-primary">
                      <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Total Retenciones</div>
                        <div className="text-2xl font-bold text-primary">{fmt(m190.totalRetenciones)}</div>
                      </CardContent>
                    </Card>
                  </div>

                  <DataTablePro
                    columns={[
                      { key: 'nif', label: 'NIF' },
                      { key: 'nombre', label: 'Perceptor' },
                      {
                        key: 'clave',
                        label: 'Clave',
                        render: (v: string) => (
                          <Badge variant={v === 'A' ? 'default' : 'secondary'}>
                            {v === 'A' ? 'Trabajo' : 'Profesional'}
                          </Badge>
                        ),
                      },
                      { key: 'retribucionDineraria', label: 'Retribución', render: (v: number) => fmt(v) },
                      { key: 'retencionPracticada', label: 'Retención', render: (v: number) => fmt(v) },
                    ]}
                    data={m190.perceptores}
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No hay datos para este ejercicio</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MODELO 347 */}
        <TabsContent value="347" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Modelo 347 - Operaciones con Terceros</CardTitle>
              <CardDescription>Ejercicio {year} - Operaciones &gt;3.005,06€</CardDescription>
            </CardHeader>
            <CardContent>
              {loading347 ? <Skeleton className="h-40" /> : m347 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Declarados</div>
                        <div className="text-2xl font-bold">{m347.totalOperaciones}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Importe Total</div>
                        <div className="text-2xl font-bold">{fmt(m347.importeTotal)}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Umbral</div>
                        <div className="text-2xl font-bold">{fmt(m347.umbral)}</div>
                      </CardContent>
                    </Card>
                  </div>

                  <DataTablePro
                    columns={[
                      { key: 'nif', label: 'NIF' },
                      { key: 'nombre', label: 'Nombre' },
                      {
                        key: 'tipo',
                        label: 'Tipo',
                        render: (v: string) => (
                          <Badge variant={v === 'proveedor' ? 'outline' : 'default'}>
                            {v === 'proveedor' ? 'Proveedor' : 'Cliente'}
                          </Badge>
                        ),
                      },
                      { key: 'importeAnual', label: 'Anual', render: (v: number) => fmt(v) },
                      { key: 'importeT1', label: 'T1', render: (v: number) => fmt(v) },
                      { key: 'importeT2', label: 'T2', render: (v: number) => fmt(v) },
                      { key: 'importeT3', label: 'T3', render: (v: number) => fmt(v) },
                      { key: 'importeT4', label: 'T4', render: (v: number) => fmt(v) },
                    ]}
                    data={m347.operaciones}
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No hay operaciones declarables</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MODELO 390 */}
        <TabsContent value="390" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Modelo 390 - Resumen Anual IVA</CardTitle>
              <CardDescription>Ejercicio {year}</CardDescription>
            </CardHeader>
            <CardContent>
              {loading390 ? <Skeleton className="h-40" /> : m390 ? (
                <div className="space-y-6">
                  <Card>
                    <CardHeader><CardTitle className="text-base">IVA Devengado (Repercutido)</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Base 21%</div>
                          <div className="font-medium">{fmt(m390.baseImponible21)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Cuota 21%</div>
                          <div className="font-medium">{fmt(m390.cuotaDevengada21)}</div>
                        </div>
                        <div />
                        <div>
                          <div className="text-muted-foreground">Base 10%</div>
                          <div className="font-medium">{fmt(m390.baseImponible10)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Cuota 10%</div>
                          <div className="font-medium">{fmt(m390.cuotaDevengada10)}</div>
                        </div>
                        <div />
                      </div>
                      <div className="mt-4 pt-4 border-t font-bold">
                        Total devengado: {fmt(m390.totalCuotaDevengado)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="text-base">IVA Deducible (Soportado)</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Base imponible</div>
                          <div className="font-medium">{fmt(m390.baseImponibleSoportado)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Cuota deducible</div>
                          <div className="font-medium">{fmt(m390.cuotaDeducible)}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-primary">
                    <CardContent className="p-6">
                      <div className="text-sm text-muted-foreground">Resultado anual</div>
                      <div className={`text-3xl font-bold ${m390.resultadoAnual >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {fmt(m390.resultadoAnual)}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {m390.resultadoAnual >= 0 ? 'A ingresar' : 'A compensar/devolver'}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No hay datos para este ejercicio</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
