import { useRef } from 'react';
import { Upload, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useParseNorma43 } from '@/hooks/useNorma43';

interface ImportNorma43ButtonProps {
  centroCode: string;
  bankAccountId: string;
  onImportSuccess?: () => void;
}

export function ImportNorma43Button({ centroCode, bankAccountId, onImportSuccess }: ImportNorma43ButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const parseNorma43 = useParseNorma43();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      
      await parseNorma43.mutateAsync({
        centroCode,
        bankAccountId,
        fileName: file.name,
        fileContent: content,
      });
      
      onImportSuccess?.();
    } catch (error) {
      console.error('Norma43 import error:', error);
    } finally {
      event.target.value = '';
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={parseNorma43.isPending}
      >
        {parseNorma43.isPending ? (
          <>
            <FileText className="h-4 w-4 mr-2 animate-pulse" />
            Procesando...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Importar Norma43
          </>
        )}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.43,.n43"
        onChange={handleFileSelect}
        className="hidden"
      />
    </>
  );
}
