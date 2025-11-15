import * as XLSX from "xlsx";
import { MigrationSummary } from "./migrationSummaryService";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function generateMigrationExcel(summary: MigrationSummary): void {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Resumen
  const resumenData = [
    ["RESUMEN DE MIGRACIÓN CONTABLE"],
    [""],
    ["Ejercicio Fiscal", summary.header.fiscalYear],
    ["Centro", `${summary.header.centroCode} - ${summary.header.centroName}`],
    [
      "Periodo",
      `${format(new Date(summary.header.startDate), "dd/MM/yyyy", { locale: es })} - ${format(new Date(summary.header.endDate), "dd/MM/yyyy", { locale: es })}`,
    ],
    [
      "Estado",
      summary.header.closingDate
        ? `CERRADO (${format(new Date(summary.header.closingDate), "dd/MM/yyyy", { locale: es })})`
        : "ACTIVO",
    ],
    [
      "Generado",
      format(new Date(summary.header.generatedAt), "dd/MM/yyyy HH:mm", {
        locale: es,
      }),
    ],
    ["Generado por", summary.header.generatedBy],
    [""],
    ["MÉTRICAS GENERALES"],
    [""],
    ["Total Asientos", summary.sections.diario.entriesCount],
    [
      "Total Debe",
      summary.sections.diario.totalDebit.toLocaleString("es-ES", {
        minimumFractionDigits: 2,
      }),
    ],
    [
      "Total Haber",
      summary.sections.diario.totalCredit.toLocaleString("es-ES", {
        minimumFractionDigits: 2,
      }),
    ],
    [
      "Balance",
      Math.abs(
        summary.sections.diario.totalDebit - summary.sections.diario.totalCredit
      ) < 0.01
        ? "CUADRADO"
        : "DESCUADRADO",
    ],
    [""],
    ["IVA Neto", summary.sections.iva.netVAT.toLocaleString("es-ES", { minimumFractionDigits: 2 })],
    ["Movimientos Bancarios", summary.sections.bancos.movementsCount],
    ["Errores", summary.sections.validations.errorsCount],
    ["Advertencias", summary.sections.validations.warningsCount],
  ];

  const resumenSheet = XLSX.utils.aoa_to_sheet(resumenData);
  
  // Column widths
  resumenSheet["!cols"] = [{ wch: 25 }, { wch: 50 }];
  
  XLSX.utils.book_append_sheet(workbook, resumenSheet, "Resumen");

  // Sheet 2: Asientos
  const asientosData = [
    ["DETALLE DE ASIENTOS"],
    [""],
    ["Fase", "Cantidad", "Debe", "Haber", "Estado"],
  ];

  if (summary.sections.apertura) {
    asientosData.push([
      "Apertura",
      "1",
      summary.sections.apertura.debit.toLocaleString("es-ES", {
        minimumFractionDigits: 2,
      }),
      summary.sections.apertura.credit.toLocaleString("es-ES", {
        minimumFractionDigits: 2,
      }),
      "✅ Completado",
    ]);
  }

  asientosData.push([
    "Diario",
    summary.sections.diario.entriesCount.toString(),
    summary.sections.diario.totalDebit.toLocaleString("es-ES", {
      minimumFractionDigits: 2,
    }),
    summary.sections.diario.totalCredit.toLocaleString("es-ES", {
      minimumFractionDigits: 2,
    }),
    Math.abs(
      summary.sections.diario.totalDebit - summary.sections.diario.totalCredit
    ) < 0.01
      ? "✅ Cuadrado"
      : "❌ Descuadrado",
  ]);

  const asientosSheet = XLSX.utils.aoa_to_sheet(asientosData);
  asientosSheet["!cols"] = [
    { wch: 15 },
    { wch: 12 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
  ];
  
  XLSX.utils.book_append_sheet(workbook, asientosSheet, "Asientos");

  // Sheet 3: IVA
  const ivaData = [
    ["LIBROS IVA"],
    [""],
    ["Tipo", "Facturas", "Base Imponible", "IVA", "Total"],
    [
      "Facturas Emitidas",
      summary.sections.iva.emitidas.count,
      summary.sections.iva.emitidas.base.toLocaleString("es-ES", {
        minimumFractionDigits: 2,
      }),
      summary.sections.iva.emitidas.vat.toLocaleString("es-ES", {
        minimumFractionDigits: 2,
      }),
      (
        summary.sections.iva.emitidas.base + summary.sections.iva.emitidas.vat
      ).toLocaleString("es-ES", { minimumFractionDigits: 2 }),
    ],
    [
      "Facturas Recibidas",
      summary.sections.iva.recibidas.count,
      summary.sections.iva.recibidas.base.toLocaleString("es-ES", {
        minimumFractionDigits: 2,
      }),
      summary.sections.iva.recibidas.vat.toLocaleString("es-ES", {
        minimumFractionDigits: 2,
      }),
      (
        summary.sections.iva.recibidas.base + summary.sections.iva.recibidas.vat
      ).toLocaleString("es-ES", { minimumFractionDigits: 2 }),
    ],
    [""],
    [
      "IVA NETO",
      "",
      "",
      summary.sections.iva.netVAT.toLocaleString("es-ES", {
        minimumFractionDigits: 2,
      }),
      summary.sections.iva.netVAT >= 0 ? "A PAGAR" : "A DEVOLVER",
    ],
  ];

  const ivaSheet = XLSX.utils.aoa_to_sheet(ivaData);
  ivaSheet["!cols"] = [
    { wch: 22 },
    { wch: 12 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
  ];
  
  XLSX.utils.book_append_sheet(workbook, ivaSheet, "IVA");

  // Sheet 4: Logs
  const logsData = [
    ["LOGS DE MIGRACIÓN"],
    [""],
    ["Fecha", "Paso", "Severidad", "Mensaje"],
  ];

  summary.logs.slice(0, 100).forEach((log) => {
    logsData.push([
      format(new Date(log.timestamp), "dd/MM/yyyy HH:mm:ss", { locale: es }),
      log.step,
      log.severity.toUpperCase(),
      log.message,
    ]);
  });

  const logsSheet = XLSX.utils.aoa_to_sheet(logsData);
  logsSheet["!cols"] = [
    { wch: 20 },
    { wch: 20 },
    { wch: 12 },
    { wch: 80 },
  ];
  
  XLSX.utils.book_append_sheet(workbook, logsSheet, "Logs");

  // Generate and download
  const fileName = `Migracion_${summary.header.fiscalYear}_${summary.header.centroCode}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
