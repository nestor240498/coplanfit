import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheet, SheetFooter } from '@/components/ui/BottomSheet';
import { WheelColumn } from '@/components/ui/WheelPicker';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

import { MealSlot, MealType } from '../planBuilderTypes';

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];
const PERIODS = ['AM', 'PM'];

type Props = {
  visible: boolean;
  onClose: () => void;
  onAdd: (slot: MealSlot) => void;
};

/** Mockup ("Agregar comida"): nombre, tipo (Comida/Merienda), hora tipo rueda hora/min/AM-PM. */
export function AddMealSheet({ visible, onClose, onAdd }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState<MealType>('comida');
  const [hour, setHour] = useState('08');
  const [minute, setMinute] = useState('00');
  const [period, setPeriod] = useState('AM');

  function handleClose() {
    setName('');
    setType('comida');
    setHour('08');
    setMinute('00');
    setPeriod('AM');
    onClose();
  }

  function handleAdd() {
    if (name.trim().length === 0) return;
    onAdd({
      id: `slot-${Date.now()}`,
      name: name.trim(),
      type,
      time: `${Number(hour)}:${minute}${period.toLowerCase()}`,
    });
    handleClose();
  }

  return (
    <BottomSheet visible={visible} onClose={handleClose} title="Agregar comida">
      <Text style={styles.label}>Nombre</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Merienda 2"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />

      <Text style={styles.label}>Tipo</Text>
      <View style={styles.typeRow}>
        {(['comida', 'merienda'] as MealType[]).map((t) => {
          const selected = t === type;
          return (
            <Pressable key={t} onPress={() => setType(t)} style={[styles.typePill, selected && styles.typePillSelected]}>
              <Text style={[styles.typePillText, selected && styles.typePillTextSelected]}>
                {t === 'comida' ? 'Comida' : 'Merienda'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Hora recomendada</Text>
      <View style={styles.wheelRow}>
        <WheelColumn options={HOURS} value={hour} onChange={setHour} />
        <WheelColumn options={MINUTES} value={minute} onChange={setMinute} />
        <WheelColumn options={PERIODS} value={period} onChange={setPeriod} />
      </View>

      <SheetFooter onCancel={handleClose} onConfirm={handleAdd} confirmLabel="Guardar" confirmDisabled={name.trim().length === 0} />
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
    height: s(36),
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: s(10),
    fontFamily: fonts.body,
    fontSize: fontSizes.base,
    color: colors.text,
  },
  typeRow: { flexDirection: 'row', gap: s(6) },
  typePill: {
    flex: 1,
    height: s(32),
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typePillSelected: { backgroundColor: colors.navy, borderColor: colors.navy },
  typePillText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },
  typePillTextSelected: { fontFamily: fonts.bodyBold, color: colors.surface },
  wheelRow: {
    flexDirection: 'row',
    gap: s(6),
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.card,
    paddingVertical: s(10),
    paddingHorizontal: s(6),
  },
});
