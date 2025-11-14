import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, FileText } from 'lucide-react';

interface InvoiceEntryModeTabsProps {
  mode: 'auto-ocr' | 'manual';
  onChange: (mode: 'auto-ocr' | 'manual') => void;
  disabled?: boolean;
}

export function InvoiceEntryModeTabs({ mode, onChange, disabled }: InvoiceEntryModeTabsProps) {
  return (
    <Tabs 
      value={mode} 
      onValueChange={(value) => onChange(value as 'auto-ocr' | 'manual')}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-2 h-12">
        <TabsTrigger 
          value="auto-ocr" 
          disabled={disabled}
          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-base"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          OCR Automático
        </TabsTrigger>
        <TabsTrigger 
          value="manual" 
          disabled={disabled}
          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-base"
        >
          <FileText className="h-4 w-4 mr-2" />
          Entrada Manual
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
