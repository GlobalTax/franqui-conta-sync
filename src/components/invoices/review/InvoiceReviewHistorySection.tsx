import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, User } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Approval {
  id: string;
  approval_level: string;
  action: string;
  comments: string | null;
  created_at: string;
}

interface InvoiceReviewHistorySectionProps {
  approvals: Approval[];
}

export function InvoiceReviewHistorySection({ approvals }: InvoiceReviewHistorySectionProps) {
  if (!approvals || approvals.length === 0) return null;

  return (
    <section>
      <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" />
        Historial de Aprobaciones
      </h3>
      <div className="space-y-3">
        {approvals.map((approval) => (
          <Card key={approval.id} className="p-4 border-border/40">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                {approval.action === "approved" ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{approval.approval_level}</span>
                  <Badge
                    variant={approval.action === "approved" ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {approval.action === "approved" ? "Aprobado" : "Rechazado"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(approval.created_at), "dd/MM/yyyy HH:mm", {
                    locale: es,
                  })}
                </p>
                {approval.comments && (
                  <p className="text-sm mt-2 bg-accent/30 p-2 rounded">
                    {approval.comments}
                  </p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
