// Países europeos (Unión Europea)
export const EUROPEAN_COUNTRIES = [
  { value: 'España', label: 'España', flag: '🇪🇸' },
  { value: 'Alemania', label: 'Alemania', flag: '🇩🇪' },
  { value: 'Austria', label: 'Austria', flag: '🇦🇹' },
  { value: 'Bélgica', label: 'Bélgica', flag: '🇧🇪' },
  { value: 'Bulgaria', label: 'Bulgaria', flag: '🇧🇬' },
  { value: 'Chipre', label: 'Chipre', flag: '🇨🇾' },
  { value: 'Croacia', label: 'Croacia', flag: '🇭🇷' },
  { value: 'Dinamarca', label: 'Dinamarca', flag: '🇩🇰' },
  { value: 'Eslovaquia', label: 'Eslovaquia', flag: '🇸🇰' },
  { value: 'Eslovenia', label: 'Eslovenia', flag: '🇸🇮' },
  { value: 'Estonia', label: 'Estonia', flag: '🇪🇪' },
  { value: 'Finlandia', label: 'Finlandia', flag: '🇫🇮' },
  { value: 'Francia', label: 'Francia', flag: '🇫🇷' },
  { value: 'Grecia', label: 'Grecia', flag: '🇬🇷' },
  { value: 'Hungría', label: 'Hungría', flag: '🇭🇺' },
  { value: 'Irlanda', label: 'Irlanda', flag: '🇮🇪' },
  { value: 'Italia', label: 'Italia', flag: '🇮🇹' },
  { value: 'Letonia', label: 'Letonia', flag: '🇱🇻' },
  { value: 'Lituania', label: 'Lituania', flag: '🇱🇹' },
  { value: 'Luxemburgo', label: 'Luxemburgo', flag: '🇱🇺' },
  { value: 'Malta', label: 'Malta', flag: '🇲🇹' },
  { value: 'Países Bajos', label: 'Países Bajos', flag: '🇳🇱' },
  { value: 'Polonia', label: 'Polonia', flag: '🇵🇱' },
  { value: 'Portugal', label: 'Portugal', flag: '🇵🇹' },
  { value: 'República Checa', label: 'República Checa', flag: '🇨🇿' },
  { value: 'Rumanía', label: 'Rumanía', flag: '🇷🇴' },
  { value: 'Suecia', label: 'Suecia', flag: '🇸🇪' },
] as const;

/**
 * Mapeo de nombres de países en español a códigos ISO para VIES
 * Nota: Grecia usa 'EL' en VIES (no 'GR')
 */
export const COUNTRY_ISO_CODES: Record<string, string> = {
  'Alemania': 'DE',
  'Austria': 'AT',
  'Bélgica': 'BE',
  'Bulgaria': 'BG',
  'Chipre': 'CY',
  'Croacia': 'HR',
  'Dinamarca': 'DK',
  'Eslovaquia': 'SK',
  'Eslovenia': 'SI',
  'España': 'ES',
  'Estonia': 'EE',
  'Finlandia': 'FI',
  'Francia': 'FR',
  'Grecia': 'EL', // ⚠️ VIES usa 'EL', no 'GR'
  'Hungría': 'HU',
  'Irlanda': 'IE',
  'Italia': 'IT',
  'Letonia': 'LV',
  'Lituania': 'LT',
  'Luxemburgo': 'LU',
  'Malta': 'MT',
  'Países Bajos': 'NL',
  'Polonia': 'PL',
  'Portugal': 'PT',
  'República Checa': 'CZ',
  'Rumanía': 'RO',
  'Suecia': 'SE',
};

/**
 * Obtiene el código ISO de un país por su nombre en español
 * @param countryName - Nombre del país en español (ej: "Alemania")
 * @returns Código ISO (ej: "DE") o null si no existe
 */
export function getCountryISOCode(countryName: string): string | null {
  return COUNTRY_ISO_CODES[countryName] || null;
}
