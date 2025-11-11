// ============================================================================
// SHARED VALIDATORS - NIF/CIF validation and date formatting
// ============================================================================

/**
 * Valida un NIF o NIE español
 * Formato: 8 dígitos + letra de control
 * NIE: X, Y, Z + 7 dígitos + letra
 */
export function validateSpanishNIF(nif: string | null | undefined): boolean {
  if (!nif || typeof nif !== 'string') return false;
  
  const cleanNIF = nif.trim().toUpperCase().replace(/[\s-]/g, '');
  
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
    numberStr = nieMap[niePrefix] + cleanNIF.substring(1, 8);
  } else {
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
 */
export function validateSpanishCIF(cif: string | null | undefined): boolean {
  if (!cif || typeof cif !== 'string') return false;
  
  const cleanCIF = cif.trim().toUpperCase().replace(/[\s-]/g, '');
  
  if (cleanCIF.length !== 9) return false;
  
  const typeChar = cleanCIF.charAt(0);
  const numberPart = cleanCIF.substring(1, 8);
  const controlChar = cleanCIF.charAt(8);
  
  const validTypes = 'ABCDEFGHJNPQRSUVW';
  if (!validTypes.includes(typeChar)) return false;
  
  if (!/^\d{7}$/.test(numberPart)) return false;
  
  let sum = 0;
  
  for (let i = 0; i < 7; i++) {
    const digit = parseInt(numberPart.charAt(i));
    
    if (i % 2 === 0) {
      const doubled = digit * 2;
      sum += Math.floor(doubled / 10) + (doubled % 10);
    } else {
      sum += digit;
    }
  }
  
  const unitDigit = sum % 10;
  const controlDigit = unitDigit === 0 ? 0 : 10 - unitDigit;
  const controlLetter = 'JABCDEFGHI'.charAt(controlDigit);
  
  const mustBeLetter = ['K', 'P', 'Q', 'S'];
  const mustBeNumber = ['A', 'B', 'E', 'H'];
  
  if (mustBeLetter.includes(typeChar)) {
    return controlChar === controlLetter;
  } else if (mustBeNumber.includes(typeChar)) {
    return controlChar === String(controlDigit);
  } else {
    return controlChar === String(controlDigit) || controlChar === controlLetter;
  }
}

/**
 * Valida NIF o CIF automáticamente según el formato
 */
export function validateSpanishVAT(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') return false;
  
  const clean = value.trim().toUpperCase().replace(/[\s-]/g, '');
  
  if (clean.length !== 9) return false;
  
  const firstChar = clean.charAt(0);
  
  if (/^[XYZ0-9]/.test(firstChar)) {
    return validateSpanishNIF(clean);
  }
  
  if (/^[A-W]/.test(firstChar)) {
    return validateSpanishCIF(clean);
  }
  
  return false;
}

/**
 * Normaliza un NIF/CIF: trim, uppercase, remove spaces/dashes
 */
export function normalizeNIF(nif: string | null | undefined): string | null {
  if (!nif || typeof nif !== 'string') return null;
  return nif.trim().toUpperCase().replace(/[\s-]/g, '');
}

/**
 * Valida formato de fecha YYYY-MM-DD
 */
export function validateDateFormat(date: string | null | undefined): boolean {
  if (!date || typeof date !== 'string') return false;
  
  // Formato YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;
  
  // Validar que sea fecha válida
  const [year, month, day] = date.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  
  return dateObj.getFullYear() === year &&
         dateObj.getMonth() === month - 1 &&
         dateObj.getDate() === day;
}
