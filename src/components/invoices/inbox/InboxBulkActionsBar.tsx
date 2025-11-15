import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, BookCheck, X, Loader2 } from "lucide-react";

interface InboxBulkActionsBarProps {
  selectedCount: number;
  activeTab: string;
  onApprove: () => void;
  onPost: () => void;
  onClear: () => void;
  isLoading?: boolean;
}

export function InboxBulkActionsBar({
  selectedCount,
  activeTab,
  onApprove,
  onPost,
  onClear,
  isLoading = false,
}: InboxBulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <Card className="fixed bottom-6 left-1/2 -translate-x-1/2 shadow-lg border-primary/20 z-50">
      <div className="flex items-center gap-4 px-6 py-3">
        <div className="flex flex-col">
          <span className="text-sm font-medium">
            {selectedCount} factura{selectedCount > 1 ? "s" : ""} seleccionada{selectedCount > 1 ? "s" : ""}
          </span>
          <span className="text-xs text-muted-foreground">
            {activeTab === "pending" && "Listas para aprobar"}
            {activeTab === "approved" && "Listas para contabilizar"}
          </span>
        </div>

        <div className="flex items-center gap-2 ml-4">
          {activeTab === "pending" && (
            <Button
              size="sm"
              onClick={onApprove}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Aprobar selección
            </Button>
          )}

          {activeTab === "approved" && (
            <Button
              size="sm"
              onClick={onPost}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BookCheck className="h-4 w-4" />
              )}
              Contabilizar selección
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={onClear}
            disabled={isLoading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
