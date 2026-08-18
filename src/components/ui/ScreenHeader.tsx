import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BreadcrumbItem, Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

type Props = {
  title: string;
  subtitle?: string;
  /** Muestra la flecha de volver */
  showBack?: boolean;
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
  right,
  breadcrumbs,
}: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  function handleBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
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
              hitSlop={12}
              style={styles.backHit}
            >
              <ChevronLeft size={s(20)} color={colors.surface} strokeWidth={2.5} />
            </Pressable>
          )}

          

          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>
        {right}
      </View>

      {subtitle != null && <Text style={styles.subtitle}>{subtitle}</Text>}
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
  backHit: {
    width: s(24),
    height: s(24),
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -s(6),
  },
  homeBtn: {
    width: s(28),
    height: s(28),
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.screenTitle,
    color: colors.surface,
    flexShrink: 1,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: s(8),
    color: colors.onNavyMuted,
  },
});

