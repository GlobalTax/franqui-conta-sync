import { useState } from "react";
import { Plus } from "lucide-react";
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

  const centroCode = selectedRestaurant || currentMembership?.restaurant?.codigo;

  const { data: entries = [], isLoading } = useAccountingEntries(centroCode, {
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
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Apuntes Contables</h1>
          <p className="text-muted-foreground">
            Gestión de asientos contables y movimientos
          </p>
        </div>
        <Button onClick={() => navigate("/contabilidad/nuevo-asiento")}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Asiento
        </Button>
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Asientos Contables ({entries.length})
            </CardTitle>
            {isLoading && (
              <span className="text-sm text-muted-foreground">Cargando...</span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <AccountingEntriesTable entries={entries} />
        </CardContent>
      </Card>
    </div>
  );
}
