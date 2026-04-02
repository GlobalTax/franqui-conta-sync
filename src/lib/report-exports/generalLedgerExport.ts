import { buildMetaRows, setColWidths, fmtEUR, writeAndDownload } from "@/lib/report-excel-export";

export const exportGeneralLedgerExcel = async (
  data: any[],
  centro: string,
  periodo: string
) => {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  // Group by account
  const groups: Record<string, { code: string; name: string; lines: any[] }> = {};
  for (const line of data) {
    const key = line.account_code;
    if (!groups[key]) groups[key] = { code: key, name: line.account_name, lines: [] };
    groups[key].lines.push(line);
  }

  const meta = buildMetaRows({
    title: "LIBRO MAYOR",
    centro,
    periodo,
  });

  const allRows: string[][] = [...meta];

  for (const group of Object.values(groups)) {
    allRows.push([]);
    allRows.push([`Cuenta: ${group.code} — ${group.name}`]);
    allRows.push(["Fecha", "Asiento", "Concepto", "Debe (€)", "Haber (€)", "Saldo (€)"]);

    for (const line of group.lines) {
      const date = new Date(line.entry_date).toLocaleDateString("es-ES");
      allRows.push([
        date,
        String(line.entry_number),
        line.description || "",
        fmtEUR(Number(line.debit)),
        fmtEUR(Number(line.credit)),
        fmtEUR(Number(line.balance)),
      ]);
    }

    const last = group.lines[group.lines.length - 1];
    allRows.push(["", "", "SALDO FINAL", "", "", fmtEUR(Number(last?.balance || 0))]);
  }

  const ws = XLSX.utils.aoa_to_sheet(allRows);
  setColWidths(ws, [14, 10, 40, 16, 16, 16]);
  XLSX.utils.book_append_sheet(wb, ws, "Libro Mayor");

  await writeAndDownload(wb, `libro-mayor-${periodo.replace(/\s/g, "")}`);
};
