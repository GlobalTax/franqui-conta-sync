import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, format } from "date-fns";

// Color coding by thresholds
export function getEBITDAColor(value: number): string {
  if (value >= 15) return "badge-success";
  if (value >= 10) return "badge-warning";
  return "badge-danger";
}

export function getFoodCostColor(value: number): string {
  if (value <= 30) return "badge-success";
  if (value <= 35) return "badge-warning";
  return "badge-danger";
}

export function getLaborColor(value: number): string {
  if (value <= 25) return "badge-success";
  if (value <= 30) return "badge-warning";
  return "badge-danger";
}

// Number formatting
export function formatCurrency(value: number): string {
  return value.toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

// Period options
export function getPeriodOptions(): { label: string; value: string }[] {
  const currentYear = new Date().getFullYear();
  const options = [];

  // Add quarters
  for (let q = 1; q <= 4; q++) {
    options.push({
      label: `Q${q} ${currentYear}`,
      value: `${currentYear}-Q${q}`,
    });
  }

  // Add months
  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  for (let m = 0; m < 12; m++) {
    options.push({
      label: `${months[m]} ${currentYear}`,
      value: `${currentYear}-${String(m + 1).padStart(2, "0")}`,
    });
  }

  return options;
}

// Get date range from period string
export function getPeriodDates(period: string): { start: string; end: string } {
  const [year, type] = period.split("-");
  const yearNum = parseInt(year);

  if (type.startsWith("Q")) {
    // Quarter
    const quarter = parseInt(type.substring(1));
    const quarterDate = new Date(yearNum, (quarter - 1) * 3, 1);
    return {
      start: format(startOfQuarter(quarterDate), "yyyy-MM-dd"),
      end: format(endOfQuarter(quarterDate), "yyyy-MM-dd"),
    };
  } else {
    // Month
    const month = parseInt(type);
    const monthDate = new Date(yearNum, month - 1, 1);
    return {
      start: format(startOfMonth(monthDate), "yyyy-MM-dd"),
      end: format(endOfMonth(monthDate), "yyyy-MM-dd"),
    };
  }
}
