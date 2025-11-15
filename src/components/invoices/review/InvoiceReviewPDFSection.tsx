import { lazy, Suspense } from "react";
import { FileCheck, Loader2 } from "lucide-react";

// Lazy load del visor PDF
const InvoicePDFPreview = lazy(() => import("../InvoicePDFPreview").then(m => ({ default: m.InvoicePDFPreview })));

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
      <Suspense fallback={
        <div className="h-96 flex items-center justify-center bg-muted rounded-lg">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
        <InvoicePDFPreview documentPath={documentPath} />
      </Suspense>
    </section>
  );
}
