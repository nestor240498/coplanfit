/**
 * Tipografía: Manrope 700/800 para encabezados, Inter 400–700 para cuerpo.
 *
 * Escala FIJA en pt por rol (no depende del ancho de pantalla): así el texto nunca baja del mínimo
 * legible en móviles pequeños y sigue el tamaño de texto del sistema (Dynamic Type / escala de fuente).
 * `s()` se usa solo para medidas de layout, nunca para tamaños de letra.
 * Suelo absoluto: 11 pt (`micro`), solo para insignias; el texto de lectura empieza en 13.
 */
export const fonts = {
  heading: 'Manrope_800ExtraBold',
  headingSemi: 'Manrope_700Bold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

export const fontSizes = {
  /** Título grande de bienvenida (login, registro) */
  title: 26,
  /** Título de pantalla en header navy, cifras destacadas */
  screenTitle: 22,
  /** Títulos de hoja inferior, tarjetas y secciones destacadas */
  headline: 18,
  /** Cuerpo principal: nombres en tarjetas, texto de inputs */
  base: 16,
  /** Cuerpo secundario */
  sm: 15,
  /** Metadatos, chips, ayudas */
  xs: 13,
  /** Labels uppercase de formulario */
  label: 12,
  /** Insignias y contadores; nunca para texto de lectura */
  micro: 11,
} as const;

/**
 * Interlineado fijo para texto de varias líneas, por rol (≈ 1,35–1,45 × el tamaño).
 * Nunca `lineHeight: s(…)`: en móviles pequeños quedaría por debajo del tamaño de letra y cortaría el texto.
 */
export const lineHeights = {
  title: 32,
  screenTitle: 28,
  headline: 24,
  base: 22,
  sm: 21,
  xs: 18,
  label: 17,
  micro: 15,
} as const;

/**
 * Límite de crecimiento con Dynamic Type para textos en contenedores de alto fijo
 * (barras de pestañas, insignias, cabecera). El resto del texto crece sin límite.
 */
export const TIGHT_FONT_SCALE = 1.3;
