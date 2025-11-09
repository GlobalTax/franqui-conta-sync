import { HoldedKPICards } from "@/components/examples/HoldedKPICards";
import { HoldedBarChart } from "@/components/examples/HoldedBarChart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Palette, BarChart3, Type, Layout } from "lucide-react";

export default function StyleGuide() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-8">
          <h1 className="font-heading text-4xl font-bold text-foreground mb-3">
            Holded Style Guide
          </h1>
          <p className="text-lg text-muted-foreground font-body max-w-3xl">
            Sistema de diseño moderno con paleta cálida, tipografías Plus Jakarta Sans + Inter,
            y componentes accesibles siguiendo las mejores prácticas de Holded.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <Tabs defaultValue="kpis" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-4 mb-8">
            <TabsTrigger value="kpis" className="flex items-center gap-2">
              <Layout className="h-4 w-4" />
              <span className="hidden sm:inline">KPIs</span>
            </TabsTrigger>
            <TabsTrigger value="charts" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Charts</span>
            </TabsTrigger>
            <TabsTrigger value="colors" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Colors</span>
            </TabsTrigger>
            <TabsTrigger value="typography" className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              <span className="hidden sm:inline">Type</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="kpis">
            <HoldedKPICards />
          </TabsContent>

          <TabsContent value="charts">
            <HoldedBarChart />
          </TabsContent>

          <TabsContent value="colors" className="space-y-8">
            <div className="holded-chart-card">
              <h2 className="font-heading text-2xl font-bold mb-6">Paleta de Colores</h2>
              
              <div className="space-y-8">
                <div>
                  <h3 className="font-heading text-lg font-semibold mb-4">Primary - Amarillo Suave</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="space-y-2">
                      <div className="h-20 rounded-xl bg-primary-50 border border-border"></div>
                      <p className="text-xs font-body text-muted-foreground">50</p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-20 rounded-xl bg-primary-100 border border-border"></div>
                      <p className="text-xs font-body text-muted-foreground">100</p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-20 rounded-xl bg-primary border border-border"></div>
                      <p className="text-xs font-body font-semibold">500 (Base)</p>
                      <p className="text-xs font-mono">#FCD34D</p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-20 rounded-xl bg-primary-600 border border-border"></div>
                      <p className="text-xs font-body text-muted-foreground">600</p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-20 rounded-xl bg-primary-700 border border-border"></div>
                      <p className="text-xs font-body text-muted-foreground">700</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-heading text-lg font-semibold mb-4">Neutrals - Grises Cálidos</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <div className="h-20 rounded-xl bg-background border border-border"></div>
                      <p className="text-xs font-body">Background</p>
                      <p className="text-xs font-mono">#F8FAFB</p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-20 rounded-xl bg-card border border-border"></div>
                      <p className="text-xs font-body">Card</p>
                      <p className="text-xs font-mono">#FFFFFF</p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-20 rounded-xl bg-muted border border-border"></div>
                      <p className="text-xs font-body">Muted</p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-20 rounded-xl border-2 border-border bg-background"></div>
                      <p className="text-xs font-body">Border</p>
                      <p className="text-xs font-mono">#E5E7EB</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-heading text-lg font-semibold mb-4">Semantic Colors</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <div className="h-20 rounded-xl bg-success border border-border"></div>
                      <p className="text-xs font-body">Success</p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-20 rounded-xl bg-warning border border-border"></div>
                      <p className="text-xs font-body">Warning</p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-20 rounded-xl bg-destructive border border-border"></div>
                      <p className="text-xs font-body">Destructive</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="typography" className="space-y-8">
            <div className="holded-chart-card">
              <h2 className="font-heading text-2xl font-bold mb-6">Sistema Tipográfico</h2>
              
              <div className="space-y-8">
                <div>
                  <h3 className="font-heading text-lg font-semibold mb-4">Plus Jakarta Sans - Headings</h3>
                  <div className="space-y-4">
                    <div>
                      <h1 className="font-heading text-4xl font-bold">
                        Heading 1 - Bold 4xl
                      </h1>
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        font-heading text-4xl font-bold
                      </p>
                    </div>
                    <div>
                      <h2 className="font-heading text-3xl font-bold">
                        Heading 2 - Bold 3xl
                      </h2>
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        font-heading text-3xl font-bold
                      </p>
                    </div>
                    <div>
                      <h3 className="font-heading text-2xl font-semibold">
                        Heading 3 - Semibold 2xl
                      </h3>
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        font-heading text-2xl font-semibold
                      </p>
                    </div>
                  </div>
                </div>

                <div className="holded-divider"></div>

                <div>
                  <h3 className="font-heading text-lg font-semibold mb-4">Inter - Body Text</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="font-body text-lg">
                        Body Large - Regular 18px
                      </p>
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        font-body text-lg
                      </p>
                    </div>
                    <div>
                      <p className="font-body text-base">
                        Body Base - Regular 16px (default)
                      </p>
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        font-body text-base
                      </p>
                    </div>
                    <div>
                      <p className="font-body text-sm">
                        Body Small - Regular 14px
                      </p>
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        font-body text-sm
                      </p>
                    </div>
                    <div>
                      <p className="font-body text-xs text-muted-foreground">
                        Caption - Regular 12px
                      </p>
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        font-body text-xs text-muted-foreground
                      </p>
                    </div>
                  </div>
                </div>

                <div className="holded-divider"></div>

                <div>
                  <h3 className="font-heading text-lg font-semibold mb-4">Pesos Disponibles</h3>
                  <div className="space-y-2">
                    <p className="font-body font-light">Light 300</p>
                    <p className="font-body font-normal">Regular 400</p>
                    <p className="font-body font-medium">Medium 500</p>
                    <p className="font-body font-semibold">Semibold 600</p>
                    <p className="font-body font-bold">Bold 700</p>
                    <p className="font-heading font-extrabold">Extrabold 800 (Plus Jakarta)</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
