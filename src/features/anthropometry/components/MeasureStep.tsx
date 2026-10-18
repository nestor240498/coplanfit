import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { PressableScale } from '@/components/ui/PressableScale';
import { SessionToolbar } from './SessionToolbar';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes, lineHeights, TIGHT_FONT_SCALE } from '@/theme/typography';

import {
  checkReading,
  fmtEs,
  GROUP_LABELS,
  parseDecimal,
  type ReadingCheck,
  SITE_BY_ID,
  type SiteId,
} from '../engine';

/** Deja solo dígitos y una coma decimal, respetando los dígitos enteros y decimales del punto. */
function sanitizeNumber(raw: string, maxInt: number, maxDec: number): string {
  const cleaned = raw.replace(/\./g, ',').replace(/[^0-9,]/g, '');
  const [intPart, ...rest] = cleaned.split(',');
  const dec = rest.join('').slice(0, maxDec);
  const int = intPart.slice(0, maxInt);
  return rest.length > 0 && maxDec > 0 ? `${int},${dec}` : int;
}

/** Resultado de la última pareja de lecturas (aviso arriba del siguiente punto). */
export type PairFeedback = { siteId: SiteId; diffPct: number; ok: boolean };

type Props = {
  siteId: SiteId;
  readingNumber: number;
  readings: number[];
  passLabel: string;
  step: number;
  stepTotal: number;
  previous: number | null;
  ageYears: number | null;
  feedback: PairFeedback | null;
  voice: boolean;
  canGoBack: boolean;
  onRecord: (value: number) => void;
  onSkip: () => void;
  onBack: () => void;
  onToggleVoice: () => void;
  onOpenOverview: () => void;
  onDiscard: () => void;
  onPause: () => void;
};

/**
 * Un punto de la toma: qué medir, cómo, la lectura anterior y el valor, con el teclado numérico del teléfono.
 * Un valor poco habitual se confirma pulsando OK otra vez; uno imposible no se acepta.
 */
export function MeasureStep({
  siteId,
  readingNumber,
  readings,
  passLabel,
  step,
  stepTotal,
  previous,
  ageYears,
  feedback,
  voice,
  canGoBack,
  onRecord,
  onSkip,
  onBack,
  onToggleVoice,
  onOpenOverview,
  onDiscard,
  onPause,
}: Props) {
  const site = SITE_BY_ID[siteId];
  const [text, setText] = useState('');
  const [howToOpen, setHowToOpen] = useState(false);
  const [check, setCheck] = useState<ReadingCheck & { value?: number }>({ level: 'ok' });

  // Al cambiar de punto o de lectura se limpia el valor (ajuste de estado durante el render)
  const stepKey = `${siteId}:${readingNumber}`;
  const [lastStepKey, setLastStepKey] = useState(stepKey);
  if (stepKey !== lastStepKey) {
    setLastStepKey(stepKey);
    setText('');
    setCheck({ level: 'ok' });
  }

  const value = parseDecimal(text);

  function handleChange(next: string) {
    setText(sanitizeNumber(next, site.maxInt, site.decimals));
    if (check.level !== 'ok') setCheck({ level: 'ok' });
  }

  function handleOk() {
    if (value == null) return;
    const result = checkReading(siteId, value, { previous, ageYears });
    if (result.level === 'block') {
      setCheck(result);
      return;
    }
    // «Poco habitual»: el segundo OK con el mismo valor lo confirma
    if (result.level === 'confirm' && !(check.level === 'confirm' && check.value === value)) {
      setCheck({ ...result, value });
      return;
    }
    onRecord(value);
  }

  const feedbackSite = feedback ? SITE_BY_ID[feedback.siteId] : null;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SessionToolbar
        step={{ current: step, total: stepTotal }}
        voice={voice}
        onToggleVoice={onToggleVoice}
        onOpenOverview={onOpenOverview}
        onDiscard={onDiscard}
        onPause={onPause}
      />
      <ScrollView style={styles.flex} contentContainerStyle={styles.top} keyboardShouldPersistTaps="handled">
        {feedback && feedbackSite ? (
          <View style={[styles.feedback, feedback.ok ? styles.feedbackOk : styles.feedbackWarn]} accessibilityLiveRegion="polite">
            <Text style={[styles.feedbackText, !feedback.ok && styles.feedbackTextWarn]}>
              {feedbackSite.short}: diferencia {fmtEs(feedback.diffPct, 1)} %{' '}
              {feedback.ok ? '✓ coinciden' : `(más del ${feedbackSite.tolerancePct} %): se pedirá una 3.ª medida`}
            </Text>
          </View>
        ) : null}

        <Text style={styles.eyebrow}>
          {GROUP_LABELS[site.group]} · {passLabel}
        </Text>
        <Text style={styles.siteName} accessibilityRole="header">
          {site.label}
        </Text>
        <View style={styles.readingRow}>
          <Text style={styles.readingLabel}>{readingNumber === 3 ? 'Tercera medida' : readingNumber === 2 ? 'Segunda medida' : 'Primera medida'}</Text>
          {previous != null && (
            <Text style={styles.previous}>
              Última vez: {fmtEs(previous, site.decimals)} {site.unit}
            </Text>
          )}
        </View>
        {readings.length > 0 && (
          <View style={styles.infoRow}>
            {readings.map((r, i) => (
              <View key={i} style={styles.readingChip}>
                <Text style={styles.readingChipText}>
                  {i + 1}.ª {fmtEs(r, site.decimals)} {site.unit}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Pressable accessibilityRole="button" onPress={() => setHowToOpen((v) => !v)} style={styles.howToToggle}>
          <Text style={styles.howToTitle}>Cómo medir</Text>
          {howToOpen ? <ChevronUp size={16} color={colors.textSecondary} /> : <ChevronDown size={16} color={colors.textSecondary} />}
        </Pressable>
        {howToOpen && <Text style={styles.howTo}>{site.howTo}</Text>}

        {check.level !== 'ok' ? (
          <View style={[styles.check, check.level === 'block' ? styles.checkBlock : styles.checkConfirm]} accessibilityLiveRegion="polite">
            <Text style={[styles.checkText, check.level === 'block' && styles.checkTextBlock]}>{check.message}</Text>
            {check.suggestion != null && (
              <Pressable
                accessibilityRole="button"
                onPress={() => handleChange(fmtEs(check.suggestion!, site.decimals))}
                style={styles.suggestion}
              >
                <Text style={styles.suggestionText}>Usar {fmtEs(check.suggestion, site.decimals)}</Text>
              </Pressable>
            )}
          </View>
        ) : site.stable && previous != null && !text ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => handleChange(fmtEs(previous, site.decimals))}
            style={styles.repeatChip}
          >
            <Text style={styles.repeatText}>Repetir anterior ({fmtEs(previous, site.decimals)})</Text>
          </Pressable>
        ) : null}
        <View style={styles.display}>
          <View style={styles.displaySide} />
          <TextInput
            key={stepKey}
            value={text}
            onChangeText={handleChange}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.border}
            autoFocus
            selectTextOnFocus
            maxFontSizeMultiplier={TIGHT_FONT_SCALE}
            accessibilityLabel={`${site.short} en ${site.unit}`}
            style={styles.displayInput}
          />
          <Text style={styles.displayUnit}>{site.unit}</Text>
        </View>

      </ScrollView>

      <View style={styles.keypadArea}>
        <View style={styles.actions}>
          <PressableScale
            accessibilityRole="button"
            onPress={onBack}
            disabled={!canGoBack}
            style={[styles.actionBtn, !canGoBack && styles.disabled]}
          >
            <Text style={styles.actionText}>Atrás</Text>
          </PressableScale>
          <PressableScale accessibilityRole="button" onPress={onSkip} style={styles.actionBtn}>
            <Text style={styles.actionText}>Saltar</Text>
          </PressableScale>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={check.level === 'confirm' ? 'Confirmar valor' : 'Anotar valor'}
            onPress={handleOk}
            disabled={value == null}
            style={[styles.okBtn, value == null && styles.disabled]}
          >
            <Text style={styles.okText}>{check.level === 'confirm' ? 'Confirmar' : 'OK'}</Text>
          </PressableScale>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { paddingHorizontal: s(16), paddingTop: s(12), paddingBottom: s(8), gap: s(6) },
  feedback: { padding: s(10), borderRadius: radius.input },
  feedbackOk: { backgroundColor: colors.successBg },
  feedbackWarn: { backgroundColor: '#FFF4DB' },
  feedbackText: { fontFamily: fonts.bodySemi, fontSize: fontSizes.xs, lineHeight: lineHeights.xs, color: colors.success },
  feedbackTextWarn: { color: '#7A5200' },
  eyebrow: { fontFamily: fonts.bodySemi, fontSize: fontSizes.xs, color: colors.textSecondary, textTransform: 'uppercase' },
  siteName: { fontFamily: fonts.heading, fontSize: fontSizes.title, lineHeight: lineHeights.title, color: colors.navy },
  readingLabel: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.textSecondary },
  howToToggle: { flexDirection: 'row', alignItems: 'center', gap: s(4), minHeight: 44, alignSelf: 'flex-start' },
  howToTitle: { fontFamily: fonts.bodySemi, fontSize: fontSizes.xs, color: colors.textSecondary, textDecorationLine: 'underline' },
  howTo: { fontFamily: fonts.body, fontSize: fontSizes.sm, lineHeight: lineHeights.sm, color: colors.text },
  readingRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: s(8) },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: s(8) },
  readingChip: { paddingHorizontal: s(10), paddingVertical: s(4), borderRadius: radius.chip, backgroundColor: colors.neutralChipBg },
  readingChipText: { fontFamily: fonts.bodySemi, fontSize: fontSizes.xs, color: colors.navy },
  previous: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary },
  display: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: s(6),
    paddingHorizontal: s(16),
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.lime,
  },
  // El valor va centrado en la caja; los huecos laterales iguales mantienen ese centro y dejan aire a la unidad
  displaySide: { width: s(56), flexShrink: 0 },
  displayInput: { outlineWidth: 0, flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0, minHeight: 56, textAlign: 'center', fontFamily: fonts.heading, fontSize: fontSizes.title, color: colors.navy },
  displayUnit: { width: s(56), flexShrink: 0, textAlign: 'right', fontFamily: fonts.bodyBold, fontSize: fontSizes.headline, color: colors.textSecondary },
  check: { flexDirection: 'row', alignItems: 'center', gap: s(8), padding: s(10), borderRadius: radius.input },
  checkConfirm: { backgroundColor: '#FFF4DB' },
  checkBlock: { backgroundColor: colors.dangerBg },
  checkText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: fontSizes.xs, lineHeight: lineHeights.xs, color: '#7A5200' },
  checkTextBlock: { color: colors.danger },
  suggestion: { minHeight: 40, paddingHorizontal: s(12), justifyContent: 'center', borderRadius: radius.chip, backgroundColor: colors.navy },
  suggestionText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.xs, color: colors.surface },
  repeatChip: {
    alignSelf: 'center',
    minHeight: 40,
    paddingHorizontal: s(14),
    justifyContent: 'center',
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.navy,
  },
  repeatText: { fontFamily: fonts.bodySemi, fontSize: fontSizes.xs, color: colors.navy },
  keypadArea: {
    gap: s(8),
    paddingHorizontal: s(16),
    paddingTop: s(10),
    paddingBottom: s(10),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  actions: { flexDirection: 'row', gap: s(8) },
  actionBtn: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  actionText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.textSecondary },
  okBtn: {
    flex: 1.4,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.button,
    backgroundColor: colors.lime,
  },
  okText: { fontFamily: fonts.heading, fontSize: fontSizes.headline, color: colors.navy },
  disabled: { opacity: 0.4 },
});
