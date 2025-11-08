import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface CompanyInfo {
  razonSocial: string;
  cif: string;
  direccion?: string;
}

interface JournalEntry {
  entry_number: number;
  entry_date: string;
  description: string;
  lines: Array<{
    account_code: string;
    account_name: string;
    movement_type: string;
    amount: number;
  }>;
  total_debit: number;
  total_credit: number;
}

interface LedgerLine {
  entry_date: string;
  entry_number: number;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

interface LedgerAccount {
  account_code: string;
  account_name: string;
  lines: LedgerLine[];
}

// Generar hash simple para simular sello digital
function generateDocumentHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).toUpperCase().padStart(16, '0');
}

// Añadir cabecera oficial
function addOfficialHeader(
  doc: jsPDF,
  company: CompanyInfo,
  title: string,
  period: { start: string; end: string },
  pageNumber: number,
  totalPages: number
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Cabecera empresa
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(company.razonSocial, 14, 15);
  doc.setFont("helvetica", "normal");
  doc.text(`CIF: ${company.cif}`, 14, 20);
  if (company.direccion) {
    doc.setFontSize(8);
    doc.text(company.direccion, 14, 25);
  }
  
  // Título del libro
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(title, pageWidth / 2, 15, { align: "center" });
  
  // Período
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const periodText = `Período: ${format(new Date(period.start), "dd/MM/yyyy", { locale: es })} - ${format(new Date(period.end), "dd/MM/yyyy", { locale: es })}`;
  doc.text(periodText, pageWidth / 2, 20, { align: "center" });
  
  // Número de página y folio
  doc.setFontSize(8);
  doc.text(`Página: ${pageNumber} de ${totalPages}`, pageWidth - 14, 15, { align: "right" });
  doc.text(`Folio: ${pageNumber.toString().padStart(4, '0')}`, pageWidth - 14, 20, { align: "right" });
  
  // Línea separadora
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(14, 28, pageWidth - 14, 28);
  
  return 32; // Retorna la posición Y donde termina la cabecera
}

// Añadir pie de página oficial
function addOfficialFooter(
  doc: jsPDF,
  pageNumber: number,
  documentHash: string
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Línea separadora
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(14, pageHeight - 20, pageWidth - 14, pageHeight - 20);
  
  // Información del pie
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  const generatedDate = format(new Date(), "dd/MM/yyyy HH:mm:ss", { locale: es });
  doc.text(`Generado: ${generatedDate}`, 14, pageHeight - 15);
  doc.text(`Hash: ${documentHash}`, 14, pageHeight - 10);
  doc.text(`Pág. ${pageNumber}`, pageWidth - 14, pageHeight - 15, { align: "right" });
  doc.text("Documento oficial según Código de Comercio", pageWidth / 2, pageHeight - 10, { align: "center" });
}

export function exportJournalBookPDF(
  entries: JournalEntry[],
  company: CompanyInfo,
  period: { start: string; end: string },
  filename: string
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Generar hash del documento
  const contentHash = generateDocumentHash(JSON.stringify(entries) + company.cif + period.start);
  
  let currentPage = 1;
  const totalPages = Math.ceil(entries.length / 3) || 1; // Estimación de páginas
  
  // Primera página
  let currentY = addOfficialHeader(doc, company, "LIBRO DIARIO", period, currentPage, totalPages);
  
  entries.forEach((entry, index) => {
    // Verificar si necesitamos nueva página
    if (currentY > 240) {
      addOfficialFooter(doc, currentPage, contentHash);
      doc.addPage();
      currentPage++;
      currentY = addOfficialHeader(doc, company, "LIBRO DIARIO", period, currentPage, totalPages);
    }
    
    // Cabecera del asiento
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    const entryDate = format(new Date(entry.entry_date), "dd/MM/yyyy", { locale: es });
    doc.text(`Asiento N.º ${entry.entry_number} - ${entryDate}`, 14, currentY);
    currentY += 5;
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(entry.description, 14, currentY);
    currentY += 5;
    
    // Tabla de líneas del asiento
    autoTable(doc, {
      startY: currentY,
      head: [['Cuenta', 'Nombre de la Cuenta', 'Debe (€)', 'Haber (€)']],
      body: entry.lines.map(line => [
        line.account_code,
        line.account_name,
        line.movement_type === 'debit' 
          ? Number(line.amount).toLocaleString('es-ES', { minimumFractionDigits: 2 })
          : '-',
        line.movement_type === 'credit'
          ? Number(line.amount).toLocaleString('es-ES', { minimumFractionDigits: 2 })
          : '-',
      ]),
      foot: [[
        { content: 'TOTALES', colSpan: 2, styles: { fontStyle: 'bold' } },
        { content: Number(entry.total_debit).toLocaleString('es-ES', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold' } },
        { content: Number(entry.total_credit).toLocaleString('es-ES', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold' } },
      ]],
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [66, 66, 66], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' },
      },
      margin: { left: 14, right: 14 },
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 8;
  });
  
  // Pie de página en la última página
  addOfficialFooter(doc, currentPage, contentHash);
  
  // Guardar
  doc.save(`${filename}.pdf`);
}

export function exportGeneralLedgerPDF(
  accounts: LedgerAccount[],
  company: CompanyInfo,
  period: { start: string; end: string },
  filename: string
) {
  const doc = new jsPDF();
  
  // Generar hash del documento
  const contentHash = generateDocumentHash(JSON.stringify(accounts) + company.cif + period.start);
  
  let currentPage = 1;
  const totalPages = accounts.length || 1;
  
  accounts.forEach((account, accountIndex) => {
    if (accountIndex > 0) {
      doc.addPage();
      currentPage++;
    }
    
    let currentY = addOfficialHeader(doc, company, "LIBRO MAYOR", period, currentPage, totalPages);
    
    // Título de la cuenta
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`Cuenta: ${account.account_code} - ${account.account_name}`, 14, currentY);
    currentY += 7;
    
    // Tabla de movimientos
    const tableData = account.lines.map(line => [
      format(new Date(line.entry_date), "dd/MM/yyyy", { locale: es }),
      line.entry_number.toString(),
      line.description,
      Number(line.debit).toLocaleString('es-ES', { minimumFractionDigits: 2 }),
      Number(line.credit).toLocaleString('es-ES', { minimumFractionDigits: 2 }),
      Number(line.balance).toLocaleString('es-ES', { minimumFractionDigits: 2 }),
    ]);
    
    // Calcular totales
    const totalDebit = account.lines.reduce((sum, line) => sum + Number(line.debit), 0);
    const totalCredit = account.lines.reduce((sum, line) => sum + Number(line.credit), 0);
    const finalBalance = account.lines[account.lines.length - 1]?.balance || 0;
    
    autoTable(doc, {
      startY: currentY,
      head: [['Fecha', 'Asiento', 'Descripción', 'Debe (€)', 'Haber (€)', 'Saldo (€)']],
      body: tableData,
      foot: [[
        { content: 'TOTALES', colSpan: 3, styles: { fontStyle: 'bold' } },
        { content: totalDebit.toLocaleString('es-ES', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold' } },
        { content: totalCredit.toLocaleString('es-ES', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold' } },
        { content: finalBalance.toLocaleString('es-ES', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
      ]],
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [66, 66, 66], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 18 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 28, halign: 'right' },
        4: { cellWidth: 28, halign: 'right' },
        5: { cellWidth: 28, halign: 'right' },
      },
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
        addOfficialFooter(doc, currentPage, contentHash);
      },
    });
  });
  
  // Guardar
  doc.save(`${filename}.pdf`);
}
