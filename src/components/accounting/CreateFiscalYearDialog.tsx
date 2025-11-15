import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { useCreateFiscalYear } from '@/hooks/useFiscalYears';

interface CreateFiscalYearDialogProps {
  centroCode: string;
}

export function CreateFiscalYearDialog({ centroCode }: CreateFiscalYearDialogProps) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const createFiscalYear = useCreateFiscalYear();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    createFiscalYear.mutate(
      {
        year,
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
        centroCode,
      },
      {
        onSuccess: () => {
          setOpen(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Crear Ejercicio Fiscal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear Ejercicio Fiscal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="year">Año</Label>
            <Input
              id="year"
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              min={2000}
              max={2100}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Período</Label>
            <div className="text-sm text-muted-foreground">
              Del {year}-01-01 al {year}-12-31
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createFiscalYear.isPending}>
              {createFiscalYear.isPending ? 'Creando...' : 'Crear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
