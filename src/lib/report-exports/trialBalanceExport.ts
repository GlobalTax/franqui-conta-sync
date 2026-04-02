import { buildMetaRows, setColWidths, fmtEUR, writeAndDownload } from "@/lib/report-excel-export";

export const exportTrialBalanceExcel = async (
  data: any[],
  centro: string,
  periodo: string
) => {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const meta = buildMetaRows({
    title: "BALANCE DE SUMAS Y SALDOS",
    centro,
    periodo,
  });

  const header = ["Código", "Cuenta", "Nivel", "Debe (€)", "Haber (€)", "Saldo (€)"];

  const rows = data.map((r: any) => [
    r.account_code,
    r.account_name,
    r.nivel,
    fmtEUR(Number(r.debit_total)),
    fmtEUR(Number(r.credit_total)),
    fmtEUR(Number(r.balance)),
  ]);

  const totalDebit = data.reduce((s: number, r: any) => s + Number(r.debit_total), 0);
  const totalCredit = data.reduce((s: number, r: any) => s + Number(r.credit_total), 0);

  const totalsRow = ["TOTALES", "", "", fmtEUR(totalDebit), fmtEUR(totalCredit), fmtEUR(totalDebit - totalCredit)];

  const aoa = [...meta, header, ...rows, [], totalsRow];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  setColWidths(ws, [14, 40, 8, 16, 16, 16]);

  XLSX.utils.book_append_sheet(wb, ws, "Sumas y Saldos");
  await writeAndDownload(wb, `sumas-saldos-${periodo.replace(/\s/g, "")}`);
};
