import { buildMetaRows, setColWidths, fmtEUR, writeAndDownload } from "@/lib/report-excel-export";

export const exportJournalBookExcel = async (
  entries: any[],
  centro: string,
  periodo: string
) => {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const meta = buildMetaRows({
    title: "LIBRO DIARIO",
    centro,
    periodo,
  });

  const allRows: string[][] = [...meta];
  allRows.push(["Fecha", "Asiento", "Cuenta", "Nombre", "Descripción", "Debe (€)", "Haber (€)"]);

  for (const entry of entries) {
    const date = new Date(entry.entry_date).toLocaleDateString("es-ES");
    for (const line of entry.lines) {
      allRows.push([
        date,
        String(entry.entry_number),
        line.account_code,
        line.account_name || "",
        line.description || entry.description || "",
        line.movement_type === "debit" ? fmtEUR(Number(line.amount)) : "",
        line.movement_type === "credit" ? fmtEUR(Number(line.amount)) : "",
      ]);
    }
    allRows.push([
      "",
      "",
      "",
      "",
      "SUBTOTAL ASIENTO",
      fmtEUR(Number(entry.total_debit)),
      fmtEUR(Number(entry.total_credit)),
    ]);
    allRows.push([]);
  }

  const ws = XLSX.utils.aoa_to_sheet(allRows);
  setColWidths(ws, [14, 10, 14, 30, 40, 16, 16]);
  XLSX.utils.book_append_sheet(wb, ws, "Libro Diario");

  await writeAndDownload(wb, `libro-diario-${periodo.replace(/\s/g, "")}`);
};
