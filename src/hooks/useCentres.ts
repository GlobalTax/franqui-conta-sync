import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Centre {
  id: string;
  codigo: string;
  nombre: string;
  franchisee_id: string;
  company_id?: string;
  activo: boolean;
  direccion?: string;
  ciudad?: string;
  postal_code?: string;
  pais?: string;
  state?: string;
  opening_date?: string;
  square_meters?: number;
  seating_capacity?: number;
  site_number?: string;
  franchisee_name?: string;
  franchisee_email?: string;
  orquest_service_id?: string;
  orquest_business_id?: string;
  company_tax_id?: string;
  created_at?: string;
  updated_at?: string;
  franchisees?: {
    name: string;
    email: string;
  };
  orquest_service?: {
    id?: string;
    nombre?: string;
    service_name?: string;
    business_id?: string;
    zona_horaria?: string;
  };
  centre_companies?: Array<{
    id: string;
    razon_social: string;
    cif: string;
    tipo_sociedad: string;
    es_principal: boolean;
  }>;
}

// Fetch all centres for a franchisee
export const useCentres = (franchiseeId?: string) => {
  return useQuery({
    queryKey: ["centres", franchiseeId],
    queryFn: async () => {
      let query = supabase
        .from("centres")
        .select("id, codigo, nombre, franchisee_id, company_id, activo")
        .eq("activo", true)
        .order("codigo");

      if (franchiseeId) {
        query = query.eq("franchisee_id", franchiseeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []) as Centre[];
    },
  });
};

// Fetch a single centre by ID
export const useCentre = (id: string) => {
  return useQuery({
    queryKey: ["centre", id],
    queryFn: async () => {
      // Intentar primero con embeds simples (sin !fkey)
      let { data, error } = await supabase
        .from("centres")
        .select(`
          *,
          franchisees (name, email),
          orquest_services (id, nombre, service_name, business_id, zona_horaria),
          centre_companies (id, razon_social, cif, tipo_sociedad, es_principal)
        `)
        .eq("id", id)
        .single();

      // Fallback: si los embeds fallan, obtener solo el centro
      if (error && (error as any).code === '400') {
        const fallbackResult = await supabase
          .from("centres")
          .select("*")
          .eq("id", id)
          .single();
        data = fallbackResult.data as any;
        error = fallbackResult.error;
      }

      if (error) throw error;
      
      // Rename orquest_services to orquest_service for compatibility
      const result: any = { ...data };
      if (result.orquest_services) {
        result.orquest_service = result.orquest_services;
        delete result.orquest_services;
      }
      
      return result;
    },
    enabled: !!id,
  });
};

// Create a new centre
export const useCreateCentre = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (centre: any) => {
      const { data, error } = await supabase
        .from("centres")
        .insert([centre])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["centres"] });
      toast({
        title: "Centro creado",
        description: "El centro se ha creado correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al crear centro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Update an existing centre
export const useUpdateCentre = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Centre> & { id: string }) => {
      const { data, error } = await supabase
        .from("centres")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["centres"] });
      queryClient.invalidateQueries({ queryKey: ["centre", variables.id] });
      toast({
        title: "Centro actualizado",
        description: "Los cambios se han guardado correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar centro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
