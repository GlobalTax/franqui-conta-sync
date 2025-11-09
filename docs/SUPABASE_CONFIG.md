# Configuración de Supabase en Lovable

## 📋 Resumen

Este documento explica cómo configurar correctamente Supabase en proyectos Lovable, que difiere de proyectos Vite estándar.

---

## ✅ Cliente Frontend (Correcto)

### Ubicación: `src/integrations/supabase/client.ts`

```typescript
const SUPABASE_URL = "https://srwnjnrhxzcpftmbbyib.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

export const supabase = createClient<Database>(
  SUPABASE_URL, 
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);
```

**✅ Características:**
- URLs **hardcodeadas** directamente en el código
- Anon key **pública** (segura para frontend)
- No requiere variables de entorno `VITE_*`

---

## ✅ Edge Functions (Correcto)

### Ubicación: `supabase/functions/*/index.ts`

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
```

**✅ Características:**
- Usar `Deno.env.get()` para acceder a secrets
- Service Role Key almacenada en **Supabase Secrets** (no en código)
- Configurar secrets en: [Supabase Dashboard → Settings → Edge Functions](https://supabase.com/dashboard/project/srwnjnrhxzcpftmbbyib/settings/functions)

### Secrets Necesarios para Edge Functions

```bash
SUPABASE_URL=https://srwnjnrhxzcpftmbbyib.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<tu_service_role_key>
```

**Cómo agregar secrets:**
1. Usar el tool `secrets--add_secret` en Lovable
2. O configurarlos manualmente en Supabase Dashboard

---

## ❌ NO Usar Variables VITE_*

### ⚠️ Incompatible con Lovable

```typescript
// ❌ INCORRECTO - NO SOPORTADO EN LOVABLE
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

**Razones:**
- Lovable **no soporta** variables `VITE_*` en el código
- Estas son para proyectos Vite estándar, no Lovable
- El archivo `.env` existe pero **no se usa** para Supabase client

---

## 📊 Comparación: Lovable vs Vite Estándar

| Aspecto | Lovable | Vite Estándar |
|---------|---------|---------------|
| **Cliente Frontend** | Hardcoded en `client.ts` | `import.meta.env.VITE_*` |
| **Edge Functions** | `Deno.env.get()` + Secrets | Variables de entorno |
| **Anon Key** | Público en código | Público en `.env` |
| **Service Role Key** | Supabase Secrets | `.env` local |
| **Deploy** | Automático | Manual con CLI |

---

## 🔐 Seguridad

### Claves Públicas (Frontend)
- ✅ `SUPABASE_URL` → OK hardcodear
- ✅ `SUPABASE_PUBLISHABLE_KEY` (anon) → OK hardcodear
- 🔓 Estas claves están protegidas por **RLS policies**

### Claves Privadas (Backend)
- ❌ `SUPABASE_SERVICE_ROLE_KEY` → **NUNCA** en código frontend
- ✅ Solo en Edge Functions con `Deno.env.get()`
- ✅ Almacenar en **Supabase Secrets**

---

## 🚀 Workflow de Desarrollo

### 1. Configuración Inicial
```typescript
// Ya configurado en src/integrations/supabase/client.ts
// No requiere cambios
```

### 2. Crear Edge Function
```bash
# La función se crea en supabase/functions/mi-funcion/index.ts
# Deploy es AUTOMÁTICO en Lovable
```

### 3. Agregar Secrets (si necesario)
```typescript
// Usar tool: secrets--add_secret
// O Dashboard: https://supabase.com/dashboard/project/srwnjnrhxzcpftmbbyib/settings/functions
```

### 4. Llamar Edge Function desde Frontend
```typescript
import { supabase } from '@/integrations/supabase/client';

const { data, error } = await supabase.functions.invoke('mi-funcion', {
  body: { param: 'value' }
});
```

---

## 📚 Referencias

- [Lovable Docs - Supabase](https://docs.lovable.dev/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Secrets Management](https://supabase.com/docs/guides/functions/secrets)
- [Proyecto Actual - Edge Functions](https://supabase.com/dashboard/project/srwnjnrhxzcpftmbbyib/functions)

---

## ✅ Checklist de Configuración

- [x] Cliente frontend con URLs hardcodeadas
- [x] Anon key pública en `client.ts`
- [x] Edge Functions usan `Deno.env.get()`
- [x] Service Role Key en Supabase Secrets
- [x] NO usar variables `VITE_*`
- [x] Deploy automático configurado
- [x] RLS policies activas

---

**Última actualización:** 2025-01-09  
**Proyecto ID:** `srwnjnrhxzcpftmbbyib`
