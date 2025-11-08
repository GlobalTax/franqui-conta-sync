import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OCRRequest {
  documentPath: string;
  centroCode: string;
}

export interface OCRInvoiceData {
  supplier: {
    name: string;
    taxId: string;
    matched: boolean;
    matchedId?: string;
    matchConfidence?: number;
  };
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  subtotal: number;
  taxTotal: number;
  total: number;
  lines: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    total: number;
  }>;
}

export interface OCRResponse {
  success: boolean;
  confidence: number;
  data: OCRInvoiceData;
  rawText?: string;
  processingTimeMs: number;
  warnings?: string[];
  error?: string;
}

export interface OCRValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const useProcessInvoiceOCR = () => {
  return useMutation({
    mutationFn: async ({ documentPath, centroCode }: OCRRequest): Promise<OCRResponse> => {
      const { data, error } = await supabase.functions.invoke('invoice-ocr', {
        body: { documentPath, centroCode }
      });

      if (error) {
        throw new Error(error.message || 'Error al procesar OCR');
      }

      if (!data.success) {
        throw new Error(data.error || 'Error desconocido en OCR');
      }

      return data as OCRResponse;
    },
    onError: (error: any) => {
      console.error('OCR processing error:', error);
      toast.error(`Error al procesar el documento: ${error.message}`);
    }
  });
};

export const useLogOCRProcessing = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (logData: {
      invoiceId?: string;
      documentPath: string;
      ocrProvider: string;
      rawResponse: any;
      extractedData: any;
      confidence: number;
      processingTimeMs: number;
      userCorrections?: any;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('ocr_processing_log')
        .insert({
          invoice_id: logData.invoiceId || null,
          document_path: logData.documentPath,
          ocr_provider: logData.ocrProvider,
          raw_response: logData.rawResponse,
          extracted_data: logData.extractedData,
          confidence: logData.confidence,
          processing_time_ms: logData.processingTimeMs,
          user_corrections: logData.userCorrections,
          created_by: user?.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ocr-logs'] });
    }
  });
};

export const validateOCRData = (data: OCRInvoiceData): OCRValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields validation
  if (!data.supplier.taxId) {
    errors.push('El NIF/CIF del proveedor es obligatorio');
  } else if (!data.supplier.taxId.match(/^[A-Z]\d{7,8}[A-Z]?$/)) {
    errors.push('El formato del NIF/CIF no es válido');
  }

  if (!data.supplier.name || data.supplier.name.length < 3) {
    errors.push('El nombre del proveedor es obligatorio');
  }

  if (!data.invoiceNumber || data.invoiceNumber.trim() === '') {
    errors.push('El número de factura es obligatorio');
  }

  if (!data.invoiceDate) {
    errors.push('La fecha de factura es obligatoria');
  } else {
    const invoiceDate = new Date(data.invoiceDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    if (invoiceDate > today) {
      errors.push('La fecha de factura no puede ser futura');
    }

    if (data.dueDate) {
      const dueDate = new Date(data.dueDate);
      if (dueDate < invoiceDate) {
        errors.push('La fecha de vencimiento debe ser posterior a la fecha de factura');
      }
    }
  }

  if (!data.total || data.total <= 0) {
    errors.push('El importe total debe ser mayor que 0');
  }

  // Amount validation
  const calculatedTotal = Math.round((data.subtotal + data.taxTotal) * 100) / 100;
  const totalDiff = Math.abs(calculatedTotal - data.total);
  
  if (totalDiff > 0.02) {
    warnings.push(`Diferencia en totales: calculado ${calculatedTotal}€, indicado ${data.total}€`);
  }

  // Lines validation
  if (data.lines.length > 0) {
    const linesSubtotal = data.lines.reduce((sum, line) => sum + line.total, 0);
    const subtotalDiff = Math.abs(Math.round(linesSubtotal * 100) / 100 - data.subtotal);
    
    if (subtotalDiff > 0.02 * data.lines.length) {
      warnings.push('La suma de las líneas no coincide con el subtotal');
    }

    data.lines.forEach((line, index) => {
      if (!line.description || line.description.trim() === '') {
        warnings.push(`Línea ${index + 1}: falta descripción`);
      }
      if (line.quantity <= 0) {
        errors.push(`Línea ${index + 1}: la cantidad debe ser mayor que 0`);
      }
      if (line.unitPrice <= 0) {
        errors.push(`Línea ${index + 1}: el precio unitario debe ser mayor que 0`);
      }
      
      const calculatedLineTotal = Math.round(line.quantity * line.unitPrice * 100) / 100;
      const lineDiff = Math.abs(calculatedLineTotal - line.total);
      if (lineDiff > 0.02) {
        warnings.push(`Línea ${index + 1}: el total calculado (${calculatedLineTotal}€) no coincide con el indicado (${line.total}€)`);
      }
    });
  } else {
    warnings.push('No se detectaron líneas de factura detalladas');
  }

  // Supplier matching warnings
  if (!data.supplier.matched) {
    warnings.push('No se encontró un proveedor existente con este NIF/CIF');
  } else if (data.supplier.matchConfidence && data.supplier.matchConfidence < 0.9) {
    warnings.push(`El proveedor coincide con ${Math.round(data.supplier.matchConfidence * 100)}% de confianza`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

export const getConfidenceLevel = (confidence: number): {
  level: 'high' | 'medium' | 'low' | 'very-low';
  color: string;
  label: string;
} => {
  if (confidence >= 0.9) {
    return {
      level: 'high',
      color: 'text-green-600 bg-green-50 border-green-200',
      label: 'Alta confianza'
    };
  } else if (confidence >= 0.7) {
    return {
      level: 'medium',
      color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      label: 'Confianza media'
    };
  } else if (confidence >= 0.5) {
    return {
      level: 'low',
      color: 'text-orange-600 bg-orange-50 border-orange-200',
      label: 'Baja confianza'
    };
  } else {
    return {
      level: 'very-low',
      color: 'text-red-600 bg-red-50 border-red-200',
      label: 'Muy baja confianza'
    };
  }
};

export const getFieldConfidenceColor = (hasValue: boolean, confidence: number): string => {
  if (!hasValue) {
    return 'border-red-500 bg-red-50';
  }
  
  if (confidence >= 0.8) {
    return 'border-green-500 bg-green-50';
  } else if (confidence >= 0.5) {
    return 'border-yellow-500 bg-yellow-50';
  } else {
    return 'border-orange-500 bg-orange-50';
  }
};
