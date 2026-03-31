
Objetivo: dejar de depender de un `.env` ausente para que la app vuelva a arrancar de forma estable en Lovable.

Qué he encontrado:
- El error real sigue siendo `supabaseUrl is required`.
- En el estado actual del repo hay `.env.example`, pero no aparece `.env` en la raíz.
- `src/integrations/supabase/client.ts` sigue usando:
  - `import.meta.env.VITE_SUPABASE_URL`
  - `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY`
- Eso encaja exactamente con la pantalla en blanco: el cliente Supabase explota al importar `App.tsx`, antes de renderizar nada.
- Los warnings de `react-hotkeys-hook` no bloquean la carga; son ruido secundario.

Solución propuesta:
1. Corregir la inicialización de Supabase en frontend
   - Cambiar `src/integrations/supabase/client.ts` para usar valores fijos del proyecto:
     - URL: `https://srwnjnrhxzcpftmbbyib.supabase.co`
     - Publishable key: la anon key pública ya conocida del proyecto
   - Añadir una guardia explícita con mensaje claro por si faltara algo en el futuro.

2. Eliminar la segunda dependencia crítica de `import.meta.env`
   - Actualizar `src/lib/migration/migrationTracking.ts` para reutilizar el cliente/base de Supabase sin depender de `VITE_SUPABASE_URL` ni `VITE_SUPABASE_PUBLISHABLE_KEY`.
   - Así evitamos otro crash silencioso en módulos que usan fetch directo al REST API.

3. Alinear la documentación interna
   - `docs/SUPABASE_CONFIG.md` ya dice que en Lovable este proyecto debe usar valores hardcodeados en `client.ts`.
   - Lo dejaría coherente con la implementación real para que no vuelva a romperse en futuras ediciones.

4. Revisión rápida de arranque
   - Verificar que no quedan referencias críticas a `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` fuera de casos opcionales como Ponto.
   - Confirmar que el flujo queda así:

```text
App arranca
→ se crea cliente Supabase
→ getSession() responde
→ renderiza login o dashboard
```

Archivos a tocar:
- `src/integrations/supabase/client.ts`
- `src/lib/migration/migrationTracking.ts`
- opcional: `docs/SUPABASE_CONFIG.md`

Resultado esperado:
- desaparece la pantalla en blanco
- deja de aparecer `supabaseUrl is required`
- la app vuelve a cargar aunque `.env` no exista o se regenere mal
