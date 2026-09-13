import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import LottieView from 'lottie-react-native';
import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { generateKinematicLottieAnimation } from '../exerciseAnimationGenerator';
import { MuscleGroup } from '../types';
import { WORKOUT_ANIMATION } from '../workoutAnimation';
import { s } from '@/theme/scale';
import { colors } from '@/theme/tokens';

type Props = {
  url?: string | null;
  exerciseName?: string;
  muscleGroup?: MuscleGroup;
  customAnimationData?: object | string | null;
  size?: number;
};

/**
 * Normaliza cualquier árbol Bodymovin Lottie para garantizar compatibilidad total con dotlottie-web y lottie-react-native
 */
function normalizeLottieTree(raw: any, fallbackName = 'Exercise Animation'): object {
  let parsed = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return WORKOUT_ANIMATION;
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return WORKOUT_ANIMATION;
  }

  const safeLayers = Array.isArray(parsed.layers)
    ? parsed.layers.map((layer: any, idx: number) => ({
        ddd: 0,
        ind: layer.ind ?? idx + 1,
        ty: layer.ty ?? 4,
        nm: layer.nm || `Layer ${idx + 1}`,
        sr: layer.sr ?? 1,
        ks: layer.ks || {
          o: { a: 0, k: 100 },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [150, 150, 0] },
          a: { a: 0, k: [0, 0, 0] },
          s: { a: 0, k: [100, 100, 100] },
        },
        ao: 0,
        shapes: layer.shapes || [],
        ip: layer.ip ?? 0,
        op: layer.op ?? 60,
        st: layer.st ?? 0,
        bm: 0,
      }))
    : WORKOUT_ANIMATION.layers;

  return {
    v: parsed.v || '5.5.7',
    fr: parsed.fr || 30,
    ip: parsed.ip ?? 0,
    op: parsed.op ?? 60,
    w: parsed.w || 300,
    h: parsed.h || 300,
    nm: parsed.nm || fallbackName,
    ddd: 0,
    assets: Array.isArray(parsed.assets) ? parsed.assets : [],
    layers: safeLayers,
  };
}

export function ExerciseLottiePlayer({
  url,
  exerciseName,
  muscleGroup = 'pecho',
  customAnimationData,
  size = s(160),
}: Props) {
  const [hasRemoteError, setHasRemoteError] = useState(false);

  // Calcula el objeto Lottie Bodymovin garantizado
  const lottieData = useMemo(() => {
    if (customAnimationData) {
      return normalizeLottieTree(customAnimationData, exerciseName);
    }
    if (exerciseName) {
      const generated = generateKinematicLottieAnimation(exerciseName, muscleGroup);
      return normalizeLottieTree(generated, exerciseName);
    }
    return WORKOUT_ANIMATION;
  }, [customAnimationData, exerciseName, muscleGroup]);

  const isRemote = Boolean(!customAnimationData && url && url.startsWith('http') && !hasRemoteError);

  // --- RENDERIZADO EN WEB (Directo con DotLottieReact para máximo rendimiento y canvas nítido) ---
  if (Platform.OS === 'web') {
    const jsonString = isRemote ? undefined : JSON.stringify(lottieData);
    const remoteSrc = isRemote ? url! : undefined;

    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <DotLottieReact
          data={jsonString}
          src={remoteSrc}
          autoplay
          loop
          style={{
            width: `${size}px`,
            height: `${size}px`,
            display: 'block',
            maxWidth: '100%',
            maxHeight: '100%',
          }}
          width={size}
          height={size}
          dotLottieRefCallback={(dotLottie) => {
            if (dotLottie) {
              dotLottie.addEventListener('loadError', () => {
                if (isRemote) setHasRemoteError(true);
              });
            }
          }}
        />
      </View>
    );
  }

  // --- RENDERIZADO EN MÓVIL (iOS / Android con LottieView nativo) ---
  const mobileSource = isRemote ? { uri: url! } : lottieData;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <LottieView
        source={mobileSource as any}
        autoPlay
        loop
        style={{ width: size, height: size }}
        onAnimationFailure={() => {
          if (isRemote) setHasRemoteError(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: s(16),
    overflow: 'hidden',
  },
});
