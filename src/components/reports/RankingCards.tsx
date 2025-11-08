import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Users, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface RankingItem {
  centroCode: string;
  centroName: string;
  value: number;
  badge: "up" | "down" | "neutral";
}

interface RankingCardsProps {
  rankings: {
    byEBITDA: RankingItem[];
    byLabor: RankingItem[];
    byMargin: RankingItem[];
  };
  isLoading: boolean;
}

export function RankingCards({ rankings, isLoading }: RankingCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="quantum-card">
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3, 4, 5].map((j) => (
                <Skeleton key={j} className="h-8 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Card 1: Ranking EBITDA */}
      <Card className="quantum-card">
        <CardHeader>
          <CardTitle className="quantum-header flex items-center gap-2">
            <Target className="h-4 w-4" strokeWidth={1.5} />
            TOP EBITDA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rankings.byEBITDA.slice(0, 5).map((item, idx) => (
            <div key={item.centroCode} className="flex items-center justify-between group hover:bg-accent/10 rounded-lg p-2 -mx-2 transition-all">
              <div className="flex items-center gap-3">
                <div className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                  ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : 
                    idx === 1 ? 'bg-gray-100 text-gray-700' : 
                    idx === 2 ? 'bg-orange-100 text-orange-700' : 
                    'bg-muted text-muted-foreground'}
                `}>
                  {idx + 1}
                </div>
                <span className="text-sm font-normal">{item.centroName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium tabular-nums">{item.value.toFixed(1)}%</span>
                {item.badge === "up" && (
                  <TrendingUp className="h-3 w-3 text-success" strokeWidth={2} />
                )}
                {item.badge === "down" && (
                  <TrendingDown className="h-3 w-3 text-destructive" strokeWidth={2} />
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Card 2: Ranking Labor (menor es mejor) */}
      <Card className="quantum-card">
        <CardHeader>
          <CardTitle className="quantum-header flex items-center gap-2">
            <Users className="h-4 w-4" strokeWidth={1.5} />
            MEJOR LABOR %
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rankings.byLabor.slice(0, 5).map((item, idx) => (
            <div key={item.centroCode} className="flex items-center justify-between group hover:bg-accent/10 rounded-lg p-2 -mx-2 transition-all">
              <div className="flex items-center gap-3">
                <div className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                  ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : 
                    idx === 1 ? 'bg-gray-100 text-gray-700' : 
                    idx === 2 ? 'bg-orange-100 text-orange-700' : 
                    'bg-muted text-muted-foreground'}
                `}>
                  {idx + 1}
                </div>
                <span className="text-sm font-normal">{item.centroName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium tabular-nums">{item.value.toFixed(1)}%</span>
                {item.badge === "up" && (
                  <TrendingDown className="h-3 w-3 text-destructive" strokeWidth={2} />
                )}
                {item.badge === "down" && (
                  <TrendingUp className="h-3 w-3 text-success" strokeWidth={2} />
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Card 3: Ranking Margen */}
      <Card className="quantum-card">
        <CardHeader>
          <CardTitle className="quantum-header flex items-center gap-2">
            <TrendingUp className="h-4 w-4" strokeWidth={1.5} />
            TOP MARGEN NETO
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rankings.byMargin.slice(0, 5).map((item, idx) => (
            <div key={item.centroCode} className="flex items-center justify-between group hover:bg-accent/10 rounded-lg p-2 -mx-2 transition-all">
              <div className="flex items-center gap-3">
                <div className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                  ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : 
                    idx === 1 ? 'bg-gray-100 text-gray-700' : 
                    idx === 2 ? 'bg-orange-100 text-orange-700' : 
                    'bg-muted text-muted-foreground'}
                `}>
                  {idx + 1}
                </div>
                <span className="text-sm font-normal">{item.centroName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium tabular-nums">{item.value.toFixed(1)}%</span>
                {item.badge === "up" && (
                  <TrendingUp className="h-3 w-3 text-success" strokeWidth={2} />
                )}
                {item.badge === "down" && (
                  <TrendingDown className="h-3 w-3 text-destructive" strokeWidth={2} />
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
