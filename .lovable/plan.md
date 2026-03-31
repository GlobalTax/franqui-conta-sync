

# Plan: Cambiar tipografía a GeneralSans Regular (sin bold)

## Resumen
Reemplazar Plus Jakarta Sans e Inter por **GeneralSans** en peso Regular (400) y Light (300) para todo el proyecto. Eliminar usos de font-weight bold/700/800.

## Pasos

### 1. Copiar fuentes al proyecto
Copiar los archivos `.ttf` y `.woff` de GeneralSans Regular, Light y Medium a `public/fonts/`:
- `GeneralSans-Light.ttf`, `GeneralSans-Light.woff`
- `GeneralSans-Regular.ttf`, `GeneralSans-Regular.eot`
- `GeneralSans-Medium.ttf`, `GeneralSans-Medium.woff`, `GeneralSans-Medium.eot`

### 2. Declarar `@font-face` en `src/index.css`
```css
@font-face {
  font-family: 'GeneralSans';
  src: url('/fonts/GeneralSans-Light.woff') format('woff'),
       url('/fonts/GeneralSans-Light.ttf') format('truetype');
  font-weight: 300;
  font-style: normal;
}
@font-face {
  font-family: 'GeneralSans';
  src: url('/fonts/GeneralSans-Regular.eot');
  src: url('/fonts/GeneralSans-Regular.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
}
@font-face {
  font-family: 'GeneralSans';
  src: url('/fonts/GeneralSans-Medium.woff') format('woff'),
       url('/fonts/GeneralSans-Medium.eot') format('embedded-opentype'),
       url('/fonts/GeneralSans-Medium.ttf') format('truetype');
  font-weight: 500;
  font-style: normal;
}
```

### 3. Actualizar `tailwind.config.ts`
Cambiar `fontFamily` para usar GeneralSans en todo:
```ts
fontFamily: {
  sans: ['GeneralSans', 'system-ui', 'sans-serif'],
  heading: ['GeneralSans', 'system-ui', 'sans-serif'],
  body: ['GeneralSans', 'system-ui', 'sans-serif'],
}
```

### 4. Eliminar Google Fonts de `index.html`
Quitar las líneas de `<link>` que cargan Plus Jakarta Sans e Inter desde Google Fonts.

### 5. Reducir pesos de fuente globalmente
Añadir en `src/index.css` una regla base para limitar el peso máximo a 500 (medium) y que el default sea 400 (regular):
```css
body { font-weight: 400; }
h1, h2, h3, h4, h5, h6 { font-weight: 500; }
```
Buscar y reemplazar clases Tailwind `font-bold`, `font-extrabold`, `font-black` (700/800/900) por `font-medium` (500) o `font-normal` (400) en los componentes que las usen.

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `public/fonts/` | Copiar 7 archivos de fuente |
| `src/index.css` | Añadir `@font-face`, reglas de peso |
| `tailwind.config.ts` | Cambiar fontFamily |
| `index.html` | Eliminar Google Fonts links |
| Componentes varios | `font-bold` → `font-medium` o `font-normal` |

