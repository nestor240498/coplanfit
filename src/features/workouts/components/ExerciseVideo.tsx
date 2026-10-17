import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { EXERCISE_MEDIA_BUCKET, useMediaSource } from '@/lib/storage';
import { colors, radius } from '@/theme/tokens';

type Props = {
  /** Ruta en el bucket exercise-media o archivo local recién grabado. */
  videoRef: string;
  height: number;
};

/**
 * Vídeo demostrativo del ejercicio: en bucle y sin sonido, como un GIF de gimnasio.
 * Con "Reducir movimiento" activado no se reproduce solo: muestra controles para iniciarlo.
 */
export function ExerciseVideo({ videoRef, height }: Props) {
  const source = useMediaSource(videoRef, EXERCISE_MEDIA_BUCKET);
  const reduceMotion = useReducedMotion();
  const player = useVideoPlayer(null, (p) => {
    p.loop = true;
    p.muted = true;
  });

  const uri = source?.uri;

  useEffect(() => {
    if (!uri) return;
    let cancelled = false;
    player
      .replaceAsync(uri)
      .then(() => {
        if (!cancelled && !reduceMotion) player.play();
      })
      // Si se cierra el detalle mientras carga, el reproductor ya se liberó: no es un error
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [player, uri, reduceMotion]);

  return (
    <View style={[styles.container, { height }]}>
      {source ? (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          nativeControls={reduceMotion}
          fullscreenOptions={{ enable: true }}
          accessibilityLabel="Vídeo demostrativo del ejercicio"
        />
      ) : (
        <ActivityIndicator color={colors.surface} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
