import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheet, SheetFooter } from '@/components/ui/BottomSheet';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

import { FOOD_GROUP_LABELS, FOOD_GROUPS, FoodGroup } from '../planBuilderTypes';

const UNITS = ['g', 'ml', 'und', 'cucharada', 'taza'];

type Props = {
  visible: boolean;
  initialGroup: FoodGroup;
  onClose: () => void;
  onAdd: (group: FoodGroup, item: { name: string; quantity: string; reason?: string }) => void;
};

/**
 * Mockup ("Agregar alimento sugerido"): grupo, alimento, cantidad + unidad, motivo opcional.
 * El padre debe montar esto con una `key` que cambie en cada apertura (p. ej. un
 * contador que incrementa al abrir) — así arranca en `initialGroup` sin necesitar
 * un efecto que lo sincronice.
 */
export function AddFoodSheet({ visible, initialGroup, onClose, onAdd }: Props) {
  const [group, setGroup] = useState<FoodGroup>(initialGroup);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('g');
  const [reason, setReason] = useState('');

  function handleClose() {
    setName('');
    setAmount('');
    setUnit('g');
    setReason('');
    onClose();
  }

  function handleAdd() {
    if (name.trim().length === 0 || amount.trim().length === 0) return;
    onAdd(group, {
      name: name.trim(),
      quantity: `${amount.trim()} ${unit}`,
      reason: reason.trim() || undefined,
    });
    handleClose();
  }

  return (
    <BottomSheet visible={visible} onClose={handleClose} title="Agregar alimento sugerido">
      <Text style={styles.label}>Grupo</Text>
      <View style={styles.pillRow}>
        {FOOD_GROUPS.map((g) => {
          const selected = g === group;
          return (
            <Pressable key={g} onPress={() => setGroup(g)} style={[styles.pill, selected && styles.pillSelected]}>
              <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{FOOD_GROUP_LABELS[g]}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Alimento</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Ej: Filete de pescado"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />

      <Text style={styles.label}>Cantidad</Text>
      <View style={styles.quantityRow}>
        <TextInput
          value={amount}
          onChangeText={(v) => setAmount(v.replace(/[^0-9.,]/g, ''))}
          keyboardType="decimal-pad"
          placeholder="180"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, styles.quantityInput]}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitScroll}>
          <View style={styles.unitRow}>
            {UNITS.map((u) => {
              const selected = u === unit;
              return (
                <Pressable key={u} onPress={() => setUnit(u)} style={[styles.unitChip, selected && styles.unitChipSelected]}>
                  <Text style={[styles.unitChipText, selected && styles.unitChipTextSelected]}>{u}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <Text style={styles.label}>Motivo (opcional)</Text>
      <TextInput
        value={reason}
        onChangeText={setReason}
        placeholder="Alternativa sin mariscos, alergia del cliente"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />

      <SheetFooter
        onCancel={handleClose}
        onConfirm={handleAdd}
        confirmLabel="Agregar"
        confirmDisabled={name.trim().length === 0 || amount.trim().length === 0}
      />
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
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: s(5) },
  pill: {
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: s(6),
    paddingHorizontal: s(10),
  },
  pillSelected: { backgroundColor: colors.navy, borderColor: colors.navy },
  pillText: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary },
  pillTextSelected: { fontFamily: fonts.bodyBold, color: colors.surface },
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
  quantityRow: { flexDirection: 'row', gap: s(6), alignItems: 'center' },
  quantityInput: { flex: 1, maxWidth: s(100) },
  unitScroll: { maxWidth: s(180) },
  unitRow: { flexDirection: 'row', gap: s(5) },
  unitChip: {
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingVertical: s(8),
    paddingHorizontal: s(9),
  },
  unitChipSelected: { backgroundColor: colors.navy, borderColor: colors.navy },
  unitChipText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.xs, color: colors.textSecondary },
  unitChipTextSelected: { color: colors.surface },
});
