import { Bell, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMarkAsRead } from "@/hooks/useNotifications";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface NotificationItemProps {
  notification: any;
  compact?: boolean;
}

export function NotificationItem({ notification, compact = false }: NotificationItemProps) {
  const markAsRead = useMarkAsRead();

  const handleClick = () => {
    if (!notification.leida) {
      markAsRead.mutate(notification.id);
    }
  };

  const getIcon = () => {
    switch (notification.severidad) {
      case "critica":
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case "alta":
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case "media":
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <div
      className={cn(
        "p-4 border-b border-border cursor-pointer hover:bg-accent transition-colors",
        !notification.leida && "bg-accent/50",
        compact && "p-3"
      )}
      onClick={handleClick}
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0 mt-1">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={cn("font-medium text-sm", !notification.leida && "font-semibold")}>
              {notification.titulo}
            </p>
            {!notification.leida && (
              <div className="flex-shrink-0 h-2 w-2 rounded-full bg-primary" />
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{notification.mensaje}</p>
          {notification.centro && (
            <p className="text-xs text-muted-foreground mt-1">Centro: {notification.centro}</p>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            {format(new Date(notification.created_at), "dd MMM yyyy 'a las' HH:mm", {
              locale: es,
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
