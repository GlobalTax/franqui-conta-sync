// ============================================================================
// HOOK - BULK INVOICE ACTIONS
// Operaciones masivas sobre facturas usando casos de uso del dominio
// ============================================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UseCaseFactory } from '@/domain/UseCaseFactory';
import { useOrganization } from './useOrganization';

interface BulkAssignCentreParams {
  invoiceIds: string[];
  centroCode: string;
}

/**
 * Hook para operaciones masivas sobre facturas
 * Usa casos de uso del dominio para garantizar validación y transaccionalidad
 */
export function useBulkInvoiceActions() {
  const queryClient = useQueryClient();
  const { currentMembership } = useOrganization();

  const bulkAssignCentreMutation = useMutation({
    mutationFn: async ({ invoiceIds, centroCode }: BulkAssignCentreParams) => {
      // Obtener usuario autenticado
      const { data: { user } } = await import('@/integrations/supabase/client').then(m => m.supabase.auth.getUser());
      if (!user) throw new Error('Usuario no autenticado');

      // Validar que tenemos organización
      if (!currentMembership?.organization_id) {
        throw new Error('No hay organización seleccionada');
      }

      // Crear y ejecutar caso de uso
      const useCase = UseCaseFactory.bulkAssignCentreUseCase();
      const result = await useCase.execute({
        invoiceIds,
        centroCode,
        userId: user.id,
        organizationId: currentMembership.organization_id,
      });

      return result;
    },
    onSuccess: (result) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['invoices_received'] });
      queryClient.invalidateQueries({ queryKey: ['pending-tasks'] });

      // Mostrar resultado
      if (result.failed === 0) {
        toast.success(`✓ Centro asignado a ${result.success} factura${result.success > 1 ? 's' : ''}`);
      } else {
        toast.warning(
          `✓ ${result.success} facturas actualizadas. ${result.failed} fallaron.`,
          {
            description: result.errors.length > 0 ? result.errors[0].error : undefined,
          }
        );
      }
    },
    onError: (error: Error) => {
      console.error('Error en asignación masiva:', error);
      toast.error(`Error: ${error.message}`);
    },
  });

  return {
    bulkAssignCentre: bulkAssignCentreMutation.mutate,
    isLoading: bulkAssignCentreMutation.isPending,
  };
}
