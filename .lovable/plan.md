

# Plan: Eliminar bold completamente — todo en Regular (400)

## Problema
Actualmente los pesos bold/semibold se capan a 500 (medium). El usuario quiere que **nada** sea bold — todo debe ser Regular (400), sin excepción.

## Cambios

### `src/index.css`
1. Cambiar headings de `font-weight: 500` a `font-weight: 400`
2. Cambiar la regla global de `.font-bold, .font-extrabold, .font-black, .font-semibold` de `500 !important` a `400 !important`
3. Cambiar las clases `.holded-badge-*` y `.holded-nav-active` de `font-semibold` a `font-normal`
4. Asegurar que `body` usa `font-weight: 400`

### Resultado
Todo el texto del proyecto se renderiza en GeneralSans Regular (400) o Light (300). Ningún texto aparece en medium ni bold.

| Archivo | Cambio |
|---------|--------|
| `src/index.css` | Forzar weight 400 en todo |

