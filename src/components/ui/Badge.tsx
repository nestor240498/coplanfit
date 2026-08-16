import { StyleSheet, Text, View } from 'react-native';

import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

type Props = {
  label: string;
  /** 'lime' para el badge de cupo sobre header navy; 'success' para "vigente" */
  variant?: 'lime' | 'success';
};

/** Mockup (badge "8/10"): texto 10px bold navy sobre lima, padding 4x9, radio 20. */
export function Badge({ label, variant = 'lime' }: Props) {
  return (
    <View style={[styles.badge, variant === 'lime' ? styles.lime : styles.success]}>
      <Text style={[styles.label, variant === 'lime' ? styles.labelLime : styles.labelSuccess]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.chip,
    paddingVertical: s(3),
    paddingHorizontal: s(8),
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  lime: { backgroundColor: colors.lime },
  success: { backgroundColor: colors.successBg },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    textAlign: 'center',
  },
  labelLime: { color: colors.navy },
  labelSuccess: { color: colors.success },
});
