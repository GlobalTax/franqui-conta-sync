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
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Notificaciones</h1>
            <p className="text-muted-foreground mt-2">Centro de notificaciones y alertas</p>
          </div>
          {unreadCount > 0 && (
            <Button onClick={() => markAllAsRead.mutate()}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Marcar todas como leídas
            </Button>
          )}
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
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
        </div>
      </div>
    </div>
  );
}
