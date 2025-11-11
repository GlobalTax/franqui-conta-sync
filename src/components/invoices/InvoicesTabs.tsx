import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams } from "react-router-dom";

interface InvoicesTabsProps {
  children: {
    emitidas: React.ReactNode;
    recibidas: React.ReactNode;
    simplificada?: React.ReactNode;
    otros?: React.ReactNode;
    dua?: React.ReactNode;
  };
}

export const InvoicesTabs = ({ children }: InvoicesTabsProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'recibidas';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
      <div className="bg-background border-b">
        <TabsList className="border-b w-full justify-start rounded-none bg-transparent p-0 h-10 px-6">
          <TabsTrigger 
            value="emitidas" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 h-full text-sm"
          >
            Emitidas
          </TabsTrigger>
          <TabsTrigger 
            value="recibidas" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 h-full text-sm"
          >
            Recibidas
          </TabsTrigger>
          {children.simplificada && (
            <TabsTrigger 
              value="simplificada" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 h-full text-sm"
            >
              Recibidas Simplificada
            </TabsTrigger>
          )}
          {children.otros && (
            <TabsTrigger 
              value="otros" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 h-full text-sm"
            >
              Otros
            </TabsTrigger>
          )}
          {children.dua && (
            <TabsTrigger 
              value="dua" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 h-full text-sm"
            >
              DUA
            </TabsTrigger>
          )}
        </TabsList>
      </div>

      <div className="p-6">
        <TabsContent value="emitidas" className="mt-0">
          {children.emitidas}
        </TabsContent>
        <TabsContent value="recibidas" className="mt-0">
          {children.recibidas}
        </TabsContent>
        {children.simplificada && (
          <TabsContent value="simplificada" className="mt-0">
            {children.simplificada}
          </TabsContent>
        )}
        {children.otros && (
          <TabsContent value="otros" className="mt-0">
            {children.otros}
          </TabsContent>
        )}
        {children.dua && (
          <TabsContent value="dua" className="mt-0">
            {children.dua}
          </TabsContent>
        )}
      </div>
    </Tabs>
  );
};
