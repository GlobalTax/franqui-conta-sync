import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Clock, CheckCircle2, XCircle, Sparkles, ArrowRight, AlertCircle } from "lucide-react";
import { useReconciliation } from "@/hooks/useReconciliation";
import { useOrganization } from "@/hooks/useOrganization";
import { Skeleton } from "@/components/ui/skeleton";

const Reconciliation = () => {
  const [selectedTab, setSelectedTab] = useState("pending");
  const { currentMembership } = useOrganization();
  const selectedCentro = currentMembership?.restaurant?.codigo;

  const {
    pendingMatches,
    approvedMatches,
    isLoading,
    approveMatch,
    rejectMatch,
  } = useReconciliation(selectedCentro);

  const mockReconciliations = [
    {
      id: "1",
      transaction: {
        date: "2024-01-15",
        description: "TRANSFERENCIA PROVEEDOR A SL",
        amount: -1234.56,
      },
      match: {
        type: "invoice",
        number: "FACT-2024-001",
        supplier: "Proveedor A SL",
        amount: 1234.56,
      },
      score: 0.95,
      status: "suggested",
      rules: ["Importe exacto", "Coincidencia texto 95%"],
    },
    {
      id: "2",
      transaction: {
        date: "2024-01-16",
        description: "DOM ELECTRICIDAD ENE",
        amount: -567.89,
      },
      match: {
        type: "invoice",
        number: "FACT-2024-005",
        supplier: "Compañía Eléctrica",
        amount: 567.89,
      },
      score: 0.88,
      status: "suggested",
      rules: ["Importe exacto", "Fecha ±3 días"],
    },
    {
      id: "3",
      transaction: {
        date: "2024-01-17",
        description: "INGRESO TPV DIA 16/01",
        amount: 3456.78,
      },
      match: null,
      score: 0,
      status: "pending",
      rules: [],
    },
  ];

  const approvedReconciliations = [
    {
      id: "4",
      transaction: {
        date: "2024-01-10",
        description: "TRANSFERENCIA PROVEEDOR B",
        amount: -987.65,
      },
      match: {
        type: "invoice",
        number: "FACT-2024-003",
        supplier: "Proveedor B",
        amount: 987.65,
      },
      status: "auto",
      approvedBy: "María García",
      approvedAt: "2024-01-10 14:30",
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "auto":
        return (
          <Badge className="bg-success-light text-success hover:bg-success-light">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Automática
          </Badge>
        );
      case "suggested":
        return (
          <Badge className="bg-warning-light text-warning hover:bg-warning-light">
            <AlertCircle className="mr-1 h-3 w-3" />
            Sugerida
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            Pendiente
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Rechazada
          </Badge>
        );
      default:
        return null;
    }
  };

  const renderReconciliationCard = (recon: any, showActions = true) => (
    <Card key={recon.id} className="overflow-hidden">
      <CardContent className="p-0">
        <div className="grid md:grid-cols-2 gap-px bg-border">
          {/* Transaction */}
          <div className="bg-card p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  TRANSACCIÓN BANCARIA
                </p>
                <p className="font-medium text-foreground mb-2">
                  {recon.transaction.description}
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">
                    {recon.transaction.date}
                  </span>
                  <span
                    className={`font-semibold ${
                      recon.transaction.amount > 0
                        ? "text-success"
                        : "text-destructive"
                    }`}
                  >
                    {recon.transaction.amount.toFixed(2)}€
                  </span>
                </div>
              </div>
              {getStatusBadge(recon.status)}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Banco: ES12 1234 5678 90</span>
              <span>•</span>
              <span>Madrid Centro</span>
            </div>
          </div>

          {/* Match */}
          <div className="bg-card p-6 border-l-4 border-l-primary/20">
            {recon.match ? (
              <>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  FACTURA RELACIONADA
                </p>
                <p className="font-medium text-foreground mb-2">
                  {recon.match.number}
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Proveedor:</span>
                    <span className="font-medium">{recon.match.supplier}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Importe:</span>
                    <span className="font-semibold text-foreground">
                      {recon.match.amount.toFixed(2)}€
                    </span>
                  </div>
                  {recon.score > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Reglas aplicadas:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {recon.rules.map((rule: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {rule}
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            Confianza:
                          </span>
                          <span className="font-semibold text-primary">
                            {(recon.score * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${recon.score * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {recon.approvedBy && (
                  <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                    <p>
                      Aprobado por {recon.approvedBy} • {recon.approvedAt}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-foreground mb-1">
                  Sin coincidencias
                </p>
                <p className="text-xs text-muted-foreground">
                  No se encontraron facturas relacionadas
                </p>
              </div>
            )}
          </div>
        </div>

        {showActions && recon.match && recon.status === "suggested" && (
          <div className="bg-muted/30 p-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              ¿Confirmar esta conciliación?
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => rejectMatch(recon.id)}
              >
                Rechazar
              </Button>
              <Button
                size="sm"
                className="gap-2"
                onClick={() => approveMatch(recon.id)}
              >
                <CheckCircle2 className="h-4 w-4" />
                Aprobar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Conciliación Bancaria
          </h1>
          <p className="text-muted-foreground mt-2">
            Revisión y aprobación de coincidencias automáticas
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Pendientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground mt-1">
                Requieren revisión
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Sugeridas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">12</div>
              <p className="text-xs text-muted-foreground mt-1">
                Confianza &gt; 80%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Aprobadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">156</div>
              <p className="text-xs text-muted-foreground mt-1">Este mes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Precisión</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">94%</div>
              <p className="text-xs text-muted-foreground mt-1">
                Conciliaciones automáticas
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList>
            <TabsTrigger value="pending">
              Pendientes de Revisión
              <Badge className="ml-2 bg-warning-light text-warning">12</Badge>
            </TabsTrigger>
            <TabsTrigger value="approved">Aprobadas</TabsTrigger>
            <TabsTrigger value="rejected">Rechazadas</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4 mt-6">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-40" />
                ))}
              </div>
            ) : pendingMatches.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay conciliaciones pendientes</p>
                <p className="text-sm mt-2">
                  Usa el botón "Sugerir Conciliaciones" en la página de Bancos
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingMatches.map((match) => {
                  const tx = match.bank_transactions;
                  const recon = {
                    id: match.id,
                    transactionId: match.transaction_id,
                    date: tx.transaction_date,
                    amount: tx.amount,
                    bankDescription: tx.description,
                    status: match.status,
                    match: match.match_type ? {
                      type: match.match_type,
                      reference: match.match_type === "invoice" ? "FAC-001" : "ASI-001",
                      amount: Math.abs(tx.amount),
                      date: tx.transaction_date,
                    } : null,
                    score: match.confidence_score || 0,
                  };
                  return renderReconciliationCard(recon, true);
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4 mt-6">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-40" />
                ))}
              </div>
            ) : approvedMatches.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">
                    No hay conciliaciones aprobadas
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {approvedMatches.map((match) => {
                  const tx = match.bank_transactions;
                  const recon = {
                    id: match.id,
                    transactionId: match.transaction_id,
                    date: tx.transaction_date,
                    amount: tx.amount,
                    bankDescription: tx.description,
                    status: match.status,
                    match: {
                      type: match.match_type,
                      reference: match.match_type === "invoice" ? "FAC-001" : "ASI-001",
                      amount: Math.abs(tx.amount),
                      date: tx.transaction_date,
                    },
                    score: match.confidence_score || 0,
                    approvedBy: "Usuario",
                    approvedAt: match.approved_at ? new Date(match.approved_at).toLocaleDateString("es-ES") : "",
                  };
                  return renderReconciliationCard(recon, false);
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4 mt-6">
            <Card>
              <CardContent className="py-12 text-center">
                <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  No hay conciliaciones rechazadas
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Reconciliation;