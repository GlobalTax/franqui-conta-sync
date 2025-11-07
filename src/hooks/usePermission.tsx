import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function usePermission(
  permission: string,
  centro?: string
) {
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkPermission() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setHasPermission(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc('has_permission', {
        _user_id: user.id,
        _permission: permission as any,
        _centro: centro || null
      });

      setHasPermission(data === true && !error);
      setLoading(false);
    }

    checkPermission();
  }, [permission, centro]);

  return { hasPermission, loading };
}
