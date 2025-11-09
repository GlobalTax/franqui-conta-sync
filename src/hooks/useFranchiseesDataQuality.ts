import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FranchiseeDuplicate {
  id: string;
  name: string;
  email: string;
  company_tax_id: string;
  duplicates: Array<{
    id: string;
    name: string;
    email: string;
    company_tax_id: string;
  }>;
}

export interface DataQualityIssue {
  franchisee_id: string;
  franchisee_name: string;
  issue_type: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  field: string;
  current_value: string;
}

export interface RelationshipIssue {
  franchisee_id: string;
  franchisee_name: string;
  issue: string;
  centres_count: number;
  companies_count: number;
}

export interface QualityMetrics {
  total_franchisees: number;
  with_duplicates: number;
  with_invalid_email: number;
  with_invalid_cif: number;
  with_nd_values: number;
  without_centres: number;
  without_companies: number;
  quality_score: number;
}

export const useFranchiseesDataQuality = () => {
  return useQuery({
    queryKey: ["franchisees-data-quality"],
    queryFn: async () => {
      // Get all franchisees with counts
      const { data: franchisees, error } = await supabase
        .from("franchisees")
        .select(`
          id,
          name,
          email,
          company_tax_id,
          orquest_business_id,
          orquest_api_key
        `)
        .order("name");

      if (error) throw error;

      // Get centres count per franchisee
      const { data: centresCount, error: centresError } = await supabase
        .from("centres")
        .select("franchisee_id");

      if (centresError) throw centresError;

      // Get companies count per franchisee
      const { data: companiesCount, error: companiesError } = await supabase
        .from("companies")
        .select("franchisee_id");

      if (companiesError) throw companiesError;

      // Process data
      const centresMap = new Map<string, number>();
      centresCount?.forEach(c => {
        if (c.franchisee_id) {
          centresMap.set(c.franchisee_id, (centresMap.get(c.franchisee_id) || 0) + 1);
        }
      });

      const companiesMap = new Map<string, number>();
      companiesCount?.forEach(c => {
        if (c.franchisee_id) {
          companiesMap.set(c.franchisee_id, (companiesMap.get(c.franchisee_id) || 0) + 1);
        }
      });

      // Detect duplicates
      const nameMap = new Map<string, typeof franchisees>();
      const duplicates: FranchiseeDuplicate[] = [];

      franchisees?.forEach(f => {
        const normalizedName = f.name.toLowerCase().trim();
        const existing = nameMap.get(normalizedName) || [];
        nameMap.set(normalizedName, [...existing, f]);
      });

      nameMap.forEach((list, name) => {
        if (list.length > 1) {
          const [main, ...dups] = list;
          duplicates.push({
            id: main.id,
            name: main.name,
            email: main.email,
            company_tax_id: main.company_tax_id,
            duplicates: dups.map(d => ({
              id: d.id,
              name: d.name,
              email: d.email,
              company_tax_id: d.company_tax_id,
            })),
          });
        }
      });

      // Detect data quality issues
      const issues: DataQualityIssue[] = [];
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const cifRegex = /^[A-Z]\d{8}$/i;

      franchisees?.forEach(f => {
        // Invalid email
        if (!f.email || f.email === "#N/D" || !emailRegex.test(f.email)) {
          issues.push({
            franchisee_id: f.id,
            franchisee_name: f.name,
            issue_type: "invalid_email",
            severity: "high",
            description: "Email inválido o faltante",
            field: "email",
            current_value: f.email || "vacío",
          });
        }

        // Email in CIF field
        if (f.company_tax_id && emailRegex.test(f.company_tax_id)) {
          issues.push({
            franchisee_id: f.id,
            franchisee_name: f.name,
            issue_type: "email_in_cif",
            severity: "high",
            description: "Email en campo de CIF",
            field: "company_tax_id",
            current_value: f.company_tax_id,
          });
        }

        // Invalid CIF
        if (f.company_tax_id && !emailRegex.test(f.company_tax_id) && !cifRegex.test(f.company_tax_id) && f.company_tax_id !== "#N/D") {
          issues.push({
            franchisee_id: f.id,
            franchisee_name: f.name,
            issue_type: "invalid_cif",
            severity: "medium",
            description: "CIF con formato inválido",
            field: "company_tax_id",
            current_value: f.company_tax_id,
          });
        }

        // #N/D values
        if (f.name === "#N/D" || f.email === "#N/D" || f.company_tax_id === "#N/D") {
          issues.push({
            franchisee_id: f.id,
            franchisee_name: f.name,
            issue_type: "nd_value",
            severity: "medium",
            description: "Contiene valores #N/D",
            field: [f.name === "#N/D" && "name", f.email === "#N/D" && "email", f.company_tax_id === "#N/D" && "company_tax_id"]
              .filter(Boolean)
              .join(", "),
            current_value: "#N/D",
          });
        }
      });

      // Detect relationship issues
      const relationshipIssues: RelationshipIssue[] = [];

      franchisees?.forEach(f => {
        const centresCount = centresMap.get(f.id) || 0;
        const companiesCount = companiesMap.get(f.id) || 0;

        if (centresCount === 0) {
          relationshipIssues.push({
            franchisee_id: f.id,
            franchisee_name: f.name,
            issue: "Sin centros asociados",
            centres_count: 0,
            companies_count: companiesCount,
          });
        }

        if (companiesCount === 0) {
          relationshipIssues.push({
            franchisee_id: f.id,
            franchisee_name: f.name,
            issue: "Sin sociedades asociadas",
            centres_count: centresCount,
            companies_count: 0,
          });
        }
      });

      // Calculate metrics
      const metrics: QualityMetrics = {
        total_franchisees: franchisees?.length || 0,
        with_duplicates: duplicates.length,
        with_invalid_email: issues.filter(i => i.issue_type === "invalid_email" || i.issue_type === "email_in_cif").length,
        with_invalid_cif: issues.filter(i => i.issue_type === "invalid_cif").length,
        with_nd_values: issues.filter(i => i.issue_type === "nd_value").length,
        without_centres: relationshipIssues.filter(i => i.centres_count === 0).length,
        without_companies: relationshipIssues.filter(i => i.companies_count === 0).length,
        quality_score: 0,
      };

      // Calculate quality score (0-100)
      const totalIssues = metrics.with_duplicates + 
        metrics.with_invalid_email + 
        metrics.with_invalid_cif + 
        metrics.with_nd_values + 
        metrics.without_centres + 
        metrics.without_companies;
      
      metrics.quality_score = Math.max(0, 100 - (totalIssues / metrics.total_franchisees * 100));

      return {
        duplicates,
        issues,
        relationshipIssues,
        metrics,
        franchisees: franchisees?.map(f => ({
          ...f,
          centres_count: centresMap.get(f.id) || 0,
          companies_count: companiesMap.get(f.id) || 0,
        })),
      };
    },
  });
};
