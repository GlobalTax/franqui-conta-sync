import { useState } from "react";
import { Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountingEntriesTable } from "@/components/accounting/AccountingEntriesTable";
import { JournalCSVImporter } from "@/components/accounting/JournalCSVImporter";
import { useAccountingEntries } from "@/hooks/useAccountingEntries";
import { useOrganization } from "@/hooks/useOrganization";
import { useNavigate } from "react-router-dom";
import { RestaurantFilter } from "@/components/RestaurantFilter";
import { FilterPanel } from "@/components/common/FilterPanel";
import { toast } from "sonner";

export default function AccountingEntries() {
  const navigate = useNavigate();
  const { currentMembership } = useOrganization();
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showImporter, setShowImporter] = useState(false);

  const centroCode = selectedRestaurant || currentMembership?.restaurant?.codigo;

  const { data: entries = [], isLoading, refetch } = useAccountingEntries(centroCode, {
    startDate,
    endDate,
    status,
    searchTerm,
  });

  const handleApplyFilters = () => {
    toast.success("Filtros aplicados");
  };

  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    setStatus("");
    setSearchTerm("");
    setSelectedRestaurant("");
    toast.success("Filtros limpiados");
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Apuntes Contables</h1>
            <p className="text-muted-foreground mt-2">
              Gestión de asientos contables y movimientos
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowImporter(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Importar CSV
            </Button>
            <Button onClick={() => navigate("/contabilidad/nuevo-asiento")}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Asiento
            </Button>
          </div>
        </div>

        <FilterPanel onApply={handleApplyFilters} onClear={handleClearFilters}>
          <div className="space-y-2">
            <Label>Centro</Label>
            <RestaurantFilter
              value={selectedRestaurant}
              onChange={setSelectedRestaurant}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="startDate">Desde</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">Hasta</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Estado</Label>
            <Select value={status || 'all'} onValueChange={setStatus}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="posted">Contabilizado</SelectItem>
                <SelectItem value="closed">Cerrado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="search">Buscar</Label>
            <Input
              id="search"
              placeholder="Nº asiento o concepto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </FilterPanel>

        <div className="border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Asientos Contables ({entries.length})
              </h2>
              {isLoading && (
                <span className="text-sm text-muted-foreground">Cargando...</span>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <AccountingEntriesTable entries={entries} onRefresh={() => refetch()} />
          </div>
        </div>

        <JournalCSVImporter
          open={showImporter}
          onOpenChange={setShowImporter}
          centroCode={centroCode || ""}
        />
      </div>
    </div>
  );
}
