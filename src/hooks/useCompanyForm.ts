import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const addressSchema = z.object({
  street_type: z.string().optional(),
  street_name: z.string().min(1, "La vía pública es obligatoria"),
  number: z.string().optional(),
  staircase: z.string().optional(),
  floor: z.string().optional(),
  door: z.string().optional(),
  postal_code: z.string().regex(/^\d{5}$/, "El código postal debe tener 5 dígitos").optional(),
  municipality_id: z.number().optional(),
  province_id: z.number().optional(),
  country_code: z.string().length(2, "Código de país inválido"),
});

const companySchema = z.object({
  code: z.string().optional(),
  razon_social: z.string().min(1, "La razón social es obligatoria"),
  nif_prefix: z.string().regex(/^[A-Z]$/, "Prefijo debe ser una letra").optional(),
  nif_number: z.string().regex(/^\d{8}$/, "NIF debe tener 8 dígitos").optional(),
  legal_type: z.string().default("Persona Jurídica"),
  country_fiscal_code: z.string().length(2).default("ES"),
  phone1: z.string().optional(),
  phone2: z.string().optional(),
  phone3: z.string().optional(),
  phone4: z.string().optional(),
  contact_name: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  fiscal_address: addressSchema.optional(),
  social_address: addressSchema.optional(),
});

export type CompanyFormData = z.infer<typeof companySchema>;

export function useCompanyForm(defaultValues?: Partial<CompanyFormData>) {
  return useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      legal_type: "Persona Jurídica",
      country_fiscal_code: "ES",
      ...defaultValues,
    },
  });
}
