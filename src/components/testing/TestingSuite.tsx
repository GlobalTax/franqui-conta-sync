import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTestingMode } from "@/hooks/useTestingMode";
import { FlaskConical, Bug } from "lucide-react";
import SandboxPanel from "./SandboxPanel";
import ScenarioSimulator from "./ScenarioSimulator";
import DebugPanel from "./DebugPanel";

export default function TestingSuite() {
  const { isTestingMode, isSandboxMode, toggleTestingMode, toggleSandboxMode } = useTestingMode();

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-6 w-6 text-primary" />
              Sistema de Testing Integral
            </CardTitle>
            <CardDescription>
              Panel completo para pruebas, simulaciones y debugging del sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="testing-mode" className="text-base font-medium">
                  Modo Testing
                </Label>
                <p className="text-sm text-muted-foreground">
                  Activa el panel de debug flotante con logs en tiempo real
                </p>
              </div>
              <Switch
                id="testing-mode"
                checked={isTestingMode}
                onCheckedChange={toggleTestingMode}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="sandbox-mode" className="text-base font-medium">
                  Modo Sandbox
                </Label>
                <p className="text-sm text-muted-foreground">
                  Marca las operaciones de prueba para rollback fácil
                </p>
              </div>
              <Switch
                id="sandbox-mode"
                checked={isSandboxMode}
                onCheckedChange={toggleSandboxMode}
              />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="sandbox" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sandbox">🎮 Sandbox</TabsTrigger>
            <TabsTrigger value="simulator">🔬 Simulador</TabsTrigger>
            <TabsTrigger value="tests">🧪 Tests Auto</TabsTrigger>
          </TabsList>

          <TabsContent value="sandbox" className="mt-6">
            <SandboxPanel />
          </TabsContent>

          <TabsContent value="simulator" className="mt-6">
            <ScenarioSimulator />
          </TabsContent>

          <TabsContent value="tests" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bug className="h-5 w-5 text-primary" />
                  Tests Automatizados
                </CardTitle>
                <CardDescription>
                  Ejecuta la suite de tests unitarios y de integración
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-4">
                    Para ejecutar los tests, usa los siguientes comandos en tu terminal:
                  </p>
                  <div className="space-y-2">
                    <code className="block p-3 bg-background rounded text-xs">
                      npm run test
                    </code>
                    <code className="block p-3 bg-background rounded text-xs">
                      npm run test:ui
                    </code>
                    <code className="block p-3 bg-background rounded text-xs">
                      npm run test:coverage
                    </code>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Tests disponibles:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>✅ Hooks de datos (useCompanies, useCentres, etc.)</li>
                    <li>✅ Validaciones de formularios</li>
                    <li>✅ Cálculos de P&L</li>
                    <li>✅ Utilidades y helpers</li>
                    <li>⏳ Tests E2E (próximamente)</li>
                  </ul>
                </div>

                <Button variant="outline" className="w-full" disabled>
                  Interfaz de Tests en Desarrollo
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <DebugPanel />
    </>
  );
}
