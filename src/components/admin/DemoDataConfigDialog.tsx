import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DemoDataConfig } from "@/types/demo-config";
import { Building2, Store, Users, Package, Sparkles } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const demoConfigSchema = z.object({
  // Franchisee
  franchisee_name: z.string().min(3, "Mínimo 3 caracteres"),
  franchisee_cif: z.string().regex(/^[A-Z]\d{8}$/, "Formato CIF inválido (ej: B99999999)"),
  franchisee_email: z.string().email("Email inválido"),
  
  // Companies
  company1_razon: z.string().min(3, "Mínimo 3 caracteres"),
  company1_cif: z.string().regex(/^[A-Z]\d{8}$/, "Formato CIF inválido"),
  company1_tipo: z.string(),
  company2_razon: z.string().min(3, "Mínimo 3 caracteres"),
  company2_cif: z.string().regex(/^[A-Z]\d{8}$/, "Formato CIF inválido"),
  company2_tipo: z.string(),
  
  // Centres
  centre1_codigo: z.string().min(4, "Mínimo 4 caracteres"),
  centre1_nombre: z.string().min(3, "Mínimo 3 caracteres"),
  centre1_direccion: z.string().min(5, "Mínimo 5 caracteres"),
  centre1_ciudad: z.string().min(2, "Mínimo 2 caracteres"),
  centre1_postal: z.string().min(5, "Código postal inválido"),
  centre1_state: z.string().min(2, "Mínimo 2 caracteres"),
  centre1_opening: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato: YYYY-MM-DD"),
  centre1_seats: z.coerce.number().min(10).max(500),
  centre1_sqm: z.coerce.number().min(50).max(2000),
  centre1_company: z.coerce.number().min(0).max(1),
  
  centre2_codigo: z.string().min(4, "Mínimo 4 caracteres"),
  centre2_nombre: z.string().min(3, "Mínimo 3 caracteres"),
  centre2_direccion: z.string().min(5, "Mínimo 5 caracteres"),
  centre2_ciudad: z.string().min(2, "Mínimo 2 caracteres"),
  centre2_postal: z.string().min(5, "Código postal inválido"),
  centre2_state: z.string().min(2, "Mínimo 2 caracteres"),
  centre2_opening: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato: YYYY-MM-DD"),
  centre2_seats: z.coerce.number().min(10).max(500),
  centre2_sqm: z.coerce.number().min(50).max(2000),
  centre2_company: z.coerce.number().min(0).max(1),
  
  centre3_codigo: z.string().min(4, "Mínimo 4 caracteres"),
  centre3_nombre: z.string().min(3, "Mínimo 3 caracteres"),
  centre3_direccion: z.string().min(5, "Mínimo 5 caracteres"),
  centre3_ciudad: z.string().min(2, "Mínimo 2 caracteres"),
  centre3_postal: z.string().min(5, "Código postal inválido"),
  centre3_state: z.string().min(2, "Mínimo 2 caracteres"),
  centre3_opening: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato: YYYY-MM-DD"),
  centre3_seats: z.coerce.number().min(10).max(500),
  centre3_sqm: z.coerce.number().min(50).max(2000),
  centre3_company: z.coerce.number().min(0).max(1),
  
  centre4_codigo: z.string().min(4, "Mínimo 4 caracteres"),
  centre4_nombre: z.string().min(3, "Mínimo 3 caracteres"),
  centre4_direccion: z.string().min(5, "Mínimo 5 caracteres"),
  centre4_ciudad: z.string().min(2, "Mínimo 2 caracteres"),
  centre4_postal: z.string().min(5, "Código postal inválido"),
  centre4_state: z.string().min(2, "Mínimo 2 caracteres"),
  centre4_opening: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato: YYYY-MM-DD"),
  centre4_seats: z.coerce.number().min(10).max(500),
  centre4_sqm: z.coerce.number().min(50).max(2000),
  centre4_company: z.coerce.number().min(0).max(1),
  
  // Suppliers
  supplier1_name: z.string().min(3, "Mínimo 3 caracteres"),
  supplier1_cif: z.string().regex(/^[A-Z]\d{8}$/, "Formato CIF inválido"),
  supplier2_name: z.string().min(3, "Mínimo 3 caracteres"),
  supplier2_cif: z.string().regex(/^[A-Z]\d{8}$/, "Formato CIF inválido"),
  supplier3_name: z.string().min(3, "Mínimo 3 caracteres"),
  supplier3_cif: z.string().regex(/^[A-Z]\d{8}$/, "Formato CIF inválido"),
});

type DemoConfigFormData = z.infer<typeof demoConfigSchema>;

interface DemoDataConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: DemoDataConfig;
  onGenerate: (config: DemoDataConfig) => void;
}

export function DemoDataConfigDialog({
  open,
  onOpenChange,
  config,
  onGenerate,
}: DemoDataConfigDialogProps) {
  const [activeTab, setActiveTab] = useState("franchisee");

  const form = useForm<DemoConfigFormData>({
    resolver: zodResolver(demoConfigSchema),
    defaultValues: {
      // Franchisee
      franchisee_name: config.franchisee.name,
      franchisee_cif: config.franchisee.company_tax_id,
      franchisee_email: config.franchisee.email,
      
      // Companies
      company1_razon: config.companies[0].razon_social,
      company1_cif: config.companies[0].cif,
      company1_tipo: config.companies[0].tipo_sociedad,
      company2_razon: config.companies[1].razon_social,
      company2_cif: config.companies[1].cif,
      company2_tipo: config.companies[1].tipo_sociedad,
      
      // Centres
      centre1_codigo: config.centres[0].codigo,
      centre1_nombre: config.centres[0].nombre,
      centre1_direccion: config.centres[0].direccion,
      centre1_ciudad: config.centres[0].ciudad,
      centre1_postal: config.centres[0].postal_code,
      centre1_state: config.centres[0].state,
      centre1_opening: config.centres[0].opening_date,
      centre1_seats: config.centres[0].seating_capacity,
      centre1_sqm: config.centres[0].square_meters,
      centre1_company: config.centres[0].company_index,
      
      centre2_codigo: config.centres[1].codigo,
      centre2_nombre: config.centres[1].nombre,
      centre2_direccion: config.centres[1].direccion,
      centre2_ciudad: config.centres[1].ciudad,
      centre2_postal: config.centres[1].postal_code,
      centre2_state: config.centres[1].state,
      centre2_opening: config.centres[1].opening_date,
      centre2_seats: config.centres[1].seating_capacity,
      centre2_sqm: config.centres[1].square_meters,
      centre2_company: config.centres[1].company_index,
      
      centre3_codigo: config.centres[2].codigo,
      centre3_nombre: config.centres[2].nombre,
      centre3_direccion: config.centres[2].direccion,
      centre3_ciudad: config.centres[2].ciudad,
      centre3_postal: config.centres[2].postal_code,
      centre3_state: config.centres[2].state,
      centre3_opening: config.centres[2].opening_date,
      centre3_seats: config.centres[2].seating_capacity,
      centre3_sqm: config.centres[2].square_meters,
      centre3_company: config.centres[2].company_index,
      
      centre4_codigo: config.centres[3].codigo,
      centre4_nombre: config.centres[3].nombre,
      centre4_direccion: config.centres[3].direccion,
      centre4_ciudad: config.centres[3].ciudad,
      centre4_postal: config.centres[3].postal_code,
      centre4_state: config.centres[3].state,
      centre4_opening: config.centres[3].opening_date,
      centre4_seats: config.centres[3].seating_capacity,
      centre4_sqm: config.centres[3].square_meters,
      centre4_company: config.centres[3].company_index,
      
      // Suppliers
      supplier1_name: config.suppliers[0].name,
      supplier1_cif: config.suppliers[0].tax_id,
      supplier2_name: config.suppliers[1].name,
      supplier2_cif: config.suppliers[1].tax_id,
      supplier3_name: config.suppliers[2].name,
      supplier3_cif: config.suppliers[2].tax_id,
    },
  });

  const onSubmit = (data: DemoConfigFormData) => {
    const newConfig: DemoDataConfig = {
      franchisee: {
        name: data.franchisee_name,
        company_tax_id: data.franchisee_cif,
        email: data.franchisee_email,
      },
      companies: [
        {
          razon_social: data.company1_razon,
          cif: data.company1_cif,
          tipo_sociedad: data.company1_tipo,
        },
        {
          razon_social: data.company2_razon,
          cif: data.company2_cif,
          tipo_sociedad: data.company2_tipo,
        },
      ],
      centres: [
        {
          codigo: data.centre1_codigo,
          nombre: data.centre1_nombre,
          direccion: data.centre1_direccion,
          ciudad: data.centre1_ciudad,
          postal_code: data.centre1_postal,
          state: data.centre1_state,
          pais: "España",
          opening_date: data.centre1_opening,
          seating_capacity: data.centre1_seats,
          square_meters: data.centre1_sqm,
          company_index: data.centre1_company,
        },
        {
          codigo: data.centre2_codigo,
          nombre: data.centre2_nombre,
          direccion: data.centre2_direccion,
          ciudad: data.centre2_ciudad,
          postal_code: data.centre2_postal,
          state: data.centre2_state,
          pais: "España",
          opening_date: data.centre2_opening,
          seating_capacity: data.centre2_seats,
          square_meters: data.centre2_sqm,
          company_index: data.centre2_company,
        },
        {
          codigo: data.centre3_codigo,
          nombre: data.centre3_nombre,
          direccion: data.centre3_direccion,
          ciudad: data.centre3_ciudad,
          postal_code: data.centre3_postal,
          state: data.centre3_state,
          pais: "España",
          opening_date: data.centre3_opening,
          seating_capacity: data.centre3_seats,
          square_meters: data.centre3_sqm,
          company_index: data.centre3_company,
        },
        {
          codigo: data.centre4_codigo,
          nombre: data.centre4_nombre,
          direccion: data.centre4_direccion,
          ciudad: data.centre4_ciudad,
          postal_code: data.centre4_postal,
          state: data.centre4_state,
          pais: "España",
          opening_date: data.centre4_opening,
          seating_capacity: data.centre4_seats,
          square_meters: data.centre4_sqm,
          company_index: data.centre4_company,
        },
      ],
      suppliers: [
        { name: data.supplier1_name, tax_id: data.supplier1_cif },
        { name: data.supplier2_name, tax_id: data.supplier2_cif },
        { name: data.supplier3_name, tax_id: data.supplier3_cif },
      ],
    };

    onGenerate(newConfig);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Configurar Datos Demo
          </DialogTitle>
          <DialogDescription>
            Personaliza los datos que se generarán para el entorno de demostración
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="franchisee" className="gap-2">
                  <Users className="h-3.5 w-3.5" />
                  Grupo
                </TabsTrigger>
                <TabsTrigger value="companies" className="gap-2">
                  <Building2 className="h-3.5 w-3.5" />
                  Sociedades
                </TabsTrigger>
                <TabsTrigger value="centres" className="gap-2">
                  <Store className="h-3.5 w-3.5" />
                  Centros
                </TabsTrigger>
                <TabsTrigger value="suppliers" className="gap-2">
                  <Package className="h-3.5 w-3.5" />
                  Proveedores
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[50vh] mt-4 pr-4">
                {/* TAB: Franchisee */}
                <TabsContent value="franchisee" className="space-y-4">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="franchisee_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre del Grupo</FormLabel>
                          <FormControl>
                            <Input placeholder="Grupo Demo McDonald's" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="franchisee_cif"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CIF del Grupo</FormLabel>
                          <FormControl>
                            <Input placeholder="B99999999" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="franchisee_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="demo@mcdonalds-group.es" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* TAB: Companies */}
                <TabsContent value="companies" className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-muted-foreground">Sociedad 1</h4>
                    <FormField
                      control={form.control}
                      name="company1_razon"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Razón Social</FormLabel>
                          <FormControl>
                            <Input placeholder="Demo Restaurantes Madrid SL" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="company1_cif"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CIF</FormLabel>
                            <FormControl>
                              <Input placeholder="B88888888" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="company1_tipo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo Sociedad</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="SL">SL</SelectItem>
                                <SelectItem value="SA">SA</SelectItem>
                                <SelectItem value="SLU">SLU</SelectItem>
                                <SelectItem value="SAU">SAU</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-muted-foreground">Sociedad 2</h4>
                    <FormField
                      control={form.control}
                      name="company2_razon"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Razón Social</FormLabel>
                          <FormControl>
                            <Input placeholder="Demo Food Services Barcelona SL" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="company2_cif"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CIF</FormLabel>
                            <FormControl>
                              <Input placeholder="B77777777" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="company2_tipo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo Sociedad</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="SL">SL</SelectItem>
                                <SelectItem value="SA">SA</SelectItem>
                                <SelectItem value="SLU">SLU</SelectItem>
                                <SelectItem value="SAU">SAU</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* TAB: Centres */}
                <TabsContent value="centres" className="space-y-6">
                  {[1, 2, 3, 4].map((num) => (
                    <div key={num} className="space-y-4">
                      <h4 className="font-medium text-sm text-muted-foreground">Centro {num}</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`centre${num}_codigo` as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Código</FormLabel>
                              <FormControl>
                                <Input placeholder={`DEMO-00${num}`} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`centre${num}_nombre` as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nombre</FormLabel>
                              <FormControl>
                                <Input placeholder="McDonald's Gran Vía" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name={`centre${num}_direccion` as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dirección</FormLabel>
                            <FormControl>
                              <Input placeholder="Gran Vía 28" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name={`centre${num}_ciudad` as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ciudad</FormLabel>
                              <FormControl>
                                <Input placeholder="Madrid" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`centre${num}_state` as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Provincia</FormLabel>
                              <FormControl>
                                <Input placeholder="Madrid" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`centre${num}_postal` as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>CP</FormLabel>
                              <FormControl>
                                <Input placeholder="28013" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name={`centre${num}_opening` as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fecha Apertura</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`centre${num}_seats` as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Plazas</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="120" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`centre${num}_sqm` as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>m²</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="350" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name={`centre${num}_company` as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pertenece a</FormLabel>
                            <Select onValueChange={(val) => field.onChange(Number(val))} defaultValue={String(field.value)}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar sociedad" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="0">Sociedad 1</SelectItem>
                                <SelectItem value="1">Sociedad 2</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {num < 4 && <Separator />}
                    </div>
                  ))}
                </TabsContent>

                {/* TAB: Suppliers */}
                <TabsContent value="suppliers" className="space-y-6">
                  {[1, 2, 3].map((num) => (
                    <div key={num} className="space-y-4">
                      <h4 className="font-medium text-sm text-muted-foreground">Proveedor {num}</h4>
                      <FormField
                        control={form.control}
                        name={`supplier${num}_name` as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre</FormLabel>
                            <FormControl>
                              <Input placeholder="Proveedores Demo SA" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`supplier${num}_cif` as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CIF</FormLabel>
                            <FormControl>
                              <Input placeholder="B11111111" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {num < 3 && <Separator />}
                    </div>
                  ))}
                </TabsContent>
              </ScrollArea>
            </Tabs>

            <DialogFooter className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Generar Datos Demo
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
