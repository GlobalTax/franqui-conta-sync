import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useAdminCheck() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      console.log('[useAdminCheck] 🔍 Iniciando verificación de admin...');
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      console.log('[useAdminCheck] 👤 Usuario:', user?.id, userError ? `ERROR: ${userError.message}` : '✓');
      
      if (!user || userError) {
        console.log('[useAdminCheck] ❌ No hay usuario autenticado');
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

      console.log('[useAdminCheck] 🔐 Resultado has_role:', { data, error: error?.message });
      
      const isAdminUser = data === true && !error;
      console.log('[useAdminCheck] ✅ ¿Es Admin?:', isAdminUser);
      
      setIsAdmin(isAdminUser);
      setLoading(false);
    };

    checkAdmin();
  }, []);

  return { isAdmin, loading };
}
