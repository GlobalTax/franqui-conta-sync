import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EntryTemplateWithLines, TemplateFormData } from "@/types/entry-templates";
import { useView } from "@/contexts/ViewContext";

export const useEntryTemplates = () => {
  const { selectedView } = useView();

  return useQuery({
    queryKey: ["entry-templates", selectedView?.id],
    queryFn: async () => {
      let query = supabase
        .from("entry_templates")
        .select(`
          *,
          entry_template_lines(*)
        `)
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (selectedView?.type === 'centre') {
        query = query.or(`centro_code.is.null,centro_code.eq.${selectedView.id}`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Sort lines by line_number
      return (data as EntryTemplateWithLines[]).map(template => ({
        ...template,
        entry_template_lines: template.entry_template_lines.sort((a, b) => a.line_number - b.line_number)
      }));
    },
    enabled: !!selectedView,
  });
};

export const useCreateEntryTemplate = () => {
  const queryClient = useQueryClient();
  const { selectedView } = useView();

  return useMutation({
    mutationFn: async (formData: TemplateFormData) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuario no autenticado");

      if (!selectedView?.id || selectedView.type !== 'centre') throw new Error("No hay centro seleccionado");

      // Create template
      const { data: template, error: templateError } = await supabase
        .from("entry_templates")
        .insert({
          name: formData.name,
          description: formData.description,
          category: formData.category,
          centro_code: selectedView.id,
          created_by: userData.user.id,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Create lines
      const lines = formData.lines.map((line, index) => ({
        template_id: template.id,
        line_number: index + 1,
        account_code: line.account_code,
        movement_type: line.movement_type,
        amount_formula: line.amount_formula,
        description: line.description,
      }));

      const { error: linesError } = await supabase
        .from("entry_template_lines")
        .insert(lines);

      if (linesError) throw linesError;

      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entry-templates"] });
      toast.success("Plantilla creada correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear la plantilla");
    },
  });
};

export const useDeleteEntryTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from("entry_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entry-templates"] });
      toast.success("Plantilla eliminada correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar la plantilla");
    },
  });
};
