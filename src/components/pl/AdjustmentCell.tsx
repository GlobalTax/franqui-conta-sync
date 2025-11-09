import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, X, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdjustmentCellProps {
  rubricCode: string;
  currentAdjustment: number;
  onUpdate: (amount: number) => void;
  isDisabled?: boolean;
  className?: string;
}

export const AdjustmentCell = ({
  rubricCode,
  currentAdjustment,
  onUpdate,
  isDisabled = false,
  className,
}: AdjustmentCellProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(currentAdjustment);

  // Sincronizar con prop externa si cambia
  useEffect(() => {
    setValue(currentAdjustment);
  }, [currentAdjustment]);

  const handleSave = () => {
    onUpdate(value);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setValue(currentAdjustment);
    setIsEditing(false);
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  if (isDisabled) {
    return (
      <div className={cn("text-right text-muted-foreground", className)}>
        —
      </div>
    );
  }

  if (!isEditing) {
    return (
      <div
        className={cn(
          "flex items-center justify-end gap-2 cursor-pointer hover:bg-accent p-2 rounded transition-colors group",
          className
        )}
        onClick={() => setIsEditing(true)}
      >
        <span
          className={cn(
            "font-mono",
            value === 0 ? "text-muted-foreground" : "font-semibold"
          )}
        >
          {formatCurrency(value)}
        </span>
        <Edit2 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1 justify-end", className)}>
      <Input
        type="number"
        value={value}
        onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
        className="w-32 h-8 text-right font-mono"
        step="0.01"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") handleCancel();
        }}
      />
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0 hover:bg-green-100"
        onClick={handleSave}
      >
        <Check className="h-4 w-4 text-green-600" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0 hover:bg-red-100"
        onClick={handleCancel}
      >
        <X className="h-4 w-4 text-red-600" />
      </Button>
    </div>
  );
};
