import { PageHeader } from '@/components/layout/PageHeader';
import { BulkInvoiceUploader } from '@/components/invoices/bulk/BulkInvoiceUploader';
import { useOrganization } from '@/hooks/useOrganization';
import { Navigate } from 'react-router-dom';


export default function BulkInvoiceUpload() {
  const { currentMembership } = useOrganization();
  
  if (!currentMembership?.restaurant?.codigo) {
    return <Navigate to="/invoices/received" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        breadcrumbs={[
          { label: 'Facturas', href: '/invoices/received' },
          { label: 'Carga masiva', href: '/invoices/bulk-upload' },
        ]}
        title="Carga masiva de facturas"
        subtitle="Suba y procese múltiples facturas PDF simultáneamente con OCR automático"
      />

      <div className="container max-w-7xl py-8">
        <BulkInvoiceUploader centroCode={currentMembership.restaurant.codigo} />
      </div>
    </div>
  );
}
