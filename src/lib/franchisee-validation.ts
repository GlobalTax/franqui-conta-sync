import { z } from "zod";

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// CIF validation regex (Spanish company tax ID: Letter + 8 digits or European format)
const cifRegex = /^[A-Z]\d{8}$|^[A-Z]{2}[A-Z0-9]{1,13}$/;

export const franchiseeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "El nombre es obligatorio" })
    .max(100, { message: "El nombre no puede superar 100 caracteres" })
    .refine((val) => val !== "#N/D", { 
      message: "El nombre no puede ser '#N/D'" 
    }),
  
  email: z
    .string()
    .trim()
    .min(1, { message: "El email es obligatorio" })
    .max(255, { message: "El email no puede superar 255 caracteres" })
    .refine((val) => emailRegex.test(val), { 
      message: "Formato de email inválido" 
    })
    .transform((val) => val.toLowerCase()),
  
  company_tax_id: z
    .string()
    .trim()
    .max(20, { message: "El CIF no puede superar 20 caracteres" })
    .refine(
      (val) => !val || val === "" || !emailRegex.test(val), 
      { message: "El CIF no puede ser un email" }
    )
    .refine(
      (val) => !val || val === "" || cifRegex.test(val), 
      { message: "Formato de CIF inválido (ejemplo: B12345678)" }
    )
    .transform((val) => val.toUpperCase())
    .optional()
    .nullable(),
  
  orquest_business_id: z
    .string()
    .trim()
    .max(50, { message: "El Business ID no puede superar 50 caracteres" })
    .optional()
    .nullable(),
  
  orquest_api_key: z
    .string()
    .trim()
    .max(500, { message: "La API Key no puede superar 500 caracteres" })
    .optional()
    .nullable(),
});

export type FranchiseeFormData = z.infer<typeof franchiseeSchema>;

// Validate CIF format client-side with detailed error
export const validateCIF = (cif: string): { isValid: boolean; error?: string } => {
  if (!cif || cif.trim() === "") {
    return { isValid: true };
  }
  
  const trimmedCIF = cif.trim().toUpperCase();
  
  // Check if it looks like an email
  if (emailRegex.test(trimmedCIF)) {
    return { isValid: false, error: "El CIF no puede ser un email" };
  }
  
  // Check if it's too long to be a valid CIF
  if (trimmedCIF.length > 20) {
    return { isValid: false, error: "El CIF es demasiado largo (max 20 caracteres)" };
  }
  
  // Check CIF format
  if (!cifRegex.test(trimmedCIF)) {
    return { 
      isValid: false, 
      error: "Formato de CIF inválido (ejemplo: B12345678 o ES12345678)" 
    };
  }
  
  return { isValid: true };
};

// Validate email format client-side
export const validateEmail = (email: string): boolean => {
  if (!email || email.trim() === "") return false;
  return emailRegex.test(email.trim().toLowerCase());
};

// Check if value looks like an email (for CIF field validation)
export const isEmail = (value: string): boolean => {
  return emailRegex.test(value);
};
