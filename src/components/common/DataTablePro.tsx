import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

interface Column {
  key: string;
  label: string;
  className?: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface DataTableProProps {
  columns: Column[];
  data: any[];
  onRowSelect?: (selectedIds: string[]) => void;
  rowKey?: string;
  emptyMessage?: string;
  showLegend?: boolean;
  legend?: Array<{ color: string; label: string }>;
}

export const DataTablePro = ({ 
  columns, 
  data, 
  onRowSelect,
  rowKey = 'id',
  emptyMessage = "No se han encontrado registros",
  showLegend = false,
  legend = []
}: DataTableProProps) => {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(data.map(row => row[rowKey]));
      setSelectedRows(allIds);
      onRowSelect?.(Array.from(allIds));
    } else {
      setSelectedRows(new Set());
      onRowSelect?.([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedRows(newSelected);
    onRowSelect?.(Array.from(newSelected));
  };

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox 
                checked={selectedRows.size === data.length && data.length > 0}
                onCheckedChange={handleSelectAll}
              />
            </TableHead>
            {columns.map((col) => (
              <TableHead key={col.key} className={col.className}>
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length + 1} className="text-center py-12 text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow key={row[rowKey]} className="hover:bg-muted/50">
                <TableCell>
                  <Checkbox 
                    checked={selectedRows.has(row[rowKey])}
                    onCheckedChange={(checked) => handleSelectRow(row[rowKey], checked as boolean)}
                  />
                </TableCell>
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.className}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {showLegend && legend.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
          <span className="font-semibold">Leyenda colores:</span>
          {legend.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${item.color}`} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
