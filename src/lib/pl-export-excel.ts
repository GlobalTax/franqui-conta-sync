import * as XLSX from "xlsx";
import type { PLReportLine } from "@/types/profit-loss";

interface ExportPLHistoricalParams {
  plDataByYear: PLReportLine[][];
  years: number[];
  restaurantName: string;
  templateName: string;
}

/**
 * Aplica estilos según nivel de rúbrica
 */
const applyRubricStyles = (
  ws: XLSX.WorkSheet,
  rubric: PLReportLine,
  rowIndex: number,
  colCount: number,
  headerRows: number
) => {
  const actualRow = rowIndex + headerRows;

  // Determinar estilo según características
  let fontBold = false;
  let fontSize = 11;
  let fontColor = "000000";
  let bgColor = "";

  if (rubric.level === 0) {
    // Títulos principales (VENTAS, GASTOS)
    fontBold = true;
    fontSize = 14;
    fontColor = "FFFFFF";
    bgColor = "2563EB"; // Azul oscuro
  } else if (rubric.level === 1) {
    // Subtítulos
    fontBold = true;
    fontSize = 12;
    bgColor = "DBEAFE"; // Azul claro
  } else if (rubric.is_total) {
    // Totales
    fontBold = true;
    fontColor = "DC2626";
    bgColor = "FEE2E2"; // Rojo claro
  } else if (rubric.rubric_code?.includes("pac") || rubric.rubric_code?.includes("soi")) {
    // Fórmulas especiales (P.A.C., S.O.I.)
    fontBold = true;
    fontSize = 12;
    fontColor = "059669";
    bgColor = "D1FAE5"; // Verde claro
  }

  // Aplicar a todas las celdas de la fila
  for (let col = 0; col < colCount; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: actualRow, c: col });
    if (!ws[cellRef]) ws[cellRef] = { v: "", t: "s" };

    ws[cellRef].s = {
      font: { bold: fontBold, sz: fontSize, color: { rgb: fontColor } },
      fill: bgColor ? { fgColor: { rgb: bgColor } } : undefined,
      alignment: { indent: col === 0 ? rubric.level || 0 : undefined },
    };
  }
};

/**
 * Crea la sección de headers profesional
 */
const createHeaderSection = (
  restaurantName: string,
  templateName: string,
  years: number[]
) => {
  return [
    [`P&L HISTÓRICO - ${templateName.toUpperCase()}`],
    [`Restaurante: ${restaurantName}`],
    [`Periodo: Años ${years.join(", ")}`],
    [],
    ["Concepto", ...years.flatMap((y) => [`Ejercicio ${y}`, ""])],
    ["", ...years.flatMap(() => ["€", "%"])],
  ];
};

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
  // Crear headers profesionales
  const headerSection = createHeaderSection(restaurantName, templateName, years);
  const headerRows = headerSection.length;

  // Verificar que todos los años tengan la misma estructura
  const baseRubrics = plDataByYear[0] || [];

  const dataRows = baseRubrics.map((rubric, idx) => {
    const row: (string | number)[] = [rubric.rubric_name];

    // Para cada año, buscar el rubro correspondiente
    years.forEach((_, yearIdx) => {
      const yearData = plDataByYear[yearIdx] || [];
      const matchingRubric = yearData[idx];

      if (matchingRubric && matchingRubric.rubric_code === rubric.rubric_code) {
        row.push(matchingRubric.amount, (matchingRubric.percentage || 0) / 100);
      } else {
        row.push(0, 0);
      }
    });

    return row;
  });

  // Construir worksheet con headers + datos
  const worksheetData = [...headerSection, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(worksheetData);

  // Aplicar formato de números contables
  const numFmt = "#,##0.00"; // Formato contable
  const pctFmt = "0.00%"; // Formato porcentaje

  dataRows.forEach((_, rowIdx) => {
    years.forEach((_, yearIdx) => {
      const euroCol = 1 + yearIdx * 2;
      const pctCol = euroCol + 1;
      const actualRow = headerRows + rowIdx;

      // Formato € (columnas impares)
      const euroCellRef = XLSX.utils.encode_cell({ r: actualRow, c: euroCol });
      if (ws[euroCellRef]) {
        ws[euroCellRef].z = numFmt;
        ws[euroCellRef].t = "n";
      }

      // Formato % (columnas pares)
      const pctCellRef = XLSX.utils.encode_cell({ r: actualRow, c: pctCol });
      if (ws[pctCellRef]) {
        ws[pctCellRef].z = pctFmt;
        ws[pctCellRef].t = "n";
      }
    });
  });

  // Aplicar estilos según nivel de rúbrica
  const colCount = 1 + years.length * 2;
  baseRubrics.forEach((rubric, idx) => {
    applyRubricStyles(ws, rubric, idx, colCount, headerRows);
  });

  // Aplicar estilos a título principal
  const titleCell = ws["A1"];
  if (titleCell) {
    titleCell.s = {
      font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1E3A8A" } },
      alignment: { horizontal: "center" },
    };
  }

  // Merge del título principal
  if (!ws["!merges"]) ws["!merges"] = [];
  ws["!merges"].push({
    s: { r: 0, c: 0 },
    e: { r: 0, c: colCount - 1 },
  });

  // Establecer ancho de columnas
  ws["!cols"] = [
    { wch: 45 }, // Concepto
    ...years.flatMap(() => [{ wch: 18 }, { wch: 10 }]), // € y %
  ];

  // Crear workbook y añadir worksheet
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, restaurantName.substring(0, 31));

  // Generar archivo y descargar
  const fileName = `PL_Historico_${restaurantName.replace(/\s+/g, "_")}_${years.join("_")}.xlsx`;
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

/**
 * Exporta P&L a CSV rápido para análisis
 */
export const exportPLCSV = (plData: PLReportLine[], fileName: string) => {
  const rows = plData.map((line) => ({
    Concepto: line.rubric_name,
    Importe: line.amount,
    Porcentaje: line.percentage || 0,
    Codigo: line.rubric_code,
    Nivel: line.level ?? 0,
    EsTotal: line.is_total ? "sí" : "no",
  }));
  
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName.endsWith(".csv") ? fileName : `${fileName}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Exporta P&L mensual con comparación Year-over-Year opcional
 */
interface ExportPLMonthlyYoYParams {
  plDataByMonth: PLReportLine[][];
  prevYearPlDataByMonth?: PLReportLine[][];
  year: number;
  restaurantName: string;
  templateName: string;
}

export const exportPLMonthlyYoY = ({
  plDataByMonth,
  prevYearPlDataByMonth,
  year,
  restaurantName,
  templateName,
}: ExportPLMonthlyYoYParams) => {
  const hasYoY = prevYearPlDataByMonth && prevYearPlDataByMonth.length === 12;
  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  
  // Headers
  const headerSection = hasYoY 
    ? [
        [`P&L MENSUAL ${year} vs ${year-1} - ${templateName.toUpperCase()}`],
        [`Restaurante: ${restaurantName}`],
        [],
        ["Concepto", ...monthNames.flatMap(m => [`${m} ${year}`, `${m} ${year-1}`, "Δ%"])],
      ]
    : [
        [`P&L MENSUAL ${year} - ${templateName.toUpperCase()}`],
        [`Restaurante: ${restaurantName}`],
        [],
        ["Concepto", ...monthNames, "Total"],
      ];

  // Obtener estructura de rubros del primer mes
  const baseRubrics = plDataByMonth[0] || [];
  
  // Construir filas de datos
  const dataRows = baseRubrics.map((rubric) => {
    const row: (string | number)[] = [rubric.rubric_name];
    
    let totalYear = 0;
    
    for (let monthIdx = 0; monthIdx < 12; monthIdx++) {
      const monthData = plDataByMonth[monthIdx] || [];
      const matchingRubric = monthData.find(r => r.rubric_code === rubric.rubric_code);
      const currentAmount = matchingRubric?.amount || 0;
      
      if (hasYoY) {
        const prevMonthData = prevYearPlDataByMonth![monthIdx] || [];
        const prevMatchingRubric = prevMonthData.find(r => r.rubric_code === rubric.rubric_code);
        const prevAmount = prevMatchingRubric?.amount || 0;
        
        const variance = prevAmount !== 0 ? ((currentAmount - prevAmount) / Math.abs(prevAmount)) : 0;
        
        row.push(currentAmount, prevAmount, variance);
        totalYear += currentAmount;
      } else {
        row.push(currentAmount);
        totalYear += currentAmount;
      }
    }
    
    // Columna Total (solo si no es YoY)
    if (!hasYoY) {
      row.push(totalYear);
    }
    
    return row;
  });

  const worksheetData = [...headerSection, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(worksheetData);

  // Formato de números
  const numFmt = "#,##0.00";
  const pctFmt = "0.00%";
  const headerRows = headerSection.length;

  dataRows.forEach((_, rowIdx) => {
    for (let monthIdx = 0; monthIdx < 12; monthIdx++) {
      const actualRow = headerRows + rowIdx;
      
      if (hasYoY) {
        const baseCol = 1 + monthIdx * 3;
        // Formato € para columnas current y previous
        [baseCol, baseCol + 1].forEach(col => {
          const cellRef = XLSX.utils.encode_cell({ r: actualRow, c: col });
          if (ws[cellRef]) {
            ws[cellRef].z = numFmt;
            ws[cellRef].t = "n";
          }
        });
        // Formato % para varianza
        const varCellRef = XLSX.utils.encode_cell({ r: actualRow, c: baseCol + 2 });
        if (ws[varCellRef]) {
          ws[varCellRef].z = pctFmt;
          ws[varCellRef].t = "n";
        }
      } else {
        const col = 1 + monthIdx;
        const cellRef = XLSX.utils.encode_cell({ r: actualRow, c: col });
        if (ws[cellRef]) {
          ws[cellRef].z = numFmt;
          ws[cellRef].t = "n";
        }
      }
    }
    
    // Formato para columna Total (si no es YoY)
    if (!hasYoY) {
      const totalCellRef = XLSX.utils.encode_cell({ r: headerRows + rowIdx, c: 13 });
      if (ws[totalCellRef]) {
        ws[totalCellRef].z = numFmt;
        ws[totalCellRef].t = "n";
      }
    }
  });

  // Aplicar estilos a rubros
  const colCount = hasYoY ? 1 + 12 * 3 : 1 + 12 + 1;
  baseRubrics.forEach((rubric, idx) => {
    applyRubricStyles(ws, rubric, idx, colCount, headerRows);
  });

  // Estilo de título
  const titleCell = ws["A1"];
  if (titleCell) {
    titleCell.s = {
      font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1E3A8A" } },
      alignment: { horizontal: "center" },
    };
  }

  // Merge título
  if (!ws["!merges"]) ws["!merges"] = [];
  ws["!merges"].push({
    s: { r: 0, c: 0 },
    e: { r: 0, c: colCount - 1 },
  });

  // Anchos de columnas
  ws["!cols"] = [
    { wch: 45 }, // Concepto
    ...(hasYoY 
      ? Array(12).fill([{ wch: 12 }, { wch: 12 }, { wch: 8 }]).flat()
      : [...Array(12).fill({ wch: 12 }), { wch: 14 }]
    ),
  ];

  // Crear workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, restaurantName.substring(0, 31));

  const fileName = hasYoY
    ? `PL_Mensual_YoY_${restaurantName.replace(/\s+/g, "_")}_${year}.xlsx`
    : `PL_Mensual_${restaurantName.replace(/\s+/g, "_")}_${year}.xlsx`;
  
  XLSX.writeFile(wb, fileName);
};
