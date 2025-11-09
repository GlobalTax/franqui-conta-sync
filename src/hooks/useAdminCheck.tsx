import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export function useAdminCheck() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      logger.debug('useAdminCheck', '🔍 Iniciando verificación de admin...');
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      logger.debug('useAdminCheck', '👤 Usuario:', user?.id, userError ? `ERROR: ${userError.message}` : '✓');
      
      if (!user || userError) {
        logger.debug('useAdminCheck', '❌ No hay usuario autenticado');
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // Check admin role using server-side function
      const { data, error } = await supabase
        .rpc('has_role', { 
          _user_id: user.id, 
          _role: 'admin' 
        });

      logger.debug('useAdminCheck', '🔐 Resultado has_role:', { data, error: error?.message });
      
      const isAdminUser = data === true && !error;
      logger.debug('useAdminCheck', '✅ ¿Es Admin?:', isAdminUser);
      
      setIsAdmin(isAdminUser);
      setLoading(false);
    };

    checkAdmin();
  }, []);

  return { isAdmin, loading };
}
