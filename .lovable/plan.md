

# Fix: Pantalla en blanco — archivo `.env` eliminado

## Causa raíz

El error en consola es:
```
Error: supabaseUrl is required.
```

El archivo `.env` **ya no existe** en el proyecto. Sin él, `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` son `undefined`, y el cliente Supabase no puede inicializarse. Esto rompe toda la aplicación antes de que renderice nada.

## Solución

Recrear el archivo `.env` con los valores correctos del proyecto (que ya conocemos del historial):

```env
VITE_SUPABASE_PROJECT_ID="srwnjnrhxzcpftmbbyib"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyd25qbnJoeHpjcGZ0bWJieWliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMzY1NjMsImV4cCI6MjA2ODkxMjU2M30.JCQDhjjtXKrPCDV8QRYJmmJ6n9YxMtBPfUm8E52UbI4"
VITE_SUPABASE_URL="https://srwnjnrhxzcpftmbbyib.supabase.co"
```

## Archivo

| Archivo | Cambio |
|---------|--------|
| `.env` | Recrear con las 3 variables de Supabase |

## Resultado

La app volverá a funcionar inmediatamente tras restaurar el archivo.

