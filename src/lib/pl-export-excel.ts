import * as XLSX from "xlsx";
import type { PLReportLine } from "@/types/profit-loss";

interface ExportPLHistoricalParams {
  plDataByYear: PLReportLine[][];
  years: number[];
  restaurantName: string;
  templateName: string;
}

/**
 * Exporta P&L a Excel con formato histórico multi-año
 * Replica el formato del archivo PandL_Historico_GRUPO_EDUARDO_ROSAS_v5.xlsm
 */
export const exportPLHistorical = ({
  plDataByYear,
  years,
  restaurantName,
  templateName,
}: ExportPLHistoricalParams) => {
  // Crear hoja de cálculo con estructura:
  // Fila 1: Encabezado principal
  // Fila 2: Vacía
  // Fila 3: Encabezados de columnas (Concepto, Año 1 €, Año 1 %, Año 2 €, ...)
  // Filas 4+: Datos del P&L

  const headers = [
    `${templateName} - ${restaurantName}`,
    "",
    ...years.flatMap((y) => [`Ejercicio ${y}`, ""]),
    "",
  ];

  const subHeaders = ["Concepto", ...years.flatMap(() => ["€", "%"]), ""];

  // Verificar que todos los años tengan la misma estructura de rubros
  const baseRubrics = plDataByYear[0] || [];

  const dataRows = baseRubrics.map((rubric, idx) => {
    const row = [rubric.rubric_name];

    // Para cada año, buscar el rubro correspondiente
    years.forEach((_, yearIdx) => {
      const yearData = plDataByYear[yearIdx] || [];
      const matchingRubric = yearData[idx];

      if (matchingRubric && matchingRubric.rubric_code === rubric.rubric_code) {
        row.push(
          matchingRubric.amount.toString(),
          (matchingRubric.percentage || 0).toString()
        );
      } else {
        row.push("0", "0");
      }
    });

    return row;
  });

  // Construir array de arrays (AOA)
  const worksheetData = [headers, [], subHeaders, ...dataRows];

  // Crear worksheet
  const ws = XLSX.utils.aoa_to_sheet(worksheetData);

  // Aplicar estilos (opcional, XLSX básico no soporta estilos avanzados)
  // Para estilos completos, usar xlsx-style o similar

  // Establecer ancho de columnas
  const colWidths = [
    { wch: 40 }, // Concepto
    ...years.flatMap(() => [{ wch: 15 }, { wch: 10 }]), // € y %
  ];
  ws["!cols"] = colWidths;

  // Aplicar formato a celdas de totales (negrita)
  baseRubrics.forEach((rubric, idx) => {
    if (rubric.is_total) {
      const rowNum = idx + 4; // +4 porque empieza en fila 4 (headers + subheaders + 1-indexed)
      const cellRef = XLSX.utils.encode_cell({ r: rowNum - 1, c: 0 });
      if (ws[cellRef]) {
        ws[cellRef].s = { font: { bold: true } };
      }
    }
  });

  // Crear workbook y añadir worksheet
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, restaurantName.substring(0, 31)); // Max 31 chars para nombre de hoja

  // Generar archivo y descargar
  const fileName = `PL_${restaurantName.replace(/\s+/g, "_")}_${years.join("_")}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

/**
 * Exporta P&L consolidado multi-restaurante
 */
interface ExportPLConsolidatedParams {
  plData: PLReportLine[];
  restaurantNames: string[];
  templateName: string;
  period: string;
}

export const exportPLConsolidated = ({
  plData,
  restaurantNames,
  templateName,
  period,
}: ExportPLConsolidatedParams) => {
  const headers = [
    `${templateName} - CONSOLIDADO`,
    `Restaurantes: ${restaurantNames.join(", ")}`,
    `Periodo: ${period}`,
  ];

  const subHeaders = ["Concepto", "Importe (€)", "% sobre Ventas"];

  const dataRows = plData.map((line) => [
    line.rubric_name,
    line.amount,
    line.percentage || 0,
  ]);

  const worksheetData = [headers, [], subHeaders, ...dataRows];

  const ws = XLSX.utils.aoa_to_sheet(worksheetData);

  ws["!cols"] = [{ wch: 40 }, { wch: 20 }, { wch: 15 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Consolidado");

  const fileName = `PL_Consolidado_${period.replace(/\s+/g, "_")}.xlsx`;
  XLSX.writeFile(wb, fileName);
};
