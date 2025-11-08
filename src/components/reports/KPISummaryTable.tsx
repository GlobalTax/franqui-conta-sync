import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, getEBITDAColor, getFoodCostColor, getLaborColor } from "@/lib/reports-utils";

interface KPISummaryTableProps {
  data: {
    centroCode: string;
    centroName: string;
    sales: number;
    ebitda: number;
    foodCostPct: number;
    laborPct: number;
    cplh: number;
    iva: number;
  }[];
  onSort: (key: string) => void;
  sortConfig: { key: string; direction: "asc" | "desc" };
  isLoading: boolean;
}

export function KPISummaryTable({ data, onSort, sortConfig, isLoading }: KPISummaryTableProps) {
  const sortedData = [...data].sort((a, b) => {
    const aValue = a[sortConfig.key as keyof typeof a];
    const bValue = b[sortConfig.key as keyof typeof b];
    
    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortConfig.direction === "asc" 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    return sortConfig.direction === "asc" 
      ? Number(aValue) - Number(bValue)
      : Number(bValue) - Number(aValue);
  });

  const totals = data.reduce(
    (acc, row) => ({
      sales: acc.sales + row.sales,
      iva: acc.iva + row.iva,
    }),
    { sales: 0, iva: 0 }
  );

  const averages = {
    ebitda: data.reduce((sum, row) => sum + row.ebitda, 0) / data.length || 0,
    foodCostPct: data.reduce((sum, row) => sum + row.foodCostPct, 0) / data.length || 0,
    laborPct: data.reduce((sum, row) => sum + row.laborPct, 0) / data.length || 0,
    cplh: data.reduce((sum, row) => sum + row.cplh, 0) / data.length || 0,
  };

  if (isLoading) {
    return (
      <Card className="quantum-card">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="quantum-card">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Resumen por Centro</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/40">
                <TableHead className="quantum-header">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onSort("centroName")}
                    className="h-8 px-2 text-xs"
                  >
                    CENTRO
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-right quantum-header">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onSort("sales")}
                    className="h-8 px-2 text-xs"
                  >
                    VENTAS
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-right quantum-header">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onSort("ebitda")}
                    className="h-8 px-2 text-xs"
                  >
                    EBITDA %
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-right quantum-header">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onSort("foodCostPct")}
                    className="h-8 px-2 text-xs"
                  >
                    FOOD COST %
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-right quantum-header">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onSort("laborPct")}
                    className="h-8 px-2 text-xs"
                  >
                    LABOR %
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-right quantum-header">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onSort("cplh")}
                    className="h-8 px-2 text-xs"
                  >
                    CPLH
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-right quantum-header">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onSort("iva")}
                    className="h-8 px-2 text-xs"
                  >
                    IVA
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((row) => (
                <TableRow 
                  key={row.centroCode}
                  className="hover:bg-accent/10 transition-colors border-border/20"
                >
                  <TableCell className="font-normal text-sm">{row.centroName}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-sm">
                    {formatCurrency(row.sales)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className={getEBITDAColor(row.ebitda)}>
                      {row.ebitda.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className={getFoodCostColor(row.foodCostPct)}>
                      {row.foodCostPct.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className={getLaborColor(row.laborPct)}>
                      {row.laborPct.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {row.cplh.toFixed(2)}€
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {formatCurrency(row.iva)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-muted/30 hover:bg-muted/30 border-border/40">
                <TableCell className="font-semibold">TOTALES / PROMEDIO</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatCurrency(totals.sales)}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {averages.ebitda.toFixed(1)}%
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {averages.foodCostPct.toFixed(1)}%
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {averages.laborPct.toFixed(1)}%
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {averages.cplh.toFixed(2)}€
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatCurrency(totals.iva)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
