import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react-native';
import { ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

type Option<T extends string> = { id: T; label: string };

/** Sección plegable del formulario: muestra un resumen cuando está cerrada. */
export function FormSection({
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const Chevron = open ? ChevronUp : ChevronDown;
  return (
    <View style={styles.section}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        style={styles.sectionHeader}
      >
        <View style={styles.sectionTexts}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {!open && summary ? (
            <Text style={styles.sectionSummary} numberOfLines={1}>
              {summary}
            </Text>
          ) : null}
        </View>
        <Chevron size={s(16)} color={colors.textSecondary} />
      </Pressable>
      {open && <View style={styles.sectionBody}>{children}</View>}
    </View>
  );
}

export function FieldLabel({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

/** Fila horizontal de chips con selección única. */
export function SingleChoice<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Option<T>[];
  value: T | null | undefined;
  onChange: (value: T) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <Pressable
            key={opt.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(opt.id)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Fila horizontal de chips con selección múltiple. */
export function MultiChoice<T extends string>({
  options,
  values,
  onChange,
}: {
  options: Option<T>[];
  values: T[];
  onChange: (values: T[]) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
      {options.map((opt) => {
        const active = values.includes(opt.id);
        return (
          <Pressable
            key={opt.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: active }}
            onPress={() => onChange(active ? values.filter((v) => v !== opt.id) : [...values, opt.id])}
            style={[styles.chip, active && styles.chipMultiActive]}
          >
            <Text style={[styles.chipText, active && styles.chipMultiTextActive]}>
              {active ? `✓ ${opt.label}` : opt.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Lista editable de textos cortos (indicaciones, contraindicaciones, sinónimos). */
export function TextListInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState('');

  function add() {
    const text = draft.trim();
    if (!text) return;
    if (!values.some((v) => v.toLowerCase() === text.toLowerCase())) onChange([...values, text]);
    setDraft('');
  }

  return (
    <View style={styles.listInput}>
      {values.length > 0 && (
        <View style={styles.listChips}>
          {values.map((v) => (
            <View key={v} style={styles.listChip}>
              <Text style={styles.listChipText}>{v}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Quitar ${v}`}
                onPress={() => onChange(values.filter((x) => x !== v))}
                hitSlop={12}
              >
                <X size={s(11)} color={colors.textSecondary} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
      <View style={styles.listAddRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={add}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          returnKeyType="done"
          submitBehavior="submit"
          style={styles.listTextInput}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Añadir"
          onPress={add}
          disabled={!draft.trim()}
          style={[styles.listAddBtn, !draft.trim() && styles.listAddBtnDisabled]}
        >
          <Plus size={s(14)} color={colors.navy} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    minHeight: 48,
    paddingHorizontal: s(12),
    paddingVertical: s(8),
  },
  sectionTexts: { flex: 1 },
  sectionTitle: {
    fontFamily: fonts.headingSemi,
    fontSize: fontSizes.sm,
    color: colors.navy,
  },
  sectionSummary: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: s(2),
  },
  sectionBody: {
    paddingHorizontal: s(12),
    paddingBottom: s(12),
    gap: s(12),
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: s(4),
  },
  chipsRow: {
    gap: s(6),
    paddingVertical: s(2),
  },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: s(10),
    borderRadius: radius.chip,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  chipMultiActive: {
    backgroundColor: colors.successBg,
    borderColor: colors.lime,
  },
  chipText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  chipTextActive: {
    fontFamily: fonts.bodyBold,
    color: colors.surface,
  },
  chipMultiTextActive: {
    fontFamily: fonts.bodySemi,
    color: colors.success,
  },
  listInput: { gap: s(6) },
  listChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: s(6),
  },
  listChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
    paddingHorizontal: s(10),
    paddingVertical: s(5),
    borderRadius: radius.chip,
    backgroundColor: colors.neutralChipBg,
  },
  listChipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.xs,
    color: colors.text,
  },
  listAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
  },
  listTextInput: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: s(10),
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  listAddBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.input,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listAddBtnDisabled: { opacity: 0.4 },
});
