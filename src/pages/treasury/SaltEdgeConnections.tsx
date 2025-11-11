import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle, Clock, Link2, RefreshCw, Trash2, XCircle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  useSaltEdgeConnections,
  useSaltEdgeSyncLogs,
  useCreateBankConnection,
  useSyncBankTransactions,
  useDeleteConnection,
} from "@/hooks/useSaltEdgeConnections";

const SPANISH_BANKS = [
  { code: 'bbva_es', name: 'BBVA España' },
  { code: 'santander_es', name: 'Banco Santander' },
  { code: 'caixabank_es', name: 'CaixaBank' },
  { code: 'sabadell_es', name: 'Banco Sabadell' },
  { code: 'bankia_es', name: 'Bankia' },
  { code: 'ing_es', name: 'ING Direct' },
  { code: 'openbank_es', name: 'Openbank' },
  { code: 'n26_es', name: 'N26' },
  { code: 'revolut_es', name: 'Revolut' },
];

export default function SaltEdgeConnections() {
  const [selectedCentro, setSelectedCentro] = useState<string>('');
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: connections, isLoading: loadingConnections } = useSaltEdgeConnections(selectedCentro || undefined);
  const { data: syncLogs, isLoading: loadingLogs } = useSaltEdgeSyncLogs();
  
  const createConnection = useCreateBankConnection();
  const syncTransactions = useSyncBankTransactions();
  const deleteConnection = useDeleteConnection();

  const handleCreateConnection = () => {
    if (!selectedCentro || !selectedProvider) {
      return;
    }

    createConnection.mutate({
      centroCode: selectedCentro,
      providerCode: selectedProvider,
    });

    setDialogOpen(false);
  };

  const handleSync = (connectionId?: string) => {
    syncTransactions.mutate({ connectionId, centroCode: selectedCentro || undefined });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: { variant: 'default' as const, icon: CheckCircle, label: 'Activa' },
      inactive: { variant: 'secondary' as const, icon: Clock, label: 'Inactiva' },
      reconnect_required: { variant: 'destructive' as const, icon: AlertCircle, label: 'Reconexión requerida' },
      disabled: { variant: 'outline' as const, icon: XCircle, label: 'Deshabilitada' },
    };

    const config = variants[status as keyof typeof variants] || variants.inactive;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getSyncStatusBadge = (status: string) => {
    const variants = {
      success: { variant: 'default' as const, label: 'Éxito' },
      error: { variant: 'destructive' as const, label: 'Error' },
      partial: { variant: 'secondary' as const, label: 'Parcial' },
    };

    const config = variants[status as keyof typeof variants] || variants.error;

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Conexiones Bancarias</h1>
          <p className="text-muted-foreground">
            Gestiona tus conexiones con bancos mediante Salt Edge (PSD2/Open Banking)
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Link2 className="mr-2 h-4 w-4" />
              Nueva Conexión
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Conectar Banco</DialogTitle>
              <DialogDescription>
                Selecciona el centro y el banco que deseas conectar mediante Open Banking.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="centro">Centro</Label>
                <Select value={selectedCentro} onValueChange={setSelectedCentro}>
                  <SelectTrigger id="centro">
                    <SelectValue placeholder="Selecciona un centro" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CENTRO01">Centro 01</SelectItem>
                    <SelectItem value="CENTRO02">Centro 02</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="banco">Banco</Label>
                <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                  <SelectTrigger id="banco">
                    <SelectValue placeholder="Selecciona un banco" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPANISH_BANKS.map((bank) => (
                      <SelectItem key={bank.code} value={bank.code}>
                        {bank.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateConnection} disabled={!selectedCentro || !selectedProvider}>
                Conectar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Conexiones Activas</CardTitle>
              <CardDescription>
                Sincronización automática diaria de cuentas y transacciones
              </CardDescription>
            </div>
            <Button variant="outline" onClick={() => handleSync()} disabled={syncTransactions.isPending}>
              <RefreshCw className={`mr-2 h-4 w-4 ${syncTransactions.isPending ? 'animate-spin' : ''}`} />
              Sincronizar Todo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingConnections ? (
            <p className="text-muted-foreground text-center py-8">Cargando conexiones...</p>
          ) : !connections || connections.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hay conexiones bancarias. Crea una nueva conexión para empezar.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Banco</TableHead>
                  <TableHead>Centro</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Última Sincronización</TableHead>
                  <TableHead>Consentimiento</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {connections.map((connection) => (
                  <TableRow key={connection.id}>
                    <TableCell className="font-medium">{connection.provider_name}</TableCell>
                    <TableCell>{connection.centro_code}</TableCell>
                    <TableCell>{getStatusBadge(connection.status)}</TableCell>
                    <TableCell>
                      {connection.last_success_at ? (
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(connection.last_success_at), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Nunca</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {connection.consent_expires_at ? (
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(connection.consent_expires_at), 'dd/MM/yyyy', { locale: es })}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSync(connection.connection_id)}
                        disabled={syncTransactions.isPending}
                      >
                        <RefreshCw className={`h-4 w-4 ${syncTransactions.isPending ? 'animate-spin' : ''}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteConnection.mutate(connection.id)}
                        disabled={deleteConnection.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Sincronizaciones</CardTitle>
          <CardDescription>Últimas 50 sincronizaciones</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingLogs ? (
            <p className="text-muted-foreground text-center py-8">Cargando historial...</p>
          ) : !syncLogs || syncLogs.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hay sincronizaciones registradas todavía.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Cuentas</TableHead>
                  <TableHead>Transacciones</TableHead>
                  <TableHead>Duración</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {format(new Date(log.started_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </TableCell>
                    <TableCell className="capitalize">{log.sync_type}</TableCell>
                    <TableCell>{getSyncStatusBadge(log.status)}</TableCell>
                    <TableCell>{log.accounts_synced}</TableCell>
                    <TableCell>{log.transactions_synced}</TableCell>
                    <TableCell>
                      {log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}s` : '-'}
                    </TableCell>
                    <TableCell>
                      {log.error_message && (
                        <span className="text-sm text-destructive truncate max-w-xs block">
                          {log.error_message}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
