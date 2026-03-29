import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Store, LayoutGrid } from "lucide-react";
import { useAllUserCentres } from "@/hooks/useAllUserCentres";
import { useView, ViewSelection } from "@/contexts/ViewContext";

export function MyRestaurantsCard() {
  const { selectedView, setSelectedView } = useView();
  const { data: franchiseesWithCentres } = useAllUserCentres();

  if (!franchiseesWithCentres?.length) return null;

  // Get centres relevant to current view
  let visibleCentres: { id: string; codigo: string; nombre: string; franchisee_id: string }[] = [];

  if (selectedView?.type === 'all' && selectedView.id) {
    const f = franchiseesWithCentres.find(f => f.id === selectedView.id);
    visibleCentres = f?.centres || [];
  } else if (selectedView?.type === 'company') {
    // Show all centres from the same franchisee
    for (const f of franchiseesWithCentres) {
      if (f.centres.some(c => c.franchisee_id)) {
        visibleCentres = f.centres;
        break;
      }
    }
    // fallback: show all
    if (!visibleCentres.length) {
      visibleCentres = franchiseesWithCentres.flatMap(f => f.centres);
    }
  } else {
    visibleCentres = franchiseesWithCentres.flatMap(f => f.centres);
  }

  const handleCentreClick = (centre: typeof visibleCentres[0]) => {
    const newView: ViewSelection = {
      type: 'centre',
      id: centre.id,
      code: centre.codigo,
      name: `${centre.codigo} - ${centre.nombre}`,
    };
    setSelectedView(newView);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-primary" />
          Mis Restaurantes
          <Badge variant="secondary" className="ml-auto text-xs">
            {visibleCentres.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {visibleCentres.map((centre) => {
            const isActive = selectedView?.type === 'centre' && selectedView.id === centre.id;
            return (
              <button
                key={centre.id}
                onClick={() => handleCentreClick(centre)}
                className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-colors
                  ${isActive 
                    ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
              >
                <Store className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{centre.codigo}</div>
                  <div className="text-xs text-muted-foreground truncate">{centre.nombre}</div>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
