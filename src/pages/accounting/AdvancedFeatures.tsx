import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useView } from "@/contexts/ViewContext";
import {
  Building2,
  Calendar,
  Calculator,
  FileText,
  TrendingUp,
  Briefcase,
  Target,
  AlertCircle,
  CheckCircle,
  Clock,
  Euro,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdvancedFeatures() {
  const { selectedView } = useView();

  const breadcrumbs = [
    { label: "Contabilidad", href: "/contabilidad/apuntes" },
    { label: "Funcionalidades Avanzadas" },
  ];

  if (!selectedView || selectedView.type !== 'centre') {
    return (
      <div className="container mx-auto py-6">
        <PageHeader title="Funcionalidades Avanzadas" breadcrumbs={breadcrumbs} />
        <Alert>
          <AlertDescription>
            Selecciona un centro para acceder a las funcionalidades avanzadas.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Funcionalidades Avanzadas"
        subtitle="Herramientas profesionales de contabilidad inspiradas en software español líder"
        breadcrumbs={breadcrumbs}
      />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="vencimientos">Vencimientos</TabsTrigger>
          <TabsTrigger value="inmovilizado">Inmovilizado</TabsTrigger>
          <TabsTrigger value="analitica">Analítica</TabsTrigger>
          <TabsTrigger value="fiscal">Modelos Fiscales</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Vencimientos Pendientes
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Próximos 30 días
                </p>
                <div className="flex gap-2 mt-3">
                  <Badge variant="destructive" className="text-xs">
                    <AlertCircle className="mr-1 h-3 w-3" />
                    0 vencidos
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Clock className="mr-1 h-3 w-3" />
                    0 hoy
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Inmovilizado
                </CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Valor neto contable
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Amortización mensual: <span className="font-semibold">-</span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Modelo 303 (IVA)
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Resultado trimestre actual
                </p>
                <Badge variant="outline" className="mt-3 text-xs">
                  Pendiente de generar
                </Badge>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Módulos Disponibles</CardTitle>
              <CardDescription>
                Funcionalidades inspiradas en software profesional español (Sage, A3, Holded, Anfix)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex gap-4 p-4 border rounded-lg">
                  <div className="rounded-full bg-primary/10 p-3 h-fit">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">Gestión de Vencimientos</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Control de cobros y pagos con vencimientos. Generación de remesas SEPA.
                      Similar a Sage/A3.
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Pagarés, letras, transferencias</li>
                      <li>• Alertas de vencimientos</li>
                      <li>• Remesas bancarias SEPA</li>
                    </ul>
                  </div>
                </div>

                <div className="flex gap-4 p-4 border rounded-lg">
                  <div className="rounded-full bg-primary/10 p-3 h-fit">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">Inmovilizado Material</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Gestión completa de activos fijos con amortizaciones automáticas.
                      Como ContaPlus.
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Amortizaciones mensuales automáticas</li>
                      <li>• Libro de bienes de inversión</li>
                      <li>• Métodos lineal, degresivo, por unidades</li>
                    </ul>
                  </div>
                </div>

                <div className="flex gap-4 p-4 border rounded-lg">
                  <div className="rounded-full bg-primary/10 p-3 h-fit">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">Contabilidad Analítica</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Centros de coste y proyectos para análisis de rentabilidad.
                      Tipo Holded/Anfix.
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Centros de coste jerárquicos</li>
                      <li>• Seguimiento de proyectos/obras</li>
                      <li>• Análisis de desviaciones presupuestarias</li>
                    </ul>
                  </div>
                </div>

                <div className="flex gap-4 p-4 border rounded-lg">
                  <div className="rounded-full bg-primary/10 p-3 h-fit">
                    <Calculator className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">Modelos Fiscales</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Generación automática de modelos AEAT. Estándar en A3/Sage.
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Modelo 303 (IVA trimestral)</li>
                      <li>• Modelo 347 (Operaciones con terceros)</li>
                      <li>• Modelo 390 (Resumen anual IVA)</li>
                    </ul>
                  </div>
                </div>

                <div className="flex gap-4 p-4 border rounded-lg">
                  <div className="rounded-full bg-primary/10 p-3 h-fit">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">Previsión de Tesorería</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Proyección de flujos de caja basada en vencimientos pendientes.
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Calendario de cobros y pagos</li>
                      <li>• Alertas de necesidades de liquidez</li>
                      <li>• Gráficos de flujo proyectado</li>
                    </ul>
                  </div>
                </div>

                <div className="flex gap-4 p-4 border rounded-lg">
                  <div className="rounded-full bg-primary/10 p-3 h-fit">
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">Consolidación Multiempresa</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Estados financieros consolidados con eliminaciones intercompany.
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Consolidación automática por grupo</li>
                      <li>• Eliminaciones de operaciones internas</li>
                      <li>• Balance y PyG consolidados</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Inspirado en software líder:</strong> Estas funcionalidades replican
              características de Sage ContaPlus, A3 Software (Wolters Kluwer), Holded y Anfix,
              adaptadas específicamente para la normativa contable española (PGC).
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="vencimientos">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Vencimientos y Efectos</CardTitle>
              <CardDescription>
                Control de cobros y pagos • Remesas SEPA • Pagarés y letras
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertDescription>
                  Módulo en desarrollo. Permitirá gestionar vencimientos de facturas,
                  generar remesas bancarias SEPA y controlar efectos comerciales.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inmovilizado">
          <Card>
            <CardHeader>
              <CardTitle>Inmovilizado Material</CardTitle>
              <CardDescription>
                Activos fijos • Amortizaciones automáticas • Libro de bienes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertDescription>
                  Módulo en desarrollo. Gestión completa de activos fijos con cálculo
                  automático de amortizaciones mensuales según diferentes métodos.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analitica">
          <Card>
            <CardHeader>
              <CardTitle>Contabilidad Analítica</CardTitle>
              <CardDescription>
                Centros de coste • Proyectos • Análisis de rentabilidad
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertDescription>
                  Módulo en desarrollo. Permitirá asignar transacciones a centros de coste
                  y proyectos para análisis detallado de rentabilidad.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fiscal">
          <Card>
            <CardHeader>
              <CardTitle>Modelos Fiscales AEAT</CardTitle>
              <CardDescription>
                Modelo 303 • Modelo 347 • Modelo 390 • Generación automática
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertDescription>
                  Módulo en desarrollo. Generación automática de modelos fiscales
                  oficiales de la Agencia Tributaria con datos de la contabilidad.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
