import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { MigrationSummary } from "./migrationSummaryService";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function generateMigrationPDF(
  summary: MigrationSummary,
  options: {
    includeLogs?: boolean;
    includeValidations?: boolean;
  } = {}
): void {
  const doc = new jsPDF();
  const { includeLogs = true, includeValidations = true } = options;

  let yPosition = 20;

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("🍔 McDonald's - FranquiConta", 105, yPosition, { align: "center" });
  
  yPosition += 10;
  doc.setFontSize(14);
  doc.text("Resumen de Migración Contable", 105, yPosition, { align: "center" });

  yPosition += 15;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  // Basic info
  const basicInfo = [
    ["Ejercicio Fiscal:", summary.header.fiscalYear.toString()],
    ["Centro:", `${summary.header.centroCode} - ${summary.header.centroName}`],
    [
      "Periodo:",
      `${format(new Date(summary.header.startDate), "dd/MM/yyyy", { locale: es })} - ${format(new Date(summary.header.endDate), "dd/MM/yyyy", { locale: es })}`,
    ],
  ];

  if (summary.header.closingDate) {
    basicInfo.push([
      "Estado:",
      `CERRADO (${format(new Date(summary.header.closingDate), "dd/MM/yyyy", { locale: es })})`,
    ]);
  }

  autoTable(doc, {
    startY: yPosition,
    body: basicInfo,
    theme: "plain",
    styles: { fontSize: 10 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 40 },
      1: { cellWidth: 140 },
    },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;

  // Section 1: Apertura
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("1. ASIENTO DE APERTURA", 14, yPosition);
  yPosition += 7;

  if (summary.sections.apertura) {
    const aperturaData = [
      ["Nº Asiento:", summary.sections.apertura.entryNumber],
      [
        "Fecha:",
        format(new Date(summary.sections.apertura.date), "dd/MM/yyyy", {
          locale: es,
        }),
      ],
      ["Debe:", `${summary.sections.apertura.debit.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €`],
      ["Haber:", `${summary.sections.apertura.credit.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €`],
    ];

    autoTable(doc, {
      startY: yPosition,
      body: aperturaData,
      theme: "plain",
      styles: { fontSize: 9 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 30 },
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("No se importó asiento de apertura", 20, yPosition);
    yPosition += 10;
  }

  // Section 2: Diario
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("2. DIARIO GENERAL", 14, yPosition);
  yPosition += 7;

  const diarioData = [
    ["Total asientos:", summary.sections.diario.entriesCount.toString()],
    ["Total Debe:", `${summary.sections.diario.totalDebit.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €`],
    ["Total Haber:", `${summary.sections.diario.totalCredit.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €`],
    [
      "Balance:",
      Math.abs(summary.sections.diario.totalDebit - summary.sections.diario.totalCredit) < 0.01
        ? "✅ Cuadrado"
        : `❌ Descuadre: ${Math.abs(summary.sections.diario.totalDebit - summary.sections.diario.totalCredit).toLocaleString("es-ES", { minimumFractionDigits: 2 })} €`,
    ],
  ];

  autoTable(doc, {
    startY: yPosition,
    body: diarioData,
    theme: "plain",
    styles: { fontSize: 9 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 30 },
    },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;

  // Section 3: IVA
  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("3. LIBROS IVA", 14, yPosition);
  yPosition += 7;

  const ivaData = [
    [
      "Facturas Emitidas:",
      `${summary.sections.iva.emitidas.count} facturas`,
      "",
    ],
    [
      "  Base imponible:",
      `${summary.sections.iva.emitidas.base.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €`,
      "",
    ],
    [
      "  IVA repercutido:",
      `${summary.sections.iva.emitidas.vat.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €`,
      "",
    ],
    ["", "", ""],
    [
      "Facturas Recibidas:",
      `${summary.sections.iva.recibidas.count} facturas`,
      "",
    ],
    [
      "  Base imponible:",
      `${summary.sections.iva.recibidas.base.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €`,
      "",
    ],
    [
      "  IVA soportado:",
      `${summary.sections.iva.recibidas.vat.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €`,
      "",
    ],
    ["", "", ""],
    [
      "IVA Neto:",
      `${summary.sections.iva.netVAT.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €`,
      summary.sections.iva.netVAT >= 0 ? "(a pagar)" : "(a devolver)",
    ],
  ];

  autoTable(doc, {
    startY: yPosition,
    body: ivaData,
    theme: "plain",
    styles: { fontSize: 9 },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;

  // Section 4: Bancos
  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("4. CONCILIACIÓN BANCARIA", 14, yPosition);
  yPosition += 7;

  const bancosData = [
    [
      "Movimientos importados:",
      summary.sections.bancos.movementsCount.toString(),
    ],
    [
      "Total movimientos:",
      `${summary.sections.bancos.totalAmount.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €`,
    ],
  ];

  autoTable(doc, {
    startY: yPosition,
    body: bancosData,
    theme: "plain",
    styles: { fontSize: 9 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 50 },
    },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;

  // Section 5: Validations
  if (includeValidations) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("5. VALIDACIONES", 14, yPosition);
    yPosition += 7;

    const validationsData = [
      [
        "Advertencias:",
        summary.sections.validations.warningsCount > 0
          ? `⚠️ ${summary.sections.validations.warningsCount}`
          : "✅ 0",
      ],
      [
        "Errores críticos:",
        summary.sections.validations.errorsCount > 0
          ? `❌ ${summary.sections.validations.errorsCount}`
          : "✅ 0",
      ],
    ];

    autoTable(doc, {
      startY: yPosition,
      body: validationsData,
      theme: "plain",
      styles: { fontSize: 9 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 40 },
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  // Logs table
  if (includeLogs && summary.logs.length > 0) {
    doc.addPage();
    yPosition = 20;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("LOGS DE MIGRACIÓN", 14, yPosition);
    yPosition += 7;

    const logsTable = summary.logs.slice(0, 50).map((log) => [
      format(new Date(log.timestamp), "dd/MM HH:mm", { locale: es }),
      log.step,
      log.severity.toUpperCase(),
      log.message.substring(0, 60),
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [["Fecha", "Paso", "Severidad", "Mensaje"]],
      body: logsTable,
      theme: "striped",
      styles: { fontSize: 7 },
      headStyles: { fillColor: [29, 78, 216] },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 30 },
        2: { cellWidth: 25 },
        3: { cellWidth: 110 },
      },
    });
  }

  // Footer
  doc.addPage();
  yPosition = 20;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("DECLARACIÓN DE CONFORMIDAD", 105, yPosition, { align: "center" });
  
  yPosition += 15;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  
  const declaration = [
    "El presente documento certifica que la migración de datos históricos del ejercicio fiscal",
    `${summary.header.fiscalYear} para el centro ${summary.header.centroCode} - ${summary.header.centroName}`,
    "ha sido completada según los procedimientos establecidos.",
    "",
    `Generado: ${format(new Date(summary.header.generatedAt), "dd/MM/yyyy HH:mm", { locale: es })}`,
    `Por: ${summary.header.generatedBy}`,
  ];

  declaration.forEach((line) => {
    doc.text(line, 105, yPosition, { align: "center" });
    yPosition += 7;
  });

  // Save
  const fileName = `Migracion_${summary.header.fiscalYear}_${summary.header.centroCode}.pdf`;
  doc.save(fileName);
}
