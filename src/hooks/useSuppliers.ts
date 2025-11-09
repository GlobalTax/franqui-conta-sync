import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  getSuppliers
} from '@/infrastructure/persistence/supabase/queries/SupplierQueries';
import type { SupplierFilters } from '@/domain/suppliers/types';

export interface Supplier {
  id: string;
  tax_id: string;
  name: string;
  commercial_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string;
  payment_terms: number;
  default_account_code: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupplierFormData {
  tax_id: string;
  name: string;
  commercial_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  payment_terms?: number;
  default_account_code?: string;
  notes?: string;
}

export const useSuppliers = (filters?: { search?: string; active?: boolean }) => {
  return useQuery({
    queryKey: ['suppliers', filters],
    queryFn: async () => {
      const queryFilters: SupplierFilters = {
        search: filters?.search,
        active: filters?.active,
      };

      const domainSuppliers = await getSuppliers(queryFilters);

      // Convertir de camelCase (dominio) a snake_case (API legacy)
      return domainSuppliers.map(sup => ({
        id: sup.id,
        tax_id: sup.taxId,
        name: sup.name,
        commercial_name: sup.commercialName,
        email: sup.email,
        phone: sup.phone,
        address: sup.address,
        city: sup.city,
        postal_code: sup.postalCode,
        country: sup.country,
        payment_terms: sup.paymentTerms,
        default_account_code: sup.defaultAccountCode,
        notes: sup.notes,
        active: sup.active,
        created_at: sup.createdAt,
        updated_at: sup.updatedAt,
      })) as Supplier[];
    },
  });
};

export const useCreateSupplier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (supplierData: SupplierFormData) => {
      const { data, error } = await supabase
        .from('suppliers')
        .insert([supplierData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Proveedor creado correctamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear proveedor: ${error.message}`);
    },
  });
};

export const useUpdateSupplier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SupplierFormData> }) => {
      const { data: updated, error } = await supabase
        .from('suppliers')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Proveedor actualizado correctamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar proveedor: ${error.message}`);
    },
  });
};

export const useDeleteSupplier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('suppliers')
        .update({ active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Proveedor desactivado correctamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al desactivar proveedor: ${error.message}`);
    },
  });
};
