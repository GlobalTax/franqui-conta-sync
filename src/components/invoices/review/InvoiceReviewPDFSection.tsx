import { InvoicePDFPreview } from "../InvoicePDFPreview";
import { FileCheck } from "lucide-react";

interface InvoiceReviewPDFSectionProps {
  documentPath: string | null;
}

export function InvoiceReviewPDFSection({ documentPath }: InvoiceReviewPDFSectionProps) {
  return (
    <section>
      <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
        <FileCheck className="h-5 w-5 text-primary" />
        Documento
      </h3>
      <InvoicePDFPreview documentPath={documentPath} />
    </section>
  );
}
