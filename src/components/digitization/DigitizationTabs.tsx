import { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Inbox, Sparkles, Upload, Search, Trash2 } from 'lucide-react';

interface DigitizationTabsProps {
  children: {
    inbox: ReactNode;
    nueva: ReactNode;
    carga: ReactNode;
    depura: ReactNode;
    papelera: ReactNode;
  };
  counts?: {
    inbox?: number;
    depura?: number;
    papelera?: number;
  };
}

export function DigitizationTabs({ children, counts }: DigitizationTabsProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'inbox';

  return (
    <Tabs value={activeTab} onValueChange={(tab) => setSearchParams({ tab })}>
      <TabsList className="grid w-full grid-cols-5 h-auto p-1">
        <TabsTrigger
          value="inbox"
          className="flex items-center gap-2 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
        >
          <Inbox className="h-4 w-4" />
          <span className="font-medium">Inbox</span>
          {counts?.inbox !== undefined && (
            <Badge variant="secondary" className="ml-auto">
              {counts.inbox}
            </Badge>
          )}
        </TabsTrigger>

        <TabsTrigger
          value="nueva"
          className="flex items-center gap-2 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
        >
          <Sparkles className="h-4 w-4" />
          <span className="font-medium">Nueva Factura</span>
        </TabsTrigger>

        <TabsTrigger
          value="carga"
          className="flex items-center gap-2 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
        >
          <Upload className="h-4 w-4" />
          <span className="font-medium">Carga Masiva</span>
        </TabsTrigger>

        <TabsTrigger
          value="depura"
          className="flex items-center gap-2 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
        >
          <Search className="h-4 w-4" />
          <span className="font-medium">Depura</span>
          {counts?.depura !== undefined && (
            <Badge variant="secondary" className="ml-auto">
              {counts.depura}
            </Badge>
          )}
        </TabsTrigger>

        <TabsTrigger
          value="papelera"
          className="flex items-center gap-2 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
        >
          <Trash2 className="h-4 w-4" />
          <span className="font-medium">Papelera</span>
          {counts?.papelera !== undefined && (
            <Badge variant="secondary" className="ml-auto">
              {counts.papelera}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="inbox" className="mt-6">
        {children.inbox}
      </TabsContent>

      <TabsContent value="nueva" className="mt-6">
        {children.nueva}
      </TabsContent>

      <TabsContent value="carga" className="mt-6">
        {children.carga}
      </TabsContent>

      <TabsContent value="depura" className="mt-6">
        {children.depura}
      </TabsContent>

      <TabsContent value="papelera" className="mt-6">
        {children.papelera}
      </TabsContent>
    </Tabs>
  );
}
