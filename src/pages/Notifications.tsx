import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCheck } from "lucide-react";
import { useNotifications, useUnreadCount, useMarkAllAsRead } from "@/hooks/useNotifications";
import { NotificationItem } from "@/components/notifications/NotificationItem";

export default function Notifications() {
  const { data: notifications, isLoading } = useNotifications();
  const unreadCount = useUnreadCount();
  const markAllAsRead = useMarkAllAsRead();

  const unreadNotifications = notifications?.filter((n) => !n.leida) || [];
  const readNotifications = notifications?.filter((n) => n.leida) || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Notificaciones</h1>
        {unreadCount > 0 && (
          <Button onClick={() => markAllAsRead.mutate()}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Marcar todas como leídas
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="all">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="all">
                Todas ({notifications?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="unread">
                No leídas ({unreadCount})
              </TabsTrigger>
              <TabsTrigger value="read">
                Leídas ({readNotifications.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-0">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground">
                  Cargando notificaciones...
                </div>
              ) : notifications && notifications.length > 0 ? (
                <div className="divide-y divide-border">
                  {notifications.map((notification) => (
                    <NotificationItem key={notification.id} notification={notification} />
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  No hay notificaciones
                </div>
              )}
            </TabsContent>

            <TabsContent value="unread" className="mt-0">
              {unreadNotifications.length > 0 ? (
                <div className="divide-y divide-border">
                  {unreadNotifications.map((notification) => (
                    <NotificationItem key={notification.id} notification={notification} />
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  No hay notificaciones sin leer
                </div>
              )}
            </TabsContent>

            <TabsContent value="read" className="mt-0">
              {readNotifications.length > 0 ? (
                <div className="divide-y divide-border">
                  {readNotifications.map((notification) => (
                    <NotificationItem key={notification.id} notification={notification} />
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  No hay notificaciones leídas
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
