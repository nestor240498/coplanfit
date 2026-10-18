/**
 * Escena de gráfica independiente del renderizador: la misma escena se dibuja en la app
 * (react-native-svg, `ChartView`) y en los PDF (`toSvgString`). Los textos llevan un rol de tamaño,
 * nunca píxeles, para que cada renderizador use su escala.
 */
export type TextRole = 'micro' | 'label' | 'xs';

export type SceneNode =
  | { kind: 'rect'; x: number; y: number; w: number; h: number; fill: string; rx?: number; stroke?: string; strokeWidth?: number; opacity?: number }
  | { kind: 'path'; d: string; fill?: string; stroke?: string; strokeWidth?: number; dash?: string; opacity?: number }
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; stroke: string; strokeWidth: number; dash?: string }
  | { kind: 'circle'; cx: number; cy: number; r: number; fill: string; stroke?: string; strokeWidth?: number }
  | {
      kind: 'text';
      x: number;
      y: number;
      text: string;
      role: TextRole;
      fill: string;
      anchor?: 'start' | 'middle' | 'end';
      weight?: 'normal' | 'bold';
    };

export type ChartScene = {
  width: number;
  height: number;
  /** Descripción para accesibilidad (lectores de pantalla). */
  desc: string;
  nodes: SceneNode[];
};

/** Tamaño de cada rol en píxeles de la escena (la app y el PDF usan los suyos al dibujar). */
export const ROLE_SIZE: Record<TextRole, number> = { micro: 11, label: 12, xs: 13 };

/** Ancho aproximado de un texto (para no salirse del lienzo). */
export function approxTextWidth(text: string, role: TextRole): number {
  return text.length * ROLE_SIZE[role] * 0.56;
}
