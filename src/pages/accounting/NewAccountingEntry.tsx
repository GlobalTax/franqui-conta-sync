import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountingEntryForm } from "@/components/accounting/AccountingEntryForm";
import { useCreateAccountingEntry } from "@/hooks/useAccountingEntries";
import { useOrganization } from "@/hooks/useOrganization";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { RestaurantFilter } from "@/components/RestaurantFilter";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export default function NewAccountingEntry() {
  const navigate = useNavigate();
  const { currentMembership } = useOrganization();
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>(
    currentMembership?.restaurant?.codigo || ""
  );
  const createEntry = useCreateAccountingEntry();

  const handleSubmit = async (formData: any) => {
    if (!selectedRestaurant) {
      return;
    }

    await createEntry.mutateAsync({
      centroCode: selectedRestaurant,
      formData,
    });

    navigate("/contabilidad/apuntes");
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/contabilidad/apuntes")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Nuevo Asiento Contable</h1>
          <p className="text-muted-foreground">
            Crea un nuevo asiento con apuntes debe y haber
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-6 max-w-xs">
            <Label>Centro</Label>
            <RestaurantFilter
              value={selectedRestaurant}
              onChange={setSelectedRestaurant}
            />
          </div>

          {selectedRestaurant ? (
            <AccountingEntryForm
              onSubmit={handleSubmit}
              isLoading={createEntry.isPending}
              organizationId={currentMembership?.organization?.id}
            />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Selecciona un centro para comenzar
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
