import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BreadcrumbItem, Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { s } from '@/theme/scale';
import { colors } from '@/theme/tokens';
import { fonts, fontSizes, TIGHT_FONT_SCALE } from '@/theme/typography';

type Props = {
  title: string;
  subtitle?: string;
  /** Muestra la flecha de volver */
  showBack?: boolean;
  /** Destino al volver cuando no hay pantalla anterior (recarga o enlace directo); por defecto, el inicio. */
  backHref?: string;
  /** Muestra el botón de ir al inicio */
  showHome?: boolean;
  /** Elemento a la derecha del título (badge de cupo, ícono, botón…) */
  right?: ReactNode;
  /** Migas de pan opcionales debajo del título */
  breadcrumbs?: BreadcrumbItem[];
};

export function ScreenHeader({
  title,
  subtitle,
  showBack,
  showHome: _showHome,
  backHref,
  right,
  breadcrumbs,
}: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  function handleBack() {
    if (router.canGoBack()) router.back();
    else router.replace((backHref ?? '/') as never);
  }

  return (
    <View style={[styles.header, { paddingTop: insets.top + s(10) }]}>
      {/* Migas de pan opcionales arriba */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <View style={styles.breadcrumbsRow}>
          <Breadcrumbs items={breadcrumbs} />
        </View>
      )}

      <View style={styles.row}>
        <View style={styles.titleGroup}>
          {showBack && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Volver"
              onPress={handleBack}
              style={styles.backHit}
            >
              <ChevronLeft size={s(20)} color={colors.surface} strokeWidth={2.5} />
            </Pressable>
          )}

          <Text style={styles.title} numberOfLines={2} maxFontSizeMultiplier={TIGHT_FONT_SCALE}>
            {title}
          </Text>
        </View>
        {right}
      </View>

      {subtitle != null && (
        <Text style={styles.subtitle} maxFontSizeMultiplier={TIGHT_FONT_SCALE}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.navy,
    paddingHorizontal: s(20),
    paddingBottom: s(14),
    gap: s(4),
  },
  breadcrumbsRow: {
    marginBottom: s(2),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(12),
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
    flexShrink: 1,
  },
  // Área táctil de 44 pt; el margen negativo mantiene el chevron alineado con el borde
  backHit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -14,
    marginRight: -6,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.screenTitle,
    color: colors.surface,
    flexShrink: 1,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.onNavyMuted,
  },
});

