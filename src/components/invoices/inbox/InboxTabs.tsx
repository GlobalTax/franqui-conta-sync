import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle, BookCheck, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface InboxTab {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  description: string;
}

interface InboxTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: InboxTab[];
}

export function InboxTabs({ activeTab, onTabChange, tabs }: InboxTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-4 h-auto p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <TabsTrigger
              key={tab.key}
              value={tab.key}
              className="flex items-center gap-2 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Icon className="h-4 w-4" />
              <span className="font-medium">{tab.label}</span>
              <Badge variant="secondary" className="ml-auto">
                {tab.count}
              </Badge>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
