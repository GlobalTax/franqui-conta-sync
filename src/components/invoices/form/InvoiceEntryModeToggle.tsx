import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, FileText } from 'lucide-react';

interface InvoiceEntryModeToggleProps {
  mode: 'auto-ocr' | 'manual';
  onChange: (mode: 'auto-ocr' | 'manual') => void;
  disabled?: boolean;
}

export function InvoiceEntryModeToggle({ mode, onChange, disabled }: InvoiceEntryModeToggleProps) {
  return (
    <Card className="border-2">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-semibold text-foreground">Modo de entrada</h3>
              <p className="text-sm text-muted-foreground">
                {mode === 'auto-ocr' 
                  ? 'OCR automático al subir PDF' 
                  : 'Completar campos manualmente'}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={mode === 'auto-ocr' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange('auto-ocr')}
              disabled={disabled}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Automático
            </Button>
            <Button
              variant={mode === 'manual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange('manual')}
              disabled={disabled}
            >
              <FileText className="h-4 w-4 mr-2" />
              Manual
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
