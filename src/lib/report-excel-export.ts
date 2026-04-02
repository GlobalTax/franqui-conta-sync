/**
 * Utilidades compartidas para exportación Excel profesional de informes contables.
 * Usa xlsx (SheetJS) — ya instalada.
 */

export interface ReportMeta {
  title: string;
  centro?: string;
  periodo?: string;
  fechaGeneracion?: string;
}

export const buildMetaRows = (meta: ReportMeta): string[][] => {
  const rows: string[][] = [
    [meta.title],
    [`Centro: ${meta.centro || "—"}`],
    [`Periodo: ${meta.periodo || "—"}`],
    [`Fecha generación: ${meta.fechaGeneracion || new Date().toLocaleDateString("es-ES")}`],
    [],
  ];
  return rows;
};

export const setColWidths = (
  ws: import("xlsx").WorkSheet,
  widths: number[]
) => {
  ws["!cols"] = widths.map((w) => ({ wch: w }));
};

export const fmtEUR = (v: number): string =>
  new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);

export const writeAndDownload = async (
  wb: import("xlsx").WorkBook,
  filename: string
) => {
  const { writeFile } = await import("xlsx");
  writeFile(wb, `${filename}.xlsx`);
};
