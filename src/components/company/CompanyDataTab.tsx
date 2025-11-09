import { CompanyIdentificationSection } from "./CompanyIdentificationSection";
import { FiscalAddressSection } from "./FiscalAddressSection";
import { SocialAddressSection } from "./SocialAddressSection";
import { ContactSection } from "./ContactSection";
import { Separator } from "@/components/ui/separator";
import { CompanyWithAddresses } from "@/hooks/useCompanyConfiguration";
import { FormProvider } from "react-hook-form";
import { useCompanyForm } from "@/hooks/useCompanyForm";
import { useEffect } from "react";

interface Props {
  company: CompanyWithAddresses;
  onSave: (data: any) => void;
  isLoading: boolean;
}

export function CompanyDataTab({ company, onSave, isLoading }: Props) {
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
