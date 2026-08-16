import { Dimensions } from 'react-native';

/**
 * El mockup de referencia (CoplanFit Diseño referencia.dc.html) está dibujado
 * en frames de 280px de ancho. s() convierte un valor px del mockup a dp del
 * dispositivo manteniendo la proporción exacta del diseño.
 * El ancho se acota a [320, 430] para que tablets/web no exageren la escala.
 */
const MOCKUP_WIDTH = 280;

const deviceWidth = Math.min(Math.max(Dimensions.get('window').width, 320), 430);

export function s(mockupPx: number): number {
  return Math.round((mockupPx * deviceWidth) / MOCKUP_WIDTH);
}
