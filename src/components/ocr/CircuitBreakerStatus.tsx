import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Clock, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

type CircuitState = 'closed' | 'open' | 'half_open';
type ErrorType = 'auth' | 'rate_limit' | 'timeout' | 'server_error' | null;

interface CircuitBreakerState {
  engine: 'openai' | 'mindee';
  state: CircuitState;
  failure_count: number;
  last_failure_at: string | null;
  last_success_at: string | null;
  next_retry_at: string | null;
  error_type: ErrorType;
  updated_at: string;
}

function CircuitStateBadge({ state }: { state: CircuitState }) {
  const variants = {
    closed: { icon: CheckCircle, variant: 'default' as const, label: 'Operativo' },
    open: { icon: AlertCircle, variant: 'destructive' as const, label: 'Circuito Abierto' },
    half_open: { icon: Activity, variant: 'secondary' as const, label: 'Probando' }
  };

  const { icon: Icon, variant, label } = variants[state];

  return (
    <Badge variant={variant} className="flex items-center gap-1">
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
}

function formatRetryTime(nextRetryAt: string): string {
  const retryDate = new Date(nextRetryAt);
  const now = new Date();
  
  if (retryDate <= now) {
    return 'ahora';
  }
  
  return formatDistanceToNow(retryDate, { locale: es, addSuffix: true });
}

function ErrorTypeBadge({ errorType }: { errorType: ErrorType }) {
  if (!errorType) return null;

  const labels = {
    auth: 'Error de autenticación',
    rate_limit: 'Límite de tasa',
    timeout: 'Timeout',
    server_error: 'Error del servidor'
  };

  return (
    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
      {labels[errorType]}
    </span>
  );
}

export function CircuitBreakerStatus() {
  const { data: states, isLoading } = useQuery({
    queryKey: ['circuit-breaker-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ocr_circuit_breaker')
        .select('*')
        .order('engine');
      
      if (error) throw error;
      return data as CircuitBreakerState[];
    },
    refetchOnWindowFocus: true,
    refetchInterval: 2 * 60 * 1000, // Solo cada 2 min si tiene foco
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Circuit Breaker Status
          </CardTitle>
          <CardDescription>Cargando estado de motores OCR...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Circuit Breaker Status
        </CardTitle>
        <CardDescription>
          Estado de los motores OCR (actualizado cada 10s)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {states?.map(state => (
            <div 
              key={state.engine} 
              className="border rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold capitalize text-lg">
                  {state.engine === 'openai' ? 'OpenAI Vision' : 'Mindee'}
                </span>
                <CircuitStateBadge state={state.state} />
              </div>
              
              {state.state === 'open' && state.next_retry_at && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Reintento {formatRetryTime(state.next_retry_at)}</span>
                </div>
              )}
              
              {state.error_type && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  <ErrorTypeBadge errorType={state.error_type} />
                </div>
              )}
              
              {state.failure_count > 0 && (
                <div className="text-sm text-muted-foreground">
                  Fallos consecutivos: <span className="font-medium">{state.failure_count}</span>
                </div>
              )}
              
              <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
                {state.last_success_at && (
                  <div>
                    Último éxito: {formatDistanceToNow(new Date(state.last_success_at), { 
                      locale: es, 
                      addSuffix: true 
                    })}
                  </div>
                )}
                {state.last_failure_at && (
                  <div>
                    Último fallo: {formatDistanceToNow(new Date(state.last_failure_at), { 
                      locale: es, 
                      addSuffix: true 
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
