/**
 * Validadores de NIF/CIF/NIE según algoritmo oficial español
 * 
 * Referencias:
 * - NIF: Número de Identificación Fiscal (personas físicas)
 * - NIE: Número de Identidad de Extranjero (X, Y, Z + 7 dígitos + letra)
 * - CIF: Código de Identificación Fiscal (personas jurídicas)
 */

/**
 * Valida un NIF o NIE español
 * Formato: 8 dígitos + letra de control
 * NIE: X, Y, Z + 7 dígitos + letra
 * 
 * @param nif - Número completo (ej: "12345678Z" o "X1234567L")
 * @returns true si es válido, false si no
 */
export function validateNIF(nif: string): boolean {
  if (!nif || typeof nif !== 'string') return false;
  
  // Limpiar espacios y convertir a mayúsculas
  const cleanNIF = nif.trim().toUpperCase();
  
  if (cleanNIF.length !== 9) return false;
  
  const niePrefix = cleanNIF.charAt(0);
  const letter = cleanNIF.charAt(8);
  
  // Mapa de conversión NIE: X=0, Y=1, Z=2
  const nieMap: Record<string, string> = { 
    'X': '0', 
    'Y': '1', 
    'Z': '2' 
  };
  
  // Extraer número: si es NIE, sustituir X/Y/Z por su equivalente
  let numberStr: string;
  
  if (nieMap[niePrefix]) {
    // Es un NIE
    numberStr = nieMap[niePrefix] + cleanNIF.substring(1, 8);
  } else {
    // Es un NIF normal
    numberStr = cleanNIF.substring(0, 8);
  }
  
  // Verificar que sean dígitos
  if (!/^\d{8}$/.test(numberStr)) return false;
  
  // Calcular letra de control
  const validLetters = 'TRWAGMYFPDXBNJZSQVHLCKE';
  const expectedLetter = validLetters.charAt(parseInt(numberStr) % 23);
  
  return letter === expectedLetter;
}

/**
 * Valida un CIF español (personas jurídicas)
 * Formato: Letra + 7 dígitos + dígito/letra de control
 * 
 * Tipos válidos (primera letra):
 * A: Sociedad Anónima
 * B: Sociedad de Responsabilidad Limitada
 * C: Sociedad Colectiva
 * D: Sociedad Comanditaria
 * E: Comunidad de Bienes
 * F: Sociedad Cooperativa
 * G: Asociación
 * H: Comunidad de Propietarios
 * J: Sociedad Civil
 * N: Entidad Extranjera
 * P: Corporación Local
 * Q: Organismo Autónomo
 * R: Congregación o Institución Religiosa
 * S: Órgano de la Administración del Estado
 * U: Unión Temporal de Empresas
 * V: Otros tipos no definidos
 * W: Establecimiento permanente de entidad no residente
 * 
 * @param cif - Código completo (ej: "B67498741")
 * @returns true si es válido, false si no
 */
export function validateCIF(cif: string): boolean {
  if (!cif || typeof cif !== 'string') return false;
  
  // Limpiar espacios y convertir a mayúsculas
  const cleanCIF = cif.trim().toUpperCase();
  
  if (cleanCIF.length !== 9) return false;
  
  const typeChar = cleanCIF.charAt(0);
  const numberPart = cleanCIF.substring(1, 8);
  const controlChar = cleanCIF.charAt(8);
  
  // Solo permitir tipos válidos
  const validTypes = 'ABCDEFGHJNPQRSUVW';
  if (!validTypes.includes(typeChar)) return false;
  
  // Verificar que los 7 caracteres centrales sean dígitos
  if (!/^\d{7}$/.test(numberPart)) return false;
  
  // Calcular suma de control
  let sum = 0;
  
  for (let i = 0; i < 7; i++) {
    const digit = parseInt(numberPart.charAt(i));
    
    if (i % 2 === 0) {
      // Posiciones pares (0, 2, 4, 6): multiplicar por 2 y sumar dígitos
      const doubled = digit * 2;
      sum += Math.floor(doubled / 10) + (doubled % 10);
    } else {
      // Posiciones impares (1, 3, 5): sumar directamente
      sum += digit;
    }
  }
  
  // Calcular dígito de control
  const unitDigit = sum % 10;
  const controlDigit = unitDigit === 0 ? 0 : 10 - unitDigit;
  
  // La letra de control se calcula: J=0, A=1, B=2, ..., I=9
  const controlLetter = 'JABCDEFGHI'.charAt(controlDigit);
  
  // Algunos CIFs terminan en número (NIF anterior), otros en letra
  // Tipos que DEBEN terminar en letra: K, P, Q, S
  // Tipos que DEBEN terminar en número: A, B, E, H
  // Resto: pueden terminar en cualquiera
  
  const mustBeLetter = ['K', 'P', 'Q', 'S'];
  const mustBeNumber = ['A', 'B', 'E', 'H'];
  
  if (mustBeLetter.includes(typeChar)) {
    return controlChar === controlLetter;
  } else if (mustBeNumber.includes(typeChar)) {
    return controlChar === String(controlDigit);
  } else {
    // Puede ser cualquiera
    return controlChar === String(controlDigit) || controlChar === controlLetter;
  }
}

/**
 * Valida NIF o CIF automáticamente según el formato
 * 
 * @param value - Valor a validar
 * @returns true si es NIF o CIF válido, false si no
 */
export function validateNIFOrCIF(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  
  const clean = value.trim().toUpperCase();
  
  if (clean.length !== 9) return false;
  
  const firstChar = clean.charAt(0);
  
  // Si empieza con X, Y, Z o es dígito → es NIF/NIE
  if (/^[XYZ0-9]/.test(firstChar)) {
    return validateNIF(clean);
  }
  
  // Si empieza con letra (que no sea X, Y, Z) → es CIF
  if (/^[A-W]/.test(firstChar)) {
    return validateCIF(clean);
  }
  
  return false;
}

/**
 * Obtiene un mensaje de error descriptivo para NIF/CIF inválido
 * 
 * @param value - Valor validado
 * @returns Mensaje de error específico
 */
export function getNIFCIFErrorMessage(value: string): string {
  if (!value) return 'El NIF/CIF es obligatorio';
  
  const clean = value.trim().toUpperCase();
  
  if (clean.length !== 9) {
    return 'El NIF/CIF debe tener 9 caracteres';
  }
  
  const firstChar = clean.charAt(0);
  
  if (/^[XYZ0-9]/.test(firstChar)) {
    return 'NIF/NIE inválido: la letra de control no coincide';
  }
  
  if (/^[A-W]/.test(firstChar)) {
    return 'CIF inválido: el dígito/letra de control no coincide';
  }
  
  return 'Formato de NIF/CIF no reconocido';
}
