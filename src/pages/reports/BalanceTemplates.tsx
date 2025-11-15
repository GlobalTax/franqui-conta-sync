import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useBalanceSheetTemplates } from "@/hooks/useBalanceSheetCustom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function BalanceTemplates() {
  const { data: templates, isLoading } = useBalanceSheetTemplates();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plantillas de Balance"
        subtitle="Gestión de plantillas personalizadas para reportes de balance"
        breadcrumbs={[
          { label: "Informes", href: "/reports" },
          { label: "Plantillas de Balance" },
        ]}
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Plantilla
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Plantillas Disponibles</CardTitle>
          <CardDescription>
            Configure rubros y reglas de mapeo personalizadas para sus reportes de balance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Cargando plantillas...
                  </TableCell>
                </TableRow>
              ) : templates && templates.length > 0 ? (
                templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-mono">{template.code}</TableCell>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {template.description || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={template.is_active ? "default" : "secondary"}>
                        {template.is_active ? "Activa" : "Inactiva"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No hay plantillas disponibles
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
