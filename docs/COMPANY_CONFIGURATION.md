# Configuración de Empresas - Documentación Técnica

## 📋 Índice
1. [Funcionalidades Implementadas](#funcionalidades-implementadas)
2. [Estructura de Base de Datos](#estructura-de-base-de-datos)
3. [Seguridad y Permisos RLS](#seguridad-y-permisos-rls)
4. [Roles y Permisos](#roles-y-permisos)
5. [Testing Manual](#testing-manual)
6. [Queries de Verificación](#queries-de-verificación)
7. [Dependencias](#dependencias)
8. [Próximos Pasos](#próximos-pasos)

---

## 🎯 Funcionalidades Implementadas

### Tab 1: Datos de la Empresa ✅

#### Identificación de la Empresa
- **Código de empresa**: Campo opcional para código interno
- **País Domicilio Fiscal**: Código ISO de 2 caracteres (por defecto: ES)
- **NIF/CIF/NIE**: 
  - Validación en tiempo real según algoritmo oficial español
  - Soporte para NIF (8 dígitos + letra)
  - Soporte para NIE (X/Y/Z + 7 dígitos + letra)
  - Soporte para CIF (letra + 7 dígitos + dígito/letra)
  - Mensajes de error descriptivos
- **Razón Social**: Campo obligatorio con validación
- **Tipo Entidad**: Selector con opciones (Persona Jurídica, Persona Física, Autónomo)

#### Dirección Fiscal
- **Búsqueda inteligente de ubicaciones**:
  - Por código postal (ej: `08010`)
  - Por nombre de municipio (ej: `Barcelona`)
  - Por provincia (ej: `Barcelona`)
  - Autocompletado con provincias y municipios de España
- **Campos de dirección completos**:
  - Tipo de vía (Calle, Avenida, Plaza, etc.)
  - Vía pública (obligatorio)
  - Número
  - Escalera
  - Piso
  - Puerta
  - Código Postal (obligatorio, validación de 5 dígitos)
  - Población (seleccionable mediante búsqueda)
- **Display de ubicación**: Formato `CP - Municipio` (ej: `08010 - Barcelona`)

#### Dirección Social
- Mismos campos que dirección fiscal
- **Botón "Copiar de Dirección Fiscal"**: Copia todos los campos con un clic
- Feedback con toast de confirmación

#### Datos de Contacto
- **Teléfonos**: 4 campos numéricos opcionales
- **Nombre de contacto**: Texto libre opcional
- **Email**: Validación de formato de email

### Mejoras UX Implementadas ✅

1. **Confirmación al salir sin guardar**
   - Detección automática de cambios en el formulario (`isDirty`)
   - Diálogo nativo del navegador al intentar salir con cambios sin guardar
   - Previene pérdida accidental de datos

2. **Skeleton Loading Profesional**
   - Reemplaza spinner básico con skeletons detallados
   - Simula estructura real del formulario durante la carga
   - Mejora percepción de velocidad de carga

3. **Indicadores de Campos Obligatorios**
   - Asterisco rojo (`*`) en campos requeridos:
     - Razón Social
     - Vía pública (direcciones)
     - Código Postal (direcciones)
   - Feedback visual claro para el usuario

### Validaciones Implementadas

- **NIF/CIF/NIE**: Validador oficial español con algoritmo de dígito de control
- **Email**: Validación de formato RFC 5322
- **Código Postal**: Regex `/^\d{5}$/` para formato español
- **Razón Social**: Campo obligatorio no vacío
- **País**: Código ISO 3166-1 alpha-2 (2 caracteres)

---

## 🗄️ Estructura de Base de Datos

### Tabla: `companies`
```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT,
  razon_social TEXT NOT NULL,
  nif_prefix TEXT,
  nif_number TEXT,
  legal_type TEXT DEFAULT 'Persona Jurídica',
  country_fiscal_code TEXT DEFAULT 'ES',
  phone1 TEXT,
  phone2 TEXT,
  phone3 TEXT,
  phone4 TEXT,
  contact_name TEXT,
  email TEXT,
  address_fiscal_id UUID REFERENCES addresses(id),
  address_social_id UUID REFERENCES addresses(id),
  pgc_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Tabla: `addresses`
```sql
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  street_type TEXT,
  street_name TEXT NOT NULL,
  number TEXT,
  staircase TEXT,
  floor TEXT,
  door TEXT,
  postal_code TEXT,
  municipality_id INTEGER REFERENCES municipalities(id),
  province_id INTEGER REFERENCES provinces(id),
  country_code TEXT DEFAULT 'ES',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Catálogos Geográficos

#### Tabla: `countries`
```sql
CREATE TABLE countries (
  code TEXT PRIMARY KEY, -- ISO 3166-1 alpha-2
  name TEXT NOT NULL,
  alpha3 TEXT, -- ISO 3166-1 alpha-3
  numeric_code TEXT,
  eu_member BOOLEAN DEFAULT false
);
```
**Datos**: 20 países principales europeos incluidos (ES, FR, DE, IT, PT, etc.)

#### Tabla: `provinces`
```sql
CREATE TABLE provinces (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE, -- Código INE de 2 dígitos
  name TEXT NOT NULL,
  country_code TEXT DEFAULT 'ES' REFERENCES countries(code)
);
```
**Datos**: 52 provincias españolas (50 + Ceuta + Melilla)

#### Tabla: `municipalities`
```sql
CREATE TABLE municipalities (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE, -- Código INE de 5 dígitos
  name TEXT NOT NULL,
  province_id INTEGER REFERENCES provinces(id)
);
```
**Datos**: Municipios principales de Barcelona y Madrid incluidos

#### Tabla: `postal_codes`
```sql
CREATE TABLE postal_codes (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL, -- 5 dígitos
  municipality_id INTEGER REFERENCES municipalities(id),
  province_id INTEGER REFERENCES provinces(id)
);
```
**Datos**: Códigos postales de Barcelona ciudad, L'Hospitalet y Madrid ciudad

### RPC Function: `search_locations`

```sql
CREATE OR REPLACE FUNCTION search_locations(search_query TEXT)
RETURNS TABLE (
  postal_code TEXT,
  municipality_name TEXT,
  province_name TEXT,
  municipality_id INTEGER,
  province_id INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    pc.code AS postal_code,
    m.name AS municipality_name,
    p.name AS province_name,
    m.id AS municipality_id,
    p.id AS province_id
  FROM postal_codes pc
  JOIN municipalities m ON pc.municipality_id = m.id
  JOIN provinces p ON pc.province_id = p.id
  WHERE
    pc.code ILIKE search_query || '%'
    OR m.name ILIKE '%' || search_query || '%'
    OR p.name ILIKE '%' || search_query || '%'
  ORDER BY pc.code, m.name
  LIMIT 50;
END;
$$ LANGUAGE plpgsql STABLE;
```

---

## 🔒 Seguridad y Permisos RLS

### Políticas RLS en `companies`

```sql
-- Solo ver empresas de tu franquicia (usuarios normales)
CREATE POLICY "users_view_own_franchisee_companies"
ON companies FOR SELECT
USING (
  id IN (
    SELECT company_id FROM centre_companies
    WHERE centre_id IN (
      SELECT centre_id FROM user_centres
      WHERE user_id = auth.uid()
    )
  )
);

-- Admins pueden ver todas
CREATE POLICY "admins_view_all_companies"
ON companies FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
```

### Políticas RLS en `addresses`

```sql
-- Solo ver direcciones vinculadas a empresas accesibles
CREATE POLICY "users_view_company_addresses"
ON addresses FOR SELECT
USING (
  id IN (
    SELECT address_fiscal_id FROM companies
    WHERE ... (same condition as companies)
    UNION
    SELECT address_social_id FROM companies
    WHERE ... (same condition as companies)
  )
);
```

### Políticas RLS en Catálogos Geográficos

```sql
-- Lectura pública para todos los usuarios autenticados
CREATE POLICY "authenticated_read_countries"
ON countries FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "authenticated_read_provinces"
ON provinces FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "authenticated_read_municipalities"
ON municipalities FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "authenticated_read_postal_codes"
ON postal_codes FOR SELECT
TO authenticated
USING (true);
```

---

## 👥 Roles y Permisos

| Rol | Ver Empresas | Editar Empresas | Ver Catálogos | Editar Catálogos |
|-----|--------------|-----------------|---------------|------------------|
| **Admin** | Todas | Todas | Sí | Sí |
| **Controller** | De su franquicia | De su franquicia | Sí | No |
| **Gerente** | De su centro | De su centro | Sí | No |
| **Contabilidad** | De su franquicia | De su franquicia | Sí | No |
| **Tesorería** | De su franquicia | Solo lectura | Sí | No |

---

## 🧪 Testing Manual

### Checklist Funcional Completo

#### 1. Navegación Básica (2 min)
- [ ] Acceder a `/admin/company-configuration`
- [ ] Verificar que se carga la empresa del contexto seleccionado
- [ ] Comprobar que aparece el nombre en el header

#### 2. Carga de Datos Inicial (3 min)
- [ ] Verificar que skeleton loading aparece durante carga
- [ ] Comprobar que los datos se cargan correctamente:
  - [ ] Razón Social poblada
  - [ ] NIF/CIF separado en prefijo y número
  - [ ] Direcciones cargadas (fiscal y social)
  - [ ] Datos de contacto mostrados

#### 3. Validación de Campos Obligatorios (5 min)
- [ ] Borrar "Razón Social" → Intentar guardar → Ver error "obligatorio"
- [ ] Borrar "Vía pública" (fiscal) → Intentar guardar → Ver error
- [ ] Borrar "Código Postal" (fiscal) → Intentar guardar → Ver error
- [ ] Verificar asteriscos rojos (`*`) en los 3 campos obligatorios

#### 4. Validación de NIF/CIF (8 min)
**Casos de prueba**:
- [ ] **CIF válido**: `B67498741` → Debe permitir guardar
- [ ] **CIF inválido**: `B99999999` → Debe mostrar error "CIF inválido"
- [ ] **NIF válido**: `12345678Z` → Debe permitir guardar
- [ ] **NIF inválido**: `12345678A` → Debe mostrar error "NIF inválido"
- [ ] **NIE válido**: `X1234567L` → Debe permitir guardar
- [ ] **NIE inválido**: `X1234567A` → Debe mostrar error "NIE inválido"
- [ ] **Formato incorrecto**: `ABC123` → Debe mostrar error de formato

#### 5. Búsqueda de Ubicaciones (6 min)
- [ ] Click en botón "Buscar" de Dirección Fiscal
- [ ] Buscar por **CP**: `08010` → Ver resultados con "08010 - Barcelona"
- [ ] Buscar por **municipio**: `Hospitalet` → Ver resultados
- [ ] Buscar por **provincia**: `Madrid` → Ver múltiples municipios
- [ ] Seleccionar una ubicación → Verificar que se rellena:
  - [ ] Código Postal
  - [ ] Display de población (`CP - Nombre`)
  - [ ] IDs internos (municipality_id, province_id)

#### 6. Copiar Dirección Fiscal → Social (3 min)
- [ ] Rellenar completamente la dirección fiscal
- [ ] Click en "Copiar de Dirección Fiscal"
- [ ] Verificar que se copian todos los campos:
  - [ ] Tipo de vía
  - [ ] Vía pública
  - [ ] Número, escalera, piso, puerta
  - [ ] Código postal
  - [ ] Población (con display correcto)
- [ ] Ver toast de confirmación "Dirección copiada correctamente"

#### 7. Datos de Contacto (2 min)
- [ ] Rellenar teléfonos (1-4)
- [ ] Rellenar nombre de contacto
- [ ] Rellenar email válido: `test@example.com` → OK
- [ ] Email inválido: `test@` → Ver error "Email inválido"

#### 8. Persistencia de Datos (4 min)
- [ ] Hacer cambios en varios campos
- [ ] Click en "Guardar Cambios"
- [ ] Ver toast de confirmación
- [ ] Refrescar página (F5)
- [ ] Verificar que los cambios persisten

#### 9. Confirmación al Salir sin Guardar (2 min)
- [ ] Hacer cambios en cualquier campo (sin guardar)
- [ ] Intentar cerrar la pestaña o navegar a otra URL
- [ ] Verificar que aparece diálogo de confirmación del navegador
- [ ] Cancelar y guardar cambios
- [ ] Intentar salir de nuevo → No debe aparecer confirmación

**Total estimado**: ~35 minutos de testing manual completo

---

## 🔍 Queries de Verificación

### 1. Verificar Empresas con Direcciones Vinculadas

```sql
SELECT 
  c.id,
  c.razon_social,
  c.nif_prefix || c.nif_number AS nif,
  c.address_fiscal_id,
  c.address_social_id,
  af.postal_code AS fiscal_cp,
  af.street_name AS fiscal_street,
  asoc.postal_code AS social_cp,
  asoc.street_name AS social_street
FROM companies c
LEFT JOIN addresses af ON c.address_fiscal_id = af.id
LEFT JOIN addresses asoc ON c.address_social_id = asoc.id
WHERE c.razon_social IS NOT NULL
ORDER BY c.razon_social
LIMIT 10;
```

### 2. Ver Detalles Completos de una Dirección

```sql
SELECT 
  a.id,
  a.street_type,
  a.street_name,
  a.number,
  a.postal_code,
  m.name AS municipality,
  p.name AS province,
  a.country_code
FROM addresses a
LEFT JOIN municipalities m ON a.municipality_id = m.id
LEFT JOIN provinces p ON a.province_id = p.id
WHERE a.id = 'PASTE_ADDRESS_ID_HERE';
```

### 3. Verificar Catálogos Poblados

```sql
-- Contar países
SELECT COUNT(*) AS total_countries FROM countries;
-- Resultado esperado: ~20

-- Contar provincias españolas
SELECT COUNT(*) AS total_provinces FROM provinces WHERE country_code = 'ES';
-- Resultado esperado: 52

-- Contar municipios
SELECT COUNT(*) AS total_municipalities FROM municipalities;
-- Resultado esperado: >10

-- Contar códigos postales
SELECT COUNT(*) AS total_postal_codes FROM postal_codes;
-- Resultado esperado: >100
```

### 4. Probar RPC de Búsqueda de Ubicaciones

```sql
-- Buscar por CP
SELECT * FROM search_locations('08010');

-- Buscar por municipio
SELECT * FROM search_locations('Barcelona');

-- Buscar por provincia
SELECT * FROM search_locations('Madrid');
```

---

## 📦 Dependencias

### Librerías Utilizadas

- **React Hook Form** (`react-hook-form`): Gestión de formularios
- **Zod** (`zod`): Validación de esquemas
- **@hookform/resolvers**: Integración Zod + React Hook Form
- **Supabase** (`@supabase/supabase-js`): Base de datos y autenticación
- **TanStack Query** (`@tanstack/react-query`): Gestión de estado asincrónico
- **Radix UI**: Componentes de UI accesibles
- **Tailwind CSS**: Estilos y diseño
- **Lucide React**: Iconos

### Archivos Clave del Proyecto

```
src/
├── components/
│   ├── company/
│   │   ├── CompanyConfigTabs.tsx       # Tabs principales
│   │   ├── CompanyDataTab.tsx          # Tab de datos (Fase 1)
│   │   ├── CompanyIdentificationSection.tsx
│   │   ├── FiscalAddressSection.tsx
│   │   ├── SocialAddressSection.tsx
│   │   ├── ContactSection.tsx
│   │   └── LocationSearchDialog.tsx
│   └── ui/
│       ├── form.tsx
│       ├── input.tsx
│       ├── select.tsx
│       └── skeleton.tsx
├── hooks/
│   ├── useCompanyForm.ts               # Form + validación
│   └── useCompanyConfiguration.ts      # Queries Supabase
├── lib/
│   └── nif-validator.ts                # Validador NIF/CIF/NIE
├── pages/
│   └── admin/
│       └── CompanyConfiguration.tsx    # Página principal
└── docs/
    └── COMPANY_CONFIGURATION.md        # Esta documentación
```

---

## 🚀 Próximos Pasos

### Tabs Pendientes de Implementación

#### Tab 2: Actividades Económicas (CNAE)
- [ ] Tabla `company_activities` con códigos CNAE
- [ ] Búsqueda de actividades por descripción o código
- [ ] Checkbox para marcar actividad principal
- [ ] Gestión de múltiples actividades secundarias
- [ ] Validación: al menos una actividad principal obligatoria

#### Tab 3: Definición Contable
- [ ] Selector de Plan General Contable (PGC)
- [ ] Configuración de cuentas contables por defecto:
  - Cuenta de compras
  - Cuenta de ventas
  - Cuenta de IVA soportado
  - Cuenta de IVA repercutido
  - Cuenta de retenciones IRPF
- [ ] Configuración de series de facturación
- [ ] Numeración de facturas

#### Tab 4: CCC (Código Cuenta Cotización)
- [ ] Gestión de CCC de la Seguridad Social
- [ ] Validación de formato CCC (11 dígitos + 2 dígitos de control)
- [ ] Histórico de CCC por fechas
- [ ] Asociación con provincias/régimen

#### Tab 5: Usuarios Asignados
- [ ] Lista de usuarios con acceso a la empresa
- [ ] Asignación/desasignación de usuarios
- [ ] Definición de permisos por usuario:
  - Solo lectura
  - Lectura y escritura
  - Aprobador de facturas
- [ ] Notificaciones de asignación por email

#### Tab 6: Configuración Avanzada
- [ ] Parámetros de configuración contable
- [ ] Opciones de redondeo y decimales
- [ ] Configuración de IVA por defecto
- [ ] Opciones de exportación de datos
- [ ] Integración con sistemas externos (API keys)

### Mejoras Generales Futuras

#### UX/UI
- [ ] Modo lectura vs modo edición explícito
- [ ] Historial de cambios (audit log)
- [ ] Comparador de versiones anteriores
- [ ] Exportación de configuración a PDF
- [ ] Importación masiva de empresas (CSV/Excel)

#### Validaciones Adicionales
- [ ] Validar que el NIF no esté duplicado en la BD
- [ ] Validar formato de teléfonos según país
- [ ] Autocompletado de razón social al introducir NIF (API pública)
- [ ] Verificación de dirección con API de Correos

#### Performance
- [ ] Cacheo de catálogos geográficos en localStorage
- [ ] Paginación en búsqueda de ubicaciones
- [ ] Lazy loading de tabs no visitados
- [ ] Optimización de queries con índices adicionales

#### Integración
- [ ] API REST para CRUD de empresas
- [ ] Webhooks para cambios en configuración
- [ ] Sincronización con sistemas contables externos (Sage, A3, etc.)

---

## 📝 Notas de Desarrollo

### Decisiones Técnicas

1. **Separación de direcciones en tabla independiente**: Permite reutilizar direcciones y facilita cambios históricos.
2. **NIF separado en prefijo + número**: Facilita validación y búsquedas parciales.
3. **Catálogos geográficos normalizados**: Evita duplicados y facilita búsquedas.
4. **RPC para búsqueda**: Mejor performance que queries complejas en el cliente.
5. **Confirmación beforeunload**: UX estándar para evitar pérdida de datos.

### Conocidas Limitaciones

- **Búsqueda de ubicaciones**: Limitada a 50 resultados por performance
- **Catálogos**: Solo incluye España por ahora (fácilmente extensible)
- **Validación NIF**: Solo algoritmo español (NIE, NIF, CIF)
- **Sincronización**: No hay sincronización en tiempo real entre usuarios

---

## 📞 Soporte

Para preguntas técnicas o reportar bugs:
- Crear issue en el repositorio del proyecto
- Contactar al equipo de desarrollo en Slack: `#dev-accounting`

---

**Última actualización**: 2025-11-09  
**Versión**: 1.0.0  
**Estado**: ✅ Producción (Tab 1: Datos de la Empresa)
