

# Fix: Restaurar `.env` (borrado de nuevo)

## Problema
El archivo `.env` no existe en el proyecto. Sin él, `import.meta.env.VITE_SUPABASE_URL` devuelve `undefined` → el cliente Supabase falla → pantalla en blanco.

## Solución
Recrear `.env` con los valores conocidos del proyecto:

```env
VITE_SUPABASE_PROJECT_ID="srwnjnrhxzcpftmbbyib"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyd25qbnJoeHpjcGZ0bWJieWliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMzY1NjMsImV4cCI6MjA2ODkxMjU2M30.JCQDhjjtXKrPCDV8QRYJmmJ6n9YxMtBPfUm8E52UbI4"
VITE_SUPABASE_URL="https://srwnjnrhxzcpftmbbyib.supabase.co"
```

## Archivo

| Archivo | Cambio |
|---------|--------|
| `.env` | Recrear con las 3 variables de Supabase |

## Nota
Este archivo se ha borrado varias veces durante ediciones anteriores. El error de WebAssembly (`CompileError`) que aparece en los logs es del entorno sandbox de Lovable, no de tu código — es inofensivo. El único error real es el de Supabase.

