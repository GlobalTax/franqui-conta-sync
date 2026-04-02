import { buildMetaRows, setColWidths, fmtEUR, writeAndDownload } from "@/lib/report-excel-export";

export const exportBalanceSheetExcel = async (
  data: any[],
  centro: string,
  fechaCorte: string,
  templateName: string
) => {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const sections: Record<string, any[]> = {};
  for (const item of data) {
    const sec = item.section || "Otros";
    if (!sections[sec]) sections[sec] = [];
    sections[sec].push(item);
  }

  // If there are sections, create one sheet per section; otherwise single sheet
  const sectionKeys = Object.keys(sections);
  if (sectionKeys.length <= 1) {
    const meta = buildMetaRows({
      title: `BALANCE DE SITUACIÓN — ${templateName}`,
      centro,
      periodo: `Fecha corte: ${fechaCorte}`,
    });
    const header = ["Código", "Rubro", "Importe (€)"];
    const rows = data.map((item: any) => {
      const indent = "  ".repeat(item.level || 0);
      return [
        item.rubric_code,
        `${indent}${item.rubric_name}`,
        fmtEUR(Number(item.amount)),
      ];
    });
    const aoa = [...meta, header, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    setColWidths(ws, [14, 50, 18]);
    XLSX.utils.book_append_sheet(wb, ws, "Balance");
  } else {
    for (const sec of sectionKeys) {
      const items = sections[sec];
      const meta = buildMetaRows({
        title: `BALANCE — ${sec.toUpperCase()}`,
        centro,
        periodo: `Fecha corte: ${fechaCorte}`,
      });
      const header = ["Código", "Rubro", "Importe (€)"];
      const rows = items.map((item: any) => {
        const indent = "  ".repeat(item.level || 0);
        return [
          item.rubric_code,
          `${indent}${item.rubric_name}`,
          fmtEUR(Number(item.amount)),
        ];
      });
      const total = items.reduce((s: number, i: any) => s + (i.is_total ? 0 : Number(i.amount)), 0);
      const aoa = [...meta, header, ...rows, [], ["TOTAL", "", fmtEUR(total)]];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      setColWidths(ws, [14, 50, 18]);
      XLSX.utils.book_append_sheet(wb, ws, sec.substring(0, 31));
    }
  }

  await writeAndDownload(wb, `balance-${fechaCorte}`);
};
