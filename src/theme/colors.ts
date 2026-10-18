/** Colores de CoplanFit (Navy Pro). Puro: sin React Native, para poder usarlo en gráficas y scripts en Node. */
export const colors = {
  navy: '#1B2A4A',
  lime: '#8BC53F',
  background: '#F7F8FA',
  surface: '#FFFFFF',
  border: '#DDE2EA',
  /** Borde superior del tab bar (mockup: #E4E7ED) */
  tabBarBorder: '#E4E7ED',

  text: '#2E2E2E',
  textSecondary: '#5A6270',
  textMuted: '#697182',
  /** Texto secundario sobre fondo navy (subtítulos de header) */
  onNavyMuted: '#B9C2D6',

  danger: '#B4442E',
  dangerBg: '#FFE4DF',
  success: '#4B7A1F',
  successBg: '#EAF6D9',
  /** Relleno de avisos «queda poco» (barras de uso); no usar como color de texto */
  warning: '#E0A21B',

  /** Fondo de chip neutro (ej. "Evita: frutos secos") */
  neutralChipBg: '#EEF0F4',
} as const;

/**
 * Colores de datos para gráficas (validados para daltonismo en uso adyacente). El lima de la marca
 * nunca es un color de datos. Acompañar siempre con etiqueta o tabla: el color no es el único portador.
 */
export const chartColors = {
  muscle: '#2a78d6',
  adipose: '#eb6834',
  bone: '#1baf7a',
  residual: '#eda100',
  /** Rampa azul ordinal (claro → oscuro) */
  ordinal: ['#c6dcf7', '#86b6ef', '#2a78d6', '#1a5bb0', '#104281'],
  muted: '#B8BFCC',
  grid: '#E4E7ED',
} as const;
