import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

const bgImage = require('../../../assets/images/bg1.jpg');

type Props = {
  opacity?: number;
};

/**
 * Fondo visual sutil de la app (bg1.jpg con opacidad 0.1 sin overlay),
 * colocado detrás de la pantalla para reemplazar el gris plano.
 */
export function AppBackground({ opacity = 0.1 }: Props) {
  return (
    <Image
      source={bgImage}
      style={[styles.bg, { opacity }]}
      contentFit="cover"
      pointerEvents="none"
      priority="high"
    />
  );
}

const styles = StyleSheet.create({
  bg: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
  },
});
