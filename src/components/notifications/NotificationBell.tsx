import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotifications, useUnreadCount } from "@/hooks/useNotifications";
import { NotificationItem } from "./NotificationItem";
import { useNavigate } from "react-router-dom";

export function NotificationBell() {
  const { data: notifications } = useNotifications();
  const unreadCount = useUnreadCount();
  const navigate = useNavigate();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b border-border">
          <h4 className="font-semibold">Notificaciones</h4>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {notifications && notifications.length > 0 ? (
            notifications.slice(0, 5).map((notification) => (
              <NotificationItem key={notification.id} notification={notification} compact />
            ))
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No hay notificaciones
            </div>
          )}
        </div>

        {notifications && notifications.length > 0 && (
          <div className="p-2 border-t border-border">
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => navigate("/notificaciones")}
            >
              Ver todas
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
