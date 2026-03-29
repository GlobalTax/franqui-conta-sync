

# Plan: Limpiar la vista de roles en la tabla de usuarios admin

## Problema

Cada usuario tiene decenas de roles `gestor - NombreCentro (código)` mostrados como badges individuales, creando una pared de texto ilegible.

## Solución

Agrupar y resumir los roles en la tabla. En vez de mostrar 100+ badges, mostrar un resumen compacto:

```text
Antes:  🛡️ admin  👔 gestor - Esparteros (7)  👔 gestor - Málaga Centro (29)  👔 gestor - Cuatro Caminos (43) ... x100

Después: 🛡️ admin  👔 gestor (97 centros)  [Ver detalle]
```

## Cambios

### `src/pages/admin/UsersManagement.tsx`

1. **Agrupar roles por tipo** antes de renderizar: contar cuántos centros tiene cada rol
2. **Mostrar resumen compacto**: `admin` como badge individual, `gestor (N centros)` como badge con contador
3. **Botón "Ver detalle"** que abre el `EditUserDialog` existente (ya muestra el detalle completo)

Lógica de agrupación:
```tsx
const groupedRoles = {};
user.user_roles?.forEach(r => {
  if (!groupedRoles[r.role]) groupedRoles[r.role] = [];
  groupedRoles[r.role].push(r);
});
// Render: role sin centro → badge simple
//         role con centros → "gestor (N centros)"
```

### `src/components/admin/EditUserDialog.tsx`

4. **Mejorar la lista de centros** en el dialog: añadir scroll y búsqueda cuando hay muchos roles, para que el detalle también sea manejable

## Archivos

| Archivo | Cambio |
|---------|--------|
| `src/pages/admin/UsersManagement.tsx` | Agrupar roles, mostrar resumen compacto |
| `src/components/admin/EditUserDialog.tsx` | Añadir scroll + búsqueda en lista de roles |

