import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { validateNIFOrCIF, getNIFCIFErrorMessage } from "@/lib/nif-validator";

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
  nif_prefix: z.string().optional(),
  nif_number: z.string().optional(),
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
}).refine((data) => {
  // Validar NIF/CIF solo si ambos campos están presentes
  if (data.nif_prefix && data.nif_number) {
    const fullNIF = data.nif_prefix + data.nif_number;
    return validateNIFOrCIF(fullNIF);
  }
  return true; // Si no hay datos, es válido (campos opcionales)
}, {
  message: "NIF/CIF inválido según el algoritmo oficial español",
  path: ["nif_number"], // Mostrar error en el campo número
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
