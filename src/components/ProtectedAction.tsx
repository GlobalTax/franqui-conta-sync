import { usePermission } from '@/hooks/usePermission';

interface ProtectedActionProps {
  permission: string;
  centro?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProtectedAction({
  permission,
  centro,
  children,
  fallback = null
}: ProtectedActionProps) {
  const { hasPermission, loading } = usePermission(permission, centro);

  if (loading) return null;
  if (!hasPermission) return <>{fallback}</>;
  return <>{children}</>;
}
