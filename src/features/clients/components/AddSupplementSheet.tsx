import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

import { Supplement, SUPPLEMENT_SCHEDULES, SupplementSchedule } from '../planBuilderTypes';

const NEEDS_DETAIL: SupplementSchedule[] = ['Después de una comida', 'Después de cierta hora'];

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Si se pasa, la hoja edita ese suplemento (muestra "Eliminar" en vez de "Cancelar"). */
  editing?: Supplement | null;
  onSave: (supplement: Supplement) => void;
  onDelete?: (id: string) => void;
};

/**
 * Mockup ("Agregar/Editar suplemento"): nombre, dosis, lista de horarios tipo radio.
 * El padre debe montar esto con una `key` que cambie en cada apertura (p. ej. un
 * contador que incrementa al abrir) — así el estado arranca limpio sin necesitar
 * un efecto que sincronice desde `editing`.
 */
export function AddSupplementSheet({ visible, onClose, editing, onSave, onDelete }: Props) {
  const [name, setName] = useState(editing?.name ?? '');
  const [dose, setDose] = useState(editing?.dose ?? '');
  const [schedule, setSchedule] = useState<SupplementSchedule>(editing?.schedule ?? 'Cualquier hora');
  const [detail, setDetail] = useState(editing?.scheduleDetail ?? '');

  function handleSave() {
    if (name.trim().length === 0) return;
    onSave({
      id: editing?.id ?? `sup-${Date.now()}`,
      name: name.trim(),
      dose: dose.trim(),
      schedule,
      scheduleDetail: NEEDS_DETAIL.includes(schedule) ? detail.trim() : undefined,
    });
    onClose();
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title={editing ? 'Editar suplemento' : 'Agregar suplemento'}>
      <Text style={styles.label}>Nombre</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Ej: Omega 3"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />
      <Text style={styles.label}>Dosis</Text>
      <TextInput
        value={dose}
        onChangeText={setDose}
        placeholder="Ej: 1 cápsula"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />
      <Text style={styles.label}>Horario</Text>
      {SUPPLEMENT_SCHEDULES.map((option) => {
        const selected = option === schedule;
        return (
          <Pressable key={option} onPress={() => setSchedule(option)} style={[styles.scheduleRow, selected && styles.scheduleRowSelected]}>
            <Text style={[styles.scheduleText, selected && styles.scheduleTextSelected]}>{option}</Text>
            <View style={[styles.radio, selected && styles.radioSelected]}>{selected && <Text style={styles.radioMark}>✓</Text>}</View>
          </Pressable>
        );
      })}
      {NEEDS_DETAIL.includes(schedule) && (
        <TextInput
          value={detail}
          onChangeText={setDetail}
          placeholder={schedule === 'Después de una comida' ? 'Ej: después del almuerzo' : 'Ej: después de las 6pm'}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, styles.detailInput]}
        />
      )}

      <View style={styles.footer}>
        {editing ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              onDelete?.(editing.id);
              onClose();
            }}
            style={styles.deleteBtn}
          >
            <Text style={styles.deleteText}>Eliminar</Text>
          </Pressable>
        ) : (
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={handleSave}
          disabled={name.trim().length === 0}
          style={[styles.saveBtn, editing && styles.saveBtnWide, name.trim().length === 0 && styles.saveBtnDisabled]}
        >
          <Text style={styles.saveText}>{editing ? 'Guardar' : 'Agregar'}</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: s(4),
  },
  input: {
    height: s(34),
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: s(10),
    fontFamily: fonts.body,
    fontSize: fontSizes.base,
    color: colors.text,
  },
  detailInput: { marginTop: s(2) },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: s(7),
    paddingHorizontal: s(10),
    borderRadius: radius.input,
  },
  scheduleRowSelected: { backgroundColor: colors.successBg },
  scheduleText: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.text },
  scheduleTextSelected: { fontFamily: fonts.bodyBold, color: colors.navy },
  radio: {
    width: s(14),
    height: s(14),
    borderRadius: s(7),
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { backgroundColor: colors.lime, borderColor: colors.lime },
  radioMark: { fontFamily: fonts.bodyBold, fontSize: s(9), color: colors.surface },
  footer: { flexDirection: 'row', gap: s(8), marginTop: s(6) },
  cancelBtn: {
    flex: 1,
    height: s(38),
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.textSecondary },
  deleteBtn: {
    flex: 1,
    height: s(38),
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.xs, color: colors.danger },
  saveBtn: {
    flex: 1,
    height: s(38),
    borderRadius: radius.button,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnWide: { flex: 2 },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.navy },
});
