import { buildMetaRows, setColWidths, fmtEUR, writeAndDownload } from "@/lib/report-excel-export";

export const exportAssetsRegisterExcel = async (
  assets: any[],
  centro: string,
  year: string,
  totals: { acquisition: number; accumulated: number; current: number }
) => {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const meta = buildMetaRows({
    title: "LIBRO DE BIENES DE INVERSIÓN",
    centro,
    periodo: `Ejercicio ${year}`,
  });

  const header = ["Código", "Descripción", "F. Adquisición", "Valor Adq. (€)", "Amor. Acum. (€)", "VNC (€)", "Estado"];

  const rows = assets.map((a: any) => [
    a.asset_code,
    a.description,
    new Date(a.acquisition_date).toLocaleDateString("es-ES"),
    fmtEUR(a.acquisition_value),
    fmtEUR(a.accumulated_depreciation || 0),
    fmtEUR(a.current_value || a.acquisition_value),
    a.status === "active" ? "Activo" : a.status === "fully_depreciated" ? "Amortizado" : "Baja",
  ]);

  const totalsRow = [
    "TOTALES",
    "",
    "",
    fmtEUR(totals.acquisition),
    fmtEUR(totals.accumulated),
    fmtEUR(totals.current),
    "",
  ];

  const aoa = [...meta, header, ...rows, [], totalsRow];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  setColWidths(ws, [14, 40, 15, 16, 16, 16, 14]);
  XLSX.utils.book_append_sheet(wb, ws, "Libro de Bienes");

  await writeAndDownload(wb, `libro-bienes-${year}`);
};
