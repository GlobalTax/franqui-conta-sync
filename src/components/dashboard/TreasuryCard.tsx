import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, TrendingUp, TrendingDown, AlertCircle, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TreasuryCardProps {
  bankBalance: number;
  cashAudit: {
    expected: number;
    actual: number;
    difference: number;
    percentDiff: number;
  } | null;
}

export function TreasuryCard({ bankBalance, cashAudit }: TreasuryCardProps) {
  const navigate = useNavigate();

  const getDiffIcon = () => {
    if (!cashAudit) return null;
    const absDiff = Math.abs(cashAudit.percentDiff);
    if (absDiff < 0.5) return <TrendingUp className="h-4 w-4 text-success" />;
    if (absDiff < 2) return <AlertCircle className="h-4 w-4 text-warning" />;
    return <TrendingDown className="h-4 w-4 text-destructive" />;
  };

  const getDiffColor = () => {
    if (!cashAudit) return "text-muted-foreground";
    const absDiff = Math.abs(cashAudit.percentDiff);
    if (absDiff < 0.5) return "text-success";
    if (absDiff < 2) return "text-warning";
    return "text-destructive";
  };

  return (
    <Card className="border-border/40 hover:border-border transition-all duration-200 border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" strokeWidth={1.5} />
          Tesorería Diaria
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Saldo Bancario</p>
          <p className="text-2xl font-bold">
            {bankBalance.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
          </p>
        </div>

        <div className="border-t border-border/40 pt-4">
          <p className="text-sm text-muted-foreground mb-2">Arqueo de Caja Hoy</p>
          {cashAudit ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Esperado:</span>
                <span className="font-medium">
                  {cashAudit.expected.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Real:</span>
                <span className="font-medium">
                  {cashAudit.actual.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                </span>
              </div>
              <div className={`flex items-center justify-between text-sm font-semibold ${getDiffColor()}`}>
                <div className="flex items-center gap-1">
                  {getDiffIcon()}
                  <span>Diferencia:</span>
                </div>
                <span>
                  {cashAudit.difference.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                  {' '}({cashAudit.percentDiff > 0 ? '+' : ''}{cashAudit.percentDiff.toFixed(2)}%)
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin datos de arqueo hoy</p>
          )}
        </div>

        <div className="pt-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-between group"
            onClick={() => navigate('/accounting/daily-closure')}
          >
            Ver Detalle
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
