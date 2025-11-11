import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Scan, Upload, Inbox, Sparkles, Plus } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

export function OCRFloatingButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  // Solo mostrar en rutas relacionadas con facturas y digitalización
  const showFAB = [
    '/invoices',
    '/digitalizacion',
    '/iva',
  ].some(route => location.pathname.startsWith(route));

  if (!showFAB) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            size="lg"
            className={cn(
              "h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300",
              "bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
              "border-2 border-primary-foreground/10",
              isOpen && "scale-110"
            )}
          >
            {isOpen ? (
              <Plus className="h-6 w-6 rotate-45 transition-transform" />
            ) : (
              <Sparkles className="h-6 w-6 animate-pulse" />
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          side="top"
          className="w-64 mb-2 shadow-xl border-primary/20"
          sideOffset={8}
        >
          <DropdownMenuLabel className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Digitalización OCR
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => {
              navigate('/invoices/new-received');
              setIsOpen(false);
            }}
            className="cursor-pointer py-3"
          >
            <Scan className="h-4 w-4 mr-2 text-primary" />
            <div className="flex flex-col">
              <span className="font-medium">Nueva Factura</span>
              <span className="text-xs text-muted-foreground">Procesar con OCR</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => {
              navigate('/invoices/bulk-upload');
              setIsOpen(false);
            }}
            className="cursor-pointer py-3"
          >
            <Upload className="h-4 w-4 mr-2 text-primary" />
            <div className="flex flex-col">
              <span className="font-medium">Carga Masiva</span>
              <span className="text-xs text-muted-foreground">Múltiples PDFs</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => {
              navigate('/digitalizacion/inbox');
              setIsOpen(false);
            }}
            className="cursor-pointer py-3"
          >
            <Inbox className="h-4 w-4 mr-2 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="font-medium">Bandeja OCR</span>
              <span className="text-xs text-muted-foreground">Ver todas</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
