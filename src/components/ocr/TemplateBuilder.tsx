// ============================================================================
// TEMPLATE BUILDER
// Editor visual para crear templates OCR configurables
// ============================================================================

import { useState, useRef, useEffect } from 'react';
import { Canvas as FabricCanvas, Rect, FabricObject } from 'fabric';
import { Document, Page, pdfjs } from 'react-pdf';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Save, Trash2, Plus, Eye, Download, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface FieldMapping {
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  regex?: string;
  type?: 'text' | 'number' | 'date' | 'currency';
  format?: string;
  required?: boolean;
}

interface TemplateBuilderProps {
  supplierId: string;
  supplierName: string;
  pdfUrl: string;
  existingTemplate?: {
    id: string;
    template_name: string;
    field_mappings: Record<string, FieldMapping>;
    confidence_threshold: number;
  };
  onSave?: () => void;
}

export function TemplateBuilder({
  supplierId,
  supplierName,
  pdfUrl,
  existingTemplate,
  onSave
}: TemplateBuilderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pdfScale, setPdfScale] = useState<number>(1);
  
  // Template state
  const [templateName, setTemplateName] = useState(existingTemplate?.template_name || `Template ${supplierName}`);
  const [fieldMappings, setFieldMappings] = useState<Record<string, FieldMapping>>(existingTemplate?.field_mappings || {});
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [confidenceThreshold, setConfidenceThreshold] = useState(existingTemplate?.confidence_threshold || 0.8);
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);

  // Initialize Fabric canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 800,
      height: 1100,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      selection: true,
    });

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, []);

  // Load existing field mappings
  useEffect(() => {
    if (!fabricCanvas || !existingTemplate) return;
    
    fabricCanvas.clear();
    
    Object.entries(existingTemplate.field_mappings).forEach(([fieldName, mapping]) => {
      if (mapping.page === currentPage) {
        const rect = new Rect({
          left: mapping.x * pdfScale,
          top: mapping.y * pdfScale,
          width: mapping.width * pdfScale,
          height: mapping.height * pdfScale,
          fill: 'rgba(59, 130, 246, 0.2)',
          stroke: 'rgb(59, 130, 246)',
          strokeWidth: 2,
          selectable: true,
        });
        
        rect.set('data', { fieldName });
        fabricCanvas.add(rect);
      }
    });
    
    fabricCanvas.renderAll();
  }, [fabricCanvas, existingTemplate, currentPage, pdfScale]);

  // Handle mouse down (start drawing)
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!fabricCanvas) return;
    
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    setDrawStart({ x, y });
  };

  // Handle mouse move (draw rectangle)
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawStart || !fabricCanvas) return;
    
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Remove temporary rectangle if exists
    const objects = fabricCanvas.getObjects();
    const tempRect = objects.find((obj: any) => obj.data?.isTemp);
    if (tempRect) {
      fabricCanvas.remove(tempRect);
    }
    
    // Draw new temporary rectangle
    const newRect = new Rect({
      left: Math.min(drawStart.x, x),
      top: Math.min(drawStart.y, y),
      width: Math.abs(x - drawStart.x),
      height: Math.abs(y - drawStart.y),
      fill: 'rgba(59, 130, 246, 0.2)',
      stroke: 'rgb(59, 130, 246)',
      strokeWidth: 2,
      selectable: false,
    });
    
    newRect.set('data', { isTemp: true });
    fabricCanvas.add(newRect);
    fabricCanvas.renderAll();
  };

  // Handle mouse up (finish drawing)
  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawStart || !fabricCanvas) return;
    
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const width = Math.abs(x - drawStart.x);
    const height = Math.abs(y - drawStart.y);
    
    // Only create field if rectangle is large enough
    if (width > 20 && height > 10) {
      const fieldName = `field_${Object.keys(fieldMappings).length + 1}`;
      
      // Add field mapping
      const newMapping: FieldMapping = {
        x: Math.round(Math.min(drawStart.x, x) / pdfScale),
        y: Math.round(Math.min(drawStart.y, y) / pdfScale),
        width: Math.round(width / pdfScale),
        height: Math.round(height / pdfScale),
        page: currentPage,
        type: 'text',
        required: false,
      };
      
      setFieldMappings(prev => ({ ...prev, [fieldName]: newMapping }));
      setSelectedField(fieldName);
      
      toast.success(`Campo "${fieldName}" añadido`);
    }
    
    // Remove temporary rectangle
    const objects = fabricCanvas.getObjects();
    const tempRect = objects.find((obj: any) => obj.data?.isTemp);
    if (tempRect) {
      fabricCanvas.remove(tempRect);
    }
    
    setIsDrawing(false);
    setDrawStart(null);
    fabricCanvas.renderAll();
  };

  // Update field mapping
  const updateField = (fieldName: string, updates: Partial<FieldMapping>) => {
    setFieldMappings(prev => ({
      ...prev,
      [fieldName]: { ...prev[fieldName], ...updates }
    }));
  };

  // Delete field
  const deleteField = (fieldName: string) => {
    const newMappings = { ...fieldMappings };
    delete newMappings[fieldName];
    setFieldMappings(newMappings);
    
    if (selectedField === fieldName) {
      setSelectedField(null);
    }
    
    // Remove from canvas
    if (fabricCanvas) {
      const objects = fabricCanvas.getObjects();
      const rectToRemove = objects.find((obj: any) => obj.data?.fieldName === fieldName);
      if (rectToRemove) {
        fabricCanvas.remove(rectToRemove);
        fabricCanvas.renderAll();
      }
    }
    
    toast.success('Campo eliminado');
  };

  // Save template
  const handleSave = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('save-supplier-template', {
        body: {
          template_id: existingTemplate?.id,
          supplier_id: supplierId,
          template_name: templateName,
          field_mappings: fieldMappings,
          confidence_threshold: confidenceThreshold,
          is_active: true,
        }
      });

      if (error) throw error;

      toast.success(existingTemplate ? 'Template actualizado' : 'Template creado');
      onSave?.();
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error('Error al guardar template: ' + error.message);
    }
  };

  const selectedFieldData = selectedField ? fieldMappings[selectedField] : null;

  return (
    <div className="grid grid-cols-[1fr_400px] gap-6 h-[calc(100vh-200px)]">
      {/* PDF Canvas Area */}
      <Card className="p-6 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold">Visor de PDF</h3>
            <p className="text-sm text-muted-foreground">
              Dibuja rectángulos sobre los campos que quieres extraer
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
              Anterior
            </Button>
            <span className="text-sm">
              Página {currentPage} / {numPages}
            </span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))} disabled={currentPage === numPages}>
              Siguiente
            </Button>
          </div>
        </div>
        
        <Separator className="mb-4" />
        
        <ScrollArea className="flex-1">
          <div className="relative">
            {/* PDF Background */}
            <Document
              file={pdfUrl}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              className="absolute top-0 left-0 opacity-80"
            >
              <Page
                pageNumber={currentPage}
                width={800}
                onLoadSuccess={(page) => {
                  const viewport = page.getViewport({ scale: 1 });
                  setPdfScale(800 / viewport.width);
                }}
              />
            </Document>
            
            {/* Canvas Overlay */}
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="relative cursor-crosshair"
            />
          </div>
        </ScrollArea>
      </Card>

      {/* Configuration Panel */}
      <Card className="p-6 flex flex-col">
        <h3 className="font-semibold mb-4">Configuración de Template</h3>
        
        <div className="space-y-4 mb-6">
          <div>
            <Label>Nombre del Template</Label>
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Ej: Facturas McDonald's estándar"
            />
          </div>
          
          <div>
            <Label>Umbral de Confianza (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={confidenceThreshold * 100}
              onChange={(e) => setConfidenceThreshold(Number(e.target.value) / 100)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Confianza mínima para usar este template automáticamente
            </p>
          </div>
        </div>
        
        <Separator className="my-4" />
        
        <Tabs defaultValue="fields" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="fields">Campos ({Object.keys(fieldMappings).length})</TabsTrigger>
            <TabsTrigger value="config">Configuración</TabsTrigger>
          </TabsList>
          
          <TabsContent value="fields" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {Object.entries(fieldMappings).map(([fieldName, mapping]) => (
                  <Card
                    key={fieldName}
                    className={`p-3 cursor-pointer transition-colors ${
                      selectedField === fieldName ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => setSelectedField(fieldName)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{fieldName}</span>
                          <Badge variant="outline" className="text-xs">
                            Página {mapping.page}
                          </Badge>
                          {mapping.required && (
                            <Badge variant="destructive" className="text-xs">Obligatorio</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Tipo: {mapping.type || 'text'} · Posición: ({mapping.x}, {mapping.y})
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteField(fieldName);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
                
                {Object.keys(fieldMappings).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No hay campos definidos</p>
                    <p className="text-xs mt-1">Dibuja rectángulos en el PDF para añadir campos</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="config" className="flex-1">
            {selectedFieldData && selectedField ? (
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  <div>
                    <Label>Nombre del Campo</Label>
                    <Input
                      value={selectedField}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  
                  <div>
                    <Label>Tipo de Dato</Label>
                    <Select
                      value={selectedFieldData.type || 'text'}
                      onValueChange={(value: any) => updateField(selectedField, { type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Texto</SelectItem>
                        <SelectItem value="number">Número</SelectItem>
                        <SelectItem value="date">Fecha</SelectItem>
                        <SelectItem value="currency">Moneda</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Regex de Validación (opcional)</Label>
                    <Input
                      value={selectedFieldData.regex || ''}
                      onChange={(e) => updateField(selectedField, { regex: e.target.value })}
                      placeholder="Ej: ^\d{3,10}$"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Patrón para validar el valor extraído
                    </p>
                  </div>
                  
                  <div>
                    <Label>Formato (opcional)</Label>
                    <Input
                      value={selectedFieldData.format || ''}
                      onChange={(e) => updateField(selectedField, { format: e.target.value })}
                      placeholder="Ej: DD/MM/YYYY"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="required"
                      checked={selectedFieldData.required || false}
                      onChange={(e) => updateField(selectedField, { required: e.target.checked })}
                    />
                    <Label htmlFor="required" className="cursor-pointer">
                      Campo obligatorio
                    </Label>
                  </div>
                  
                  <Separator />
                  
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Coordenadas:</p>
                    <p>X: {selectedFieldData.x}px, Y: {selectedFieldData.y}px</p>
                    <p>Ancho: {selectedFieldData.width}px, Alto: {selectedFieldData.height}px</p>
                    <p>Página: {selectedFieldData.page}</p>
                  </div>
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Selecciona un campo para configurar</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        <Separator className="my-4" />
        
        <div className="flex gap-2">
          <Button onClick={handleSave} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            {existingTemplate ? 'Actualizar' : 'Guardar'} Template
          </Button>
        </div>
      </Card>
    </div>
  );
}
