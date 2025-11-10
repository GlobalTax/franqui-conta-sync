import { useEffect, useState, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, AlertCircle, ZoomIn, ZoomOut, Maximize2, RotateCw, ChevronLeft, ChevronRight, HelpCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configurar worker de PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface InvoicePDFPreviewProps {
  documentPath: string | null;
  className?: string;
}

export function InvoicePDFPreview({
  documentPath,
  className,
}: InvoicePDFPreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Datos de atajos de teclado
  const keyboardShortcuts = {
    zoom: [
      { keys: ["Ctrl/Cmd", "+"], description: "Acercar (+25%)" },
      { keys: ["Ctrl/Cmd", "-"], description: "Alejar (-25%)" },
      { keys: ["Ctrl/Cmd", "0"], description: "Restablecer zoom (100%)" },
      { keys: ["Click"], description: "Ajustar al ancho del contenedor" },
    ],
    navigation: [
      { keys: ["←", "PgUp"], description: "Página anterior" },
      { keys: ["→", "PgDn"], description: "Página siguiente" },
      { keys: ["Home"], description: "Ir a la primera página" },
      { keys: ["End"], description: "Ir a la última página" },
    ],
  };

  useEffect(() => {
    if (!documentPath) return;

    const loadPDF = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase.storage
          .from("invoice-documents")
          .createSignedUrl(documentPath, 3600);

        if (error) throw error;
        setPdfUrl(data.signedUrl);
      } catch (err: any) {
        console.error("Error loading PDF:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadPDF();
  }, [documentPath]);

  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }

    const handleResize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Atajos de teclado para zoom y navegación
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // No interferir si el usuario está escribiendo en un input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // ===== ATAJOS DE ZOOM (requieren Ctrl/Cmd) =====
      if (e.ctrlKey || e.metaKey) {
        // Zoom In: Ctrl/Cmd + Plus o Ctrl/Cmd + Equal
        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          if (scale < 3.0) {
            handleZoomIn();
          }
        }
        // Zoom Out: Ctrl/Cmd + Minus
        else if (e.key === '-') {
          e.preventDefault();
          if (scale > 0.5) {
            handleZoomOut();
          }
        }
        // Reset: Ctrl/Cmd + 0
        else if (e.key === '0') {
          e.preventDefault();
          handleReset();
        }
      }
      
      // ===== ATAJOS DE NAVEGACIÓN (sin Ctrl/Cmd) =====
      // Solo si NO se está presionando Ctrl/Cmd y hay múltiples páginas
      else if (numPages > 1) {
        // Página Anterior: Arrow Left
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          if (pageNumber > 1) {
            goToPrevPage();
          }
        }
        // Página Siguiente: Arrow Right
        else if (e.key === 'ArrowRight') {
          e.preventDefault();
          if (pageNumber < numPages) {
            goToNextPage();
          }
        }
        // Primera Página: Home
        else if (e.key === 'Home') {
          e.preventDefault();
          setPageNumber(1);
        }
        // Última Página: End
        else if (e.key === 'End') {
          e.preventDefault();
          setPageNumber(numPages);
        }
        // Página Anterior: PageUp (alias de Arrow Left)
        else if (e.key === 'PageUp') {
          e.preventDefault();
          if (pageNumber > 1) {
            goToPrevPage();
          }
        }
        // Página Siguiente: PageDown (alias de Arrow Right)
        else if (e.key === 'PageDown') {
          e.preventDefault();
          if (pageNumber < numPages) {
            goToNextPage();
          }
        }
      }

      // ===== AYUDA DE ATAJOS (siempre disponible) =====
      // Abrir modal de ayuda: Shift + ?
      if (e.key === '?' && e.shiftKey) {
        e.preventDefault();
        setShowShortcutsModal(true);
      }
    };

    // Solo agregar listener si el PDF está cargado
    if (pdfUrl) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [pdfUrl, scale, numPages, pageNumber]);

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3.0));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleFitToWidth = () => {
    if (containerWidth > 0) {
      const pdfWidth = 595;
      const newScale = (containerWidth - 40) / pdfWidth;
      setScale(newScale);
    }
  };

  const handleReset = () => {
    setScale(1.0);
  };

  const goToPrevPage = () => {
    setPageNumber(prev => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber(prev => Math.min(prev + 1, numPages));
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  if (!documentPath) {
    return (
      <Card className="h-[400px] flex items-center justify-center bg-muted/30 border-dashed">
        <div className="text-center space-y-3">
          <FileText className="h-16 w-16 mx-auto text-muted-foreground/50" />
          <div>
            <p className="font-medium text-foreground">Sin documento adjunto</p>
            <p className="text-sm text-muted-foreground mt-1">
              No hay PDF disponible para esta factura
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="h-[400px] flex items-center justify-center bg-muted/30">
        <div className="text-center space-y-3">
          <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando documento...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-[400px] flex items-center justify-center bg-destructive/10 border-destructive/20">
        <div className="text-center space-y-3 px-4">
          <AlertCircle className="h-16 w-16 mx-auto text-destructive" />
          <div>
            <p className="font-medium text-destructive">Error al cargar PDF</p>
            <p className="text-sm text-destructive/80 mt-1">{error}</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`border-border/40 shadow-sm overflow-hidden ${className}`}>
      {/* Toolbar de controles */}
      <div className="border-b border-border bg-muted/30 p-2 lg:p-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2">
          {/* Controles de zoom */}
          <div className="flex items-center gap-1 justify-center lg:justify-start">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
              title="Alejar (Ctrl/Cmd + -)"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              title="Restablecer (Ctrl/Cmd + 0)"
            >
              <RotateCw className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              disabled={scale >= 3.0}
              title="Acercar (Ctrl/Cmd + +)"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleFitToWidth}
              title="Ajustar al ancho"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>

            <span className="text-sm text-muted-foreground ml-2 min-w-[60px]">
              {Math.round(scale * 100)}%
            </span>

            {/* Botón de ayuda de atajos */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowShortcutsModal(true)}
              title="Ver atajos de teclado (Shift + ?)"
              className="ml-2"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          </div>

          {/* Navegación de páginas */}
          {numPages > 1 && (
            <div className="flex items-center gap-1 justify-center lg:justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPrevPage}
                disabled={pageNumber <= 1}
                title="Página anterior (←)"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <span className="text-sm text-muted-foreground px-2 whitespace-nowrap">
                Página {pageNumber} de {numPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={goToNextPage}
                disabled={pageNumber >= numPages}
                title="Página siguiente (→)"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Área de visualización del PDF */}
      <ScrollArea className="h-[400px] lg:h-[600px]">
        <div ref={containerRef} className="flex justify-center p-4 min-h-full">
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex items-center justify-center h-[400px]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            }
            error={
              <div className="flex items-center justify-center h-[400px] text-destructive">
                <AlertCircle className="mr-2 h-5 w-5" />
                Error al cargar el PDF
              </div>
            }
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="shadow-lg border border-border rounded-sm"
            />
          </Document>
        </div>
      </ScrollArea>

      {/* Modal de Ayuda de Atajos de Teclado */}
      <Dialog open={showShortcutsModal} onOpenChange={setShowShortcutsModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              Atajos de Teclado
            </DialogTitle>
            <DialogDescription>
              Navega y controla el visor PDF con estos atajos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Sección: Control de Zoom */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <ZoomIn className="h-4 w-4" />
                Control de Zoom
              </h3>
              <div className="space-y-2">
                {keyboardShortcuts.zoom.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {shortcut.keys.map((key, keyIndex) => (
                        <kbd
                          key={keyIndex}
                          className="px-2 py-1 bg-muted border border-border rounded font-mono text-xs"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {shortcut.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sección: Navegación de Páginas */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <ChevronRight className="h-4 w-4" />
                Navegación de Páginas
              </h3>
              <div className="space-y-2">
                {keyboardShortcuts.navigation.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {shortcut.keys.map((key, keyIndex) => (
                        <kbd
                          key={keyIndex}
                          className="px-2 py-1 bg-muted border border-border rounded font-mono text-xs"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {shortcut.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Nota sobre compatibilidad Mac */}
            <div className="border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">
                💡 <strong>Nota:</strong> En macOS, usa <kbd className="px-1 py-0.5 bg-muted border border-border rounded font-mono text-[10px]">Cmd</kbd> en lugar de <kbd className="px-1 py-0.5 bg-muted border border-border rounded font-mono text-[10px]">Ctrl</kbd>
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
