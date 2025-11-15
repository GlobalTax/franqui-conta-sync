import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { FixedAsset } from "@/hooks/useFixedAssets";
import { formatCurrency } from "@/lib/utils";

interface AssetsListProps {
  assets: FixedAsset[];
  onView: (asset: FixedAsset) => void;
  onEdit: (asset: FixedAsset) => void;
  onDelete: (assetId: string) => void;
}

const statusColors = {
  active: "success",
  fully_depreciated: "gold",
  disposed: "secondary",
} as const;

const statusLabels = {
  active: "Activo",
  fully_depreciated: "Amortizado",
  disposed: "Baja",
} as const;

export function AssetsList({ assets, onView, onEdit, onDelete }: AssetsListProps) {
  const formatPercent = (accumulated: number | null, total: number) => {
    if (!accumulated) return "0%";
    return `${Math.round((accumulated / total) * 100)}%`;
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Cuenta</TableHead>
            <TableHead className="text-right">Valor Adq.</TableHead>
            <TableHead className="text-right">Amort. Acum.</TableHead>
            <TableHead className="text-right">VNC</TableHead>
            <TableHead className="text-center">% Amort.</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                No hay activos fijos registrados
              </TableCell>
            </TableRow>
          ) : (
            assets.map((asset) => {
              const vnc = asset.current_value || asset.acquisition_value;
              const amortPercent = formatPercent(asset.accumulated_depreciation, asset.acquisition_value);

              return (
                <TableRow key={asset.id}>
                  <TableCell className="font-mono text-sm">{asset.asset_code}</TableCell>
                  <TableCell className="font-medium">
                    {asset.description}
                    {asset.location && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        📍 {asset.location}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{asset.account_code}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(asset.acquisition_value)}
                  </TableCell>
                  <TableCell className="text-right text-orange-600">
                    {formatCurrency(asset.accumulated_depreciation || 0)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(vnc)}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm font-medium">{amortPercent}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColors[asset.status as keyof typeof statusColors] || "secondary"}>
                      {statusLabels[asset.status as keyof typeof statusLabels] || asset.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onView(asset)}
                        title="Ver cuadro de amortización"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {asset.status === 'active' && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(asset)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(asset.id)}
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
