export interface DemoFranchiseeConfig {
  name: string;
  company_tax_id: string;
  email: string;
}

export interface DemoCompanyConfig {
  razon_social: string;
  cif: string;
  tipo_sociedad: string;
}

export interface DemoCentreConfig {
  codigo: string;
  nombre: string;
  direccion: string;
  ciudad: string;
  postal_code: string;
  state: string;
  pais: string;
  opening_date: string;
  seating_capacity: number;
  square_meters: number;
  company_index: number; // 0 or 1 to reference which company it belongs to
}

export interface DemoSupplierConfig {
  name: string;
  tax_id: string;
}

export interface DemoDataConfig {
  franchisee: DemoFranchiseeConfig;
  companies: DemoCompanyConfig[];
  centres: DemoCentreConfig[];
  suppliers: DemoSupplierConfig[];
}

export const getDefaultDemoConfig = (): DemoDataConfig => ({
  franchisee: {
    name: "Grupo Demo McDonald's",
    company_tax_id: "B99999999",
    email: "demo@mcdonalds-group.es",
  },
  companies: [
    {
      razon_social: "Demo Restaurantes Madrid SL",
      cif: "B88888888",
      tipo_sociedad: "SL",
    },
    {
      razon_social: "Demo Food Services Barcelona SL",
      cif: "B77777777",
      tipo_sociedad: "SL",
    },
  ],
  centres: [
    {
      codigo: "DEMO-001",
      nombre: "McDonald's Gran Vía",
      direccion: "Gran Vía 28",
      ciudad: "Madrid",
      postal_code: "28013",
      state: "Madrid",
      pais: "España",
      opening_date: "2020-01-15",
      seating_capacity: 120,
      square_meters: 350,
      company_index: 0,
    },
    {
      codigo: "DEMO-002",
      nombre: "McDonald's Castellana",
      direccion: "Paseo de la Castellana 120",
      ciudad: "Madrid",
      postal_code: "28046",
      state: "Madrid",
      pais: "España",
      opening_date: "2019-06-20",
      seating_capacity: 80,
      square_meters: 280,
      company_index: 0,
    },
    {
      codigo: "DEMO-003",
      nombre: "McDonald's Diagonal Barcelona",
      direccion: "Avinguda Diagonal 500",
      ciudad: "Barcelona",
      postal_code: "08006",
      state: "Barcelona",
      pais: "España",
      opening_date: "2018-03-10",
      seating_capacity: 100,
      square_meters: 320,
      company_index: 1,
    },
    {
      codigo: "DEMO-004",
      nombre: "McDonald's La Maquinista",
      direccion: "CC La Maquinista, Potosí 2",
      ciudad: "Barcelona",
      postal_code: "08030",
      state: "Barcelona",
      pais: "España",
      opening_date: "2021-11-05",
      seating_capacity: 150,
      square_meters: 400,
      company_index: 1,
    },
  ],
  suppliers: [
    { name: "Proveedores Demo SA", tax_id: "B11111111" },
    { name: "Distribuciones Demo SL", tax_id: "B22222222" },
    { name: "Servicios Demo Group", tax_id: "B33333333" },
  ],
});
