

# Plan: Añadir redirección `/facturas` → `/invoices`

## Problema
La ruta `/facturas` no tiene ningún componente asignado. Existe `/facturas/emitidas`, `/facturas/nueva`, `/facturas/:id`, etc., pero no `/facturas` base, por lo que muestra 404.

## Solución
Añadir una línea de redirect en `src/App.tsx` antes de las rutas `/facturas/*`:

```tsx
<Route path="/facturas" element={<Navigate to="/invoices" replace />} />
```

Esto redirigirá `/facturas` al listado principal de facturas recibidas.

## Archivo
- **`src/App.tsx`** — añadir 1 línea (redirect) antes de la línea 185

## Nota sobre los otros errores
- El **CORS en `v_user_centres`** y el **400 de `pl-rubric-breakdown`** son problemas del backend/Supabase, no del frontend. Si quieres que los investigue después, dímelo.

