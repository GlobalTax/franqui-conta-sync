

# Plan: Redefinir roles — la asesoría es el Admin

## Modelo correcto

| Rol | Quién es | Acceso |
|-----|----------|--------|
| **admin** | Personal de la asesoría (despacho contable) | Acceso total, gestión de todo |
| **gestor** | Empleado de la asesoría asignado a ciertos franquiciados | CRUD en sus centros asignados |
| **franquiciado** | Cliente (dueño de restaurantes) | Solo lectura de sus datos |

El rol `asesoria` se elimina — es redundante con `admin`.

## Cambios

### 1. Migración SQL: eliminar `asesoria` del enum y datos

```sql
-- Reasignar user_roles con role='asesoria' → 'admin' (o 'gestor' según contexto)
UPDATE user_roles SET role = 'admin' WHERE role = 'asesoria';
-- Eliminar permisos de asesoria en role_permissions
DELETE FROM role_permissions WHERE role = 'asesoria';
-- Recrear el enum sin 'asesoria'
-- (ALTER TYPE ... DROP VALUE no existe en Postgres, hay que recrear)
```

Nota: Postgres no permite `DROP VALUE` de un enum directamente. Se necesita recrear el tipo con las columnas dependientes, o simplemente dejar el valor en el enum y no usarlo en la UI (enfoque más seguro y sin downtime).

**Enfoque recomendado**: no tocar el enum (evita riesgo), solo limpiar datos y ocultar en la UI.

### 2. Frontend: eliminar `asesoria` de todos los selectores y labels

| Archivo | Cambio |
|---------|--------|
| `src/pages/admin/RolesManagement.tsx` | Eliminar entrada `asesoria`, actualizar descripciones (admin = "Asesoría — acceso total") |
| `src/pages/admin/UsersManagement.tsx` | Quitar `asesoria` del filtro y de `getRoleBadgeVariant`/`getRoleIcon` |
| `src/components/admin/InviteUserDialog.tsx` | Quitar `asesoria` del select y de `needsFranchisee` |
| `src/components/admin/EditUserDialog.tsx` | Quitar `asesoria` del select |
| `src/components/admin/RolePermissionsEditor.tsx` | Quitar `asesoria` del select |
| `src/components/admin/PermissionsMatrix.tsx` | Quitar `asesoria` del array `ROLES` |
| `src/pages/AcceptInvite.tsx` | Quitar `asesoria` del map de labels |
| `supabase/functions/send-invite/index.ts` | Quitar `asesoria` del map de labels |

### 3. Actualizar descripciones de roles

```
admin  → 🛡️ "Asesoría (Admin)" — Acceso total al sistema, gestión de todos los franquiciados
gestor → 👔 "Gestor" — Empleado de la asesoría con acceso a franquiciados asignados
franquiciado → 🍔 "Franquiciado" — Propietario, ve sus restaurantes en solo lectura
```

### 4. Migración: reasignar roles existentes

```sql
UPDATE user_roles SET role = 'admin' WHERE role = 'asesoria';
DELETE FROM role_permissions WHERE role = 'asesoria';
```

## Archivos totales: 8 frontend + 1 edge function + 1 migración

