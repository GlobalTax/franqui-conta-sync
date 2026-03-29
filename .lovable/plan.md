

# Plan: Cambiar redirección `/facturas`

## Cambio

En `src/App.tsx` línea 185, cambiar el destino de la redirección:

```tsx
// Antes
<Route path="/facturas" element={<Navigate to="/invoices" replace />} />

// Después
<Route path="/facturas" element={<Navigate to="/invoices/received" replace />} />
```

Un solo archivo, una sola línea.

