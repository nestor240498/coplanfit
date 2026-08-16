/**
 * Design tokens de CoplanFit — dirección visual "Navy Pro".
 * Fuente: design_handoff_coplanfit/README.md
 * Los valores dimensionales son px del mockup pasados por s() (escala exacta).
 */
import { Platform } from 'react-native';

import { s } from './scale';

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
  textMuted: '#8B93A3',
  /** Texto secundario sobre fondo navy (subtítulos de header) */
  onNavyMuted: '#B9C2D6',

  danger: '#B4442E',
  dangerBg: '#FFE4DF',
  success: '#4B7A1F',
  successBg: '#EAF6D9',

  /** Fondo de chip neutro (ej. "Evita: frutos secos") */
  neutralChipBg: '#EEF0F4',
} as const;

export const radius = {
  card: s(10),
  input: s(8),
  button: s(10),
  chip: s(20),
  sheet: s(20),
} as const;

export const spacing = {
  xs: s(4),
  sm: s(8),
  md: s(12),
  lg: s(16),
  xl: s(20),
  xxl: s(24),
} as const;

/** Sombra suave de tarjeta — mockup: 0 2px 6px rgba(27,42,74,0.06), nunca dura */
export const shadows = {
  card: Platform.select({
    web: {
      boxShadow: '0px 2px 6px rgba(27, 42, 74, 0.06)',
    },
    default: {
      shadowColor: colors.navy,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
  }),
  fab: Platform.select({
    web: {
      boxShadow: '0px 4px 12px rgba(27, 42, 74, 0.18)',
    },
    default: {
      shadowColor: colors.navy,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 6,
    },
  }),
} as const;
