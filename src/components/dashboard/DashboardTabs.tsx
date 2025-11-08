import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Wallet, Users, Receipt } from "lucide-react";

interface DashboardTabsProps {
  defaultTab?: string;
  children: {
    resultado: React.ReactNode;
    tesoreria: React.ReactNode;
    cartera: React.ReactNode;
    impuestos: React.ReactNode;
  };
}

export const DashboardTabs = ({ defaultTab = "resultado", children }: DashboardTabsProps) => {
  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <div className="bg-background border-b sticky top-0 z-10">
        <div className="px-6">
          <TabsList className="border-b w-full justify-start rounded-none bg-transparent p-0 h-12">
            <TabsTrigger 
              value="resultado" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 h-full"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Resultado
            </TabsTrigger>
            <TabsTrigger 
              value="tesoreria"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 h-full"
            >
              <Wallet className="h-4 w-4 mr-2" />
              Tesorería
            </TabsTrigger>
            <TabsTrigger 
              value="cartera"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 h-full"
            >
              <Users className="h-4 w-4 mr-2" />
              Cartera
            </TabsTrigger>
            <TabsTrigger 
              value="impuestos"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 h-full"
            >
              <Receipt className="h-4 w-4 mr-2" />
              Impuestos
            </TabsTrigger>
          </TabsList>
        </div>
      </div>

      <div className="p-6">
        <TabsContent value="resultado" className="mt-0">
          {children.resultado}
        </TabsContent>
        <TabsContent value="tesoreria" className="mt-0">
          {children.tesoreria}
        </TabsContent>
        <TabsContent value="cartera" className="mt-0">
          {children.cartera}
        </TabsContent>
        <TabsContent value="impuestos" className="mt-0">
          {children.impuestos}
        </TabsContent>
      </div>
    </Tabs>
  );
};
