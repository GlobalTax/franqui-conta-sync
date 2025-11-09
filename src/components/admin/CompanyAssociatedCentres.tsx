import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Unlink, AlertCircle } from "lucide-react";
import { useCompanyDetail, AssociatedCentre } from "@/hooks/useCompanyDetail";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Props {
  centres: AssociatedCentre[];
  companyId: string;
}

const CompanyAssociatedCentres = ({ centres, companyId }: Props) => {
  const { dissociateCentre, isDissociating, setPrincipalCentre, isSettingPrincipal } = useCompanyDetail(companyId);

  if (centres.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-2">No hay centros asociados</h3>
          <p className="text-muted-foreground">
            Esta sociedad no tiene centros asociados actualmente.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Los centros pueden estar asociados de dos formas: mediante la tabla <code>centre_companies</code> o 
          mediante el campo <code>company_id</code> en la tabla <code>centres</code>.
        </AlertDescription>
      </Alert>

      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Centros Asociados</h3>
          <p className="text-sm text-muted-foreground">
            Total: {centres.length} centro(s)
          </p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead>Principal</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {centres.map((centre) => (
              <TableRow key={centre.id}>
                <TableCell className="font-mono text-sm">{centre.codigo}</TableCell>
                <TableCell className="font-medium">{centre.nombre}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {centre.ciudad || centre.direccion || "—"}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={centre.source === 'centre_companies' ? 'default' : 'secondary'}>
                    {centre.source === 'centre_companies' ? 'Centre Companies' : 'Company ID'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {centre.es_principal ? (
                    <Badge variant="default" className="gap-1">
                      <Star className="h-3 w-3 fill-current" />
                      Principal
                    </Badge>
                  ) : centre.source === 'centre_companies' ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPrincipalCentre(centre.id)}
                      disabled={isSettingPrincipal}
                    >
                      <Star className="h-3 w-3 mr-1" />
                      Marcar
                    </Button>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={centre.activo ? "default" : "secondary"}>
                    {centre.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isDissociating}
                      >
                        <Unlink className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Desasociar Centro</AlertDialogTitle>
                        <AlertDialogDescription>
                          ¿Estás seguro de que quieres desasociar el centro <strong>{centre.nombre}</strong> de esta sociedad?
                          <br /><br />
                          {centre.source === 'centre_companies' ? (
                            <>Se marcará como inactivo en <code>centre_companies</code>.</>
                          ) : (
                            <>Se eliminará la referencia en <code>centres.company_id</code>.</>
                          )}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => dissociateCentre(centre.id)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Desasociar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default CompanyAssociatedCentres;
