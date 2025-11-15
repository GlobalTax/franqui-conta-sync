import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Scan, Upload, Inbox, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function OCRQuickAccessCard() {
  const navigate = useNavigate();

  // Query para contar facturas pendientes en inbox
  const { data: pendingCount } = useQuery({
    queryKey: ['ocr-pending-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('invoices_received')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_ocr');
      return count || 0;
    },
    refetchOnWindowFocus: true,
  });

  return (
    <Card className="relative overflow-hidden group hover:border-primary/50 transition-all">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <CardHeader className="relative">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Digitalización de Facturas
            </CardTitle>
            <CardDescription>
              Procesa tus facturas con OCR automático
            </CardDescription>
          </div>
          {pendingCount !== undefined && pendingCount > 0 && (
            <Badge variant="secondary" className="animate-pulse">
              {pendingCount} pendientes
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="relative space-y-3">
        <div className="grid grid-cols-1 gap-2">
          <Button
            onClick={() => navigate('/invoices/new-received')}
            className="w-full justify-start gap-2 bg-primary hover:bg-primary/90"
            size="lg"
          >
            <Scan className="h-4 w-4" />
            <span>Nueva Factura con OCR</span>
          </Button>

          <Button
            onClick={() => navigate('/invoices/bulk-upload')}
            variant="outline"
            className="w-full justify-start gap-2 hover:bg-accent"
            size="lg"
          >
            <Upload className="h-4 w-4" />
            <span>Carga Masiva</span>
          </Button>

          <Button
            onClick={() => navigate('/digitalizacion/inbox')}
            variant="ghost"
            className="w-full justify-start gap-2 hover:bg-accent"
            size="lg"
          >
            <Inbox className="h-4 w-4" />
            <span>Ver Bandeja OCR</span>
          </Button>
        </div>

        <div className="pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Tip:</strong> Arrastra PDFs directamente o usa carga masiva para procesar múltiples facturas a la vez.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
