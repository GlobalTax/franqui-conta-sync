import { CompanyIdentificationSection } from "./CompanyIdentificationSection";
import { FiscalAddressSection } from "./FiscalAddressSection";
import { SocialAddressSection } from "./SocialAddressSection";
import { ContactSection } from "./ContactSection";
import { Separator } from "@/components/ui/separator";
import { CompanyWithAddresses } from "@/hooks/useCompanyConfiguration";
import { FormProvider } from "react-hook-form";
import { useCompanyForm } from "@/hooks/useCompanyForm";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  company: CompanyWithAddresses;
  onSave: (data: any) => void;
  isLoading: boolean;
}

export function CompanyDataTab({ company, onSave, isLoading }: Props) {
  const { toast } = useToast();
  const form = useCompanyForm({
    code: company.code || undefined,
    razon_social: company.razon_social,
    nif_prefix: company.nif_prefix || undefined,
    nif_number: company.nif_number || undefined,
    legal_type: company.legal_type || "Persona Jurídica",
    country_fiscal_code: company.country_fiscal_code || "ES",
    phone1: company.phone1 || undefined,
    phone2: company.phone2 || undefined,
    phone3: company.phone3 || undefined,
    phone4: company.phone4 || undefined,
    contact_name: company.contact_name || undefined,
    email: company.email || undefined,
    fiscal_address: company.fiscal_address ? {
      street_type: company.fiscal_address.street_type || undefined,
      street_name: company.fiscal_address.street_name || "",
      number: company.fiscal_address.number || undefined,
      staircase: company.fiscal_address.staircase || undefined,
      floor: company.fiscal_address.floor || undefined,
      door: company.fiscal_address.door || undefined,
      postal_code: company.fiscal_address.postal_code || undefined,
      municipality_id: company.fiscal_address.municipality_id || undefined,
      province_id: company.fiscal_address.province_id || undefined,
      country_code: company.fiscal_address.country_code || "ES",
    } : undefined,
    social_address: company.social_address ? {
      street_type: company.social_address.street_type || undefined,
      street_name: company.social_address.street_name || "",
      number: company.social_address.number || undefined,
      staircase: company.social_address.staircase || undefined,
      floor: company.social_address.floor || undefined,
      door: company.social_address.door || undefined,
      postal_code: company.social_address.postal_code || undefined,
      municipality_id: company.social_address.municipality_id || undefined,
      province_id: company.social_address.province_id || undefined,
      country_code: company.social_address.country_code || "ES",
    } : undefined,
  });

  useEffect(() => {
    const handleSubmit = form.handleSubmit((data) => {
      onSave({
        companyData: data,
        fiscalAddress: data.fiscal_address,
        socialAddress: data.social_address,
      });
    });

    (window as any).__companyFormSubmit = handleSubmit;

    return () => {
      delete (window as any).__companyFormSubmit;
    };
  }, [form, onSave]);

  // Confirmación al salir sin guardar
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (form.formState.isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [form.formState.isDirty]);

  return (
    <FormProvider {...form}>
      <form className="space-y-6">
        <CompanyIdentificationSection />
        
        <Separator className="my-8" />
        
        <FiscalAddressSection address={company.fiscal_address} />
        
        <Separator className="my-8" />
        
        <SocialAddressSection address={company.social_address} />
        
        <Separator className="my-8" />
        
        <ContactSection />
      </form>
    </FormProvider>
  );
}
