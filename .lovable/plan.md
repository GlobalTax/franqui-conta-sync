

# Plan: Añadir rol "Empleado" (personal del franquiciado) con permisos configurables

## Concepto

Nuevo rol `empleado` — personal del franquiciado (gerente de restaurante, encargado, etc.) que puede acceder al sistema con permisos granulares configurados por el admin. A diferencia del `franquiciado` (solo lectura fija), el empleado tiene permisos selectivos.

## Modelo de roles actualizado

| Rol | Quién | Acceso |
|-----|-------|--------|
| `admin` | Asesoría | Total |
| `gestor` | Empleado asesoría | Centros asignados |
| `franquiciado` | Propietario | Solo lectura sus restaurantes |
| **`empleado`** | **Personal del franquiciado** | **Configurable por el admin** |

## Cambios

### 1. Migración SQL
- Añadir `'empleado'` al enum `app_role` (`ALTER TYPE app_role ADD VALUE 'empleado'`)
- Insertar permisos base para `empleado` en `role_permissions` (por defecto solo vista básica)

### 2. Frontend — 5 archivos

| Archivo | Cambio |
|---------|--------|
| `src/pages/admin/RolesManagement.tsx` | Añadir entrada `empleado` con icono 👤 y descripción |
| `src/components/admin/InviteUserDialog.tsx` | Añadir `empleado` al select de roles + marcar como `needsFranchisee` |
| `src/components/admin/EditUserDialog.tsx` | Añadir `empleado` al select |
| `src/components/admin/RolePermissionsEditor.tsx` | Añadir `empleado` al select (permisos editables con checkboxes) |
| `src/components/admin/PermissionsMatrix.tsx` | Añadir `empleado` al array `ROLES` |
| `src/pages/admin/UsersManagement.tsx` | Añadir badge/icono para `empleado` |
| `src/pages/AcceptInvite.tsx` | Añadir label para `empleado` |
| `supabase/functions/send-invite/index.ts` | Añadir label para `empleado` en el email |

### 3. Permisos configurables

El admin usa el `RolePermissionsEditor` existente para marcar qué puede ver/hacer el rol `empleado`. Por ejemplo:
- ✅ Ver nóminas, ver horarios, ver ausencias
- ❌ Crear/editar/eliminar, importar, exportar, administración

Esto ya funciona con la tabla `role_permissions` y el RPC `has_permission` — solo hay que añadir el rol nuevo al selector.

## Resultado

Al invitar un empleado del franquiciado, el admin:
1. Elige rol "Empleado"
2. Asigna franquiciado + centro(s)
3. Los permisos granulares se configuran desde "Permisos por Rol"

