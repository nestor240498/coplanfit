/**
 * Tipografía: Manrope 700/800 para encabezados, Inter 400–700 para cuerpo.
 * Tamaños = px del mockup (frames de 280px) escalados con s() al dispositivo.
 */
import { s } from './scale';

export const fonts = {
  heading: 'Manrope_800ExtraBold',
  headingSemi: 'Manrope_700Bold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

export const fontSizes = {
  /** Título de pantalla en header navy (mockup 18px) */
  screenTitle: s(18),
  /** Título grande de bienvenida (mockup 19px) */
  title: s(19),
  /** Nombre en tarjetas, texto de input (mockup 12px) */
  base: s(12),
  /** Cuerpo secundario, footer de login (mockup 11px) */
  sm: s(11),
  /** Metadatos, chips, hints (mockup 10px) */
  xs: s(10),
  /** Labels uppercase de formulario (mockup 9px) */
  label: s(9),
} as const;
