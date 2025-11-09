import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CompanyDetailData } from "@/hooks/useCompanyDetail";
import { FormProvider, useForm } from "react-hook-form";
import { FiscalAddressSection } from "@/components/company/FiscalAddressSection";
import { SocialAddressSection } from "@/components/company/SocialAddressSection";
import { ContactSection } from "@/components/company/ContactSection";
import { BankAccountsManager } from "@/components/company/fiscal/BankAccountsManager";
import { FiscalConfigForm } from "@/components/company/fiscal/FiscalConfigForm";
import { Button } from "@/components/ui/button";
import { useCompanyConfiguration } from "@/hooks/useCompanyConfiguration";
import { useEffect } from "react";

interface Props {
  company: CompanyDetailData;
}

const CompanyFiscalConfig = ({ company }: Props) => {
  const { company: companyWithAddresses, updateCompany, isUpdating } = useCompanyConfiguration(company.id);
  
  const methods = useForm({
    defaultValues: {
      phone1: company.phone1 || "",
      phone2: company.phone2 || "",
      phone3: company.phone3 || "",
      phone4: company.phone4 || "",
      contact_name: company.contact_name || "",
      email: company.email || "",
      fiscal_address: {
        street_type: "",
        street_name: "",
        number: "",
        staircase: "",
        floor: "",
        door: "",
        postal_code: "",
        municipality_id: null,
        province_id: null,
      },
      social_address: {
        street_type: "",
        street_name: "",
        number: "",
        staircase: "",
        floor: "",
        door: "",
        postal_code: "",
        municipality_id: null,
        province_id: null,
      },
    },
  });

  useEffect(() => {
    if (companyWithAddresses) {
      methods.reset({
        phone1: companyWithAddresses.phone1 || "",
        phone2: companyWithAddresses.phone2 || "",
        phone3: companyWithAddresses.phone3 || "",
        phone4: companyWithAddresses.phone4 || "",
        contact_name: companyWithAddresses.contact_name || "",
        email: companyWithAddresses.email || "",
        fiscal_address: companyWithAddresses.fiscal_address || {},
        social_address: companyWithAddresses.social_address || {},
      });
    }
  }, [companyWithAddresses, methods]);

  const onSubmit = (data: any) => {
    updateCompany({
      companyData: {
        phone1: data.phone1,
        phone2: data.phone2,
        phone3: data.phone3,
        phone4: data.phone4,
        contact_name: data.contact_name,
        email: data.email,
      },
      fiscalAddress: data.fiscal_address,
      socialAddress: data.social_address,
    });
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="addresses" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="addresses">Direcciones</TabsTrigger>
            <TabsTrigger value="contact">Contacto</TabsTrigger>
            <TabsTrigger value="banking">Cuentas Bancarias</TabsTrigger>
            <TabsTrigger value="fiscal">Config. Fiscal</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(100vh-400px)] mt-6">
            <TabsContent value="addresses" className="space-y-6 pr-4">
              <FiscalAddressSection address={companyWithAddresses?.fiscal_address} />
              <SocialAddressSection address={companyWithAddresses?.social_address} />
              <div className="flex justify-end">
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? "Guardando..." : "Guardar direcciones"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="contact" className="space-y-6 pr-4">
              <ContactSection />
              <div className="flex justify-end">
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? "Guardando..." : "Guardar contacto"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="banking" className="pr-4">
              <BankAccountsManager companyId={company.id} />
            </TabsContent>

            <TabsContent value="fiscal" className="pr-4">
              <FiscalConfigForm companyId={company.id} />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </form>
    </FormProvider>
  );
};

export default CompanyFiscalConfig;
