import { Check, ChevronDown, ChevronRight, ChevronUp, Plus, Sparkles, X } from 'lucide-react-native';
import { ReactNode, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { hapticSelection } from '@/lib/motion';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

type Option<T extends string> = { id: T; label: string; hint?: string; description?: string };

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

/** Marca de «lo rellenó la IA»: desaparece en cuanto el entrenador cambia ese campo. */
export function AiBadge() {
  return (
    <View style={styles.aiBadge} accessibilityLabel="Propuesto por la IA">
      <Sparkles size={11} color={colors.success} />
      <Text style={styles.aiBadgeText}>IA</Text>
    </View>
  );
}

export function FieldLabel({ children, ai }: { children: string; ai?: boolean }) {
  return (
    <View style={styles.labelRow}>
      <Text style={styles.label}>{children}</Text>
      {ai ? <AiBadge /> : null}
    </View>
  );
}

/** Pocas opciones (2-4) a la vista, en varias líneas si hace falta; selección única. */
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
    <View style={styles.chipsWrap} accessibilityRole="radiogroup">
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <Pressable
            key={opt.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (!active) hapticSelection();
              onChange(opt.id);
            }}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Fila que muestra lo elegido y abre una hoja con todas las opciones. */
function SelectRow({
  label,
  value,
  empty,
  ai,
  onPress,
}: {
  label: string;
  value: string | null;
  empty: string;
  ai?: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      pressedScale={0.99}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value ?? empty}${ai ? ', propuesto por la IA' : ''}. Cambiar`}
      onPress={() => {
        // El teclado taparía la hoja de opciones
        Keyboard.dismiss();
        onPress();
      }}
      style={[styles.selectRow, ai && styles.selectRowAi]}
    >
      <View style={styles.selectTexts}>
        <View style={styles.labelRow}>
          <Text style={styles.selectLabel}>{label}</Text>
          {ai ? <AiBadge /> : null}
        </View>
        <Text style={[styles.selectValue, !value && styles.selectValueEmpty]}>{value ?? empty}</Text>
      </View>
      <ChevronRight size={18} color={colors.textMuted} />
    </PressableScale>
  );
}

/** Selección única con hoja: para listas largas (músculos, equipo, patrón…). */
export function SelectField<T extends string>({
  label,
  options,
  value,
  onChange,
  ai,
  empty = 'Sin elegir',
  sheetTitle,
}: {
  label: string;
  options: Option<T>[];
  value: T | null | undefined;
  onChange: (value: T) => void;
  ai?: boolean;
  empty?: string;
  sheetTitle?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value) ?? null;
  // Con explicación por opción se usa una lista; si no, todas las opciones como chips a la vista
  const detailed = options.some((o) => o.hint || o.description);

  function choose(id: T) {
    if (id !== value) hapticSelection();
    onChange(id);
    setOpen(false);
  }

  return (
    <>
      <SelectRow label={label} value={selected?.label ?? null} empty={empty} ai={ai} onPress={() => setOpen(true)} />
      <BottomSheet visible={open} onClose={() => setOpen(false)} title={sheetTitle ?? label}>
        <ScrollView style={styles.sheetScroll} contentContainerStyle={detailed ? styles.optionList : styles.chipsWrap}>
          {options.map((opt) => {
            const active = opt.id === value;
            if (detailed) {
              return (
                <Pressable
                  key={opt.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  onPress={() => choose(opt.id)}
                  style={[styles.optionRow, active && styles.optionRowActive]}
                >
                  <View style={styles.selectTexts}>
                    <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>{opt.label}</Text>
                    {opt.hint || opt.description ? (
                      <Text style={styles.optionHint}>{opt.hint ? `Ej.: ${opt.hint}` : opt.description}</Text>
                    ) : null}
                  </View>
                  {active ? <Check size={18} color={colors.navy} strokeWidth={2.5} /> : null}
                </Pressable>
              );
            }
            return (
              <Pressable
                key={opt.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => choose(opt.id)}
                style={[styles.sheetChip, active && styles.chipActive]}
              >
                <Text style={[styles.sheetChipText, active && styles.chipTextActive]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </BottomSheet>
    </>
  );
}

/** Selección múltiple con hoja: se marcan varias y se confirma con «Listo». */
export function MultiSelectField<T extends string>({
  label,
  options,
  values,
  onChange,
  ai,
  empty = 'Ninguno',
  sheetTitle,
  sheetHint,
}: {
  label: string;
  options: Option<T>[];
  values: T[];
  onChange: (values: T[]) => void;
  ai?: boolean;
  empty?: string;
  sheetTitle?: string;
  sheetHint?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<T[]>(values);
  const summary = options.filter((o) => values.includes(o.id)).map((o) => o.label).join(', ');

  function openSheet() {
    setDraft(values);
    setOpen(true);
  }

  function toggle(id: T) {
    hapticSelection();
    setDraft((d) => (d.includes(id) ? d.filter((v) => v !== id) : [...d, id]));
  }

  return (
    <>
      <SelectRow label={label} value={summary || null} empty={empty} ai={ai} onPress={openSheet} />
      <BottomSheet visible={open} onClose={() => setOpen(false)} title={sheetTitle ?? label}>
        {sheetHint ? <Text style={styles.sheetHint}>{sheetHint}</Text> : null}
        <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.chipsWrap}>
          {options.map((opt) => {
            const active = draft.includes(opt.id);
            return (
              <Pressable
                key={opt.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
                onPress={() => toggle(opt.id)}
                style={[styles.sheetChip, active && styles.chipMultiActive]}
              >
                {active ? <Check size={14} color={colors.success} strokeWidth={3} /> : null}
                <Text style={[styles.sheetChipText, active && styles.chipMultiTextActive]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.sheetFooter}>
          {draft.length > 0 ? (
            <Pressable accessibilityRole="button" onPress={() => setDraft([])} style={styles.clearBtn}>
              <Text style={styles.clearText}>Quitar todos</Text>
            </Pressable>
          ) : null}
          <Button
            title={draft.length > 0 ? `Listo (${draft.length})` : 'Listo'}
            onPress={() => {
              onChange(draft);
              setOpen(false);
            }}
            style={styles.doneBtn}
          />
        </View>
      </BottomSheet>
    </>
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
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: s(6) },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: s(4),
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
    backgroundColor: colors.successBg,
    marginBottom: s(4),
  },
  aiBadgeText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.micro, color: colors.success },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: s(8) },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    minHeight: 56,
    paddingHorizontal: s(12),
    paddingVertical: s(8),
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  // Lo rellenó la IA: borde lima hasta que el entrenador lo revise y cambie
  selectRowAi: { borderColor: colors.lime, backgroundColor: '#FAFDF5' },
  selectTexts: { flex: 1, gap: 2 },
  selectLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: s(4),
  },
  selectValue: { fontFamily: fonts.bodySemi, fontSize: fontSizes.base, color: colors.navy },
  selectValueEmpty: { fontFamily: fonts.body, color: colors.textMuted },
  sheetScroll: { maxHeight: 420 },
  sheetHint: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary, marginBottom: s(4) },
  sheetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(5),
    minHeight: 44,
    paddingHorizontal: s(14),
    borderRadius: radius.chip,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetChipText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.text },
  optionList: { gap: s(6) },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    minHeight: 56,
    paddingHorizontal: s(12),
    paddingVertical: s(8),
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionRowActive: { borderColor: colors.navy, backgroundColor: colors.background },
  optionLabel: { fontFamily: fonts.bodySemi, fontSize: fontSizes.base, color: colors.text },
  optionLabelActive: { color: colors.navy },
  optionHint: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary },
  sheetFooter: { flexDirection: 'row', alignItems: 'center', gap: s(8), marginTop: s(10) },
  clearBtn: { minHeight: 48, paddingHorizontal: s(12), justifyContent: 'center' },
  clearText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.textSecondary },
  doneBtn: { flex: 1 },
  chip: {
    minHeight: 44,
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
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
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
