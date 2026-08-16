import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Check,
  Pencil,
  Plus,
  Users,
} from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AddFoodSheet } from '@/features/clients/components/AddFoodSheet';
import { PlanStepper } from '@/features/clients/components/PlanStepper';
import { usePlanBuilderStore } from '@/features/clients/planBuilderStore';
import {
  FOOD_GROUP_LABELS,
  FOOD_GROUPS,
  FoodGroup,
  FoodItem,
} from '@/features/clients/planBuilderTypes';
import { getClient } from '@/features/clients/repository';
import { formatGoal } from '@/lib/format';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

/**
 * Paso 2 ("Asistente de IA"): checklist por grupo, cantidad editable, + Agregar alimento.
 * Al confirmar, avanza al Paso 3 (Asignación a comidas).
 */
export default function AiAssistantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [clientName, setClientName] = useState('');
  const [goalLabel, setGoalLabel] = useState('');
  const [addFoodGroup, setAddFoodGroup] = useState<FoodGroup | null>(null);
  const [addFoodSheetNonce, setAddFoodSheetNonce] = useState(0);

  const [savingDraft, setSavingDraft] = useState(false);

  function openAddFoodSheet(group: FoodGroup) {
    setAddFoodGroup(group);
    setAddFoodSheetNonce((n) => n + 1);
  }

  const { suggestions, toggleFood, updateFoodQuantity, addFood, saveDraftToDb } =
    usePlanBuilderStore();

  useEffect(() => {
    getClient(id).then((c) => {
      setClientName(c.full_name);
      setGoalLabel(c.goal ? formatGoal(c.goal) : 'Sin especificar');
    });
  }, [id]);

  function handleContinueToAssign() {
    router.push(`/client/${id}/plans/assign`);
  }

  async function handleSaveDraft() {
    setSavingDraft(true);
    try {
      await saveDraftToDb(2);
      router.push(`/client/${id}`);
    } catch {
      setSavingDraft(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Asistente de IA"
        subtitle={`Objetivo: ${goalLabel}`}
        showBack
        showHome
        breadcrumbs={[
          { label: 'Clientes', href: '/', icon: Users },
          { label: clientName || 'Cliente', href: `/client/${id}` },
          { label: 'Paso 2: Alimentos IA' },
        ]}
      />
      <PlanStepper currentStep={2} clientId={id} />

      <ScrollView contentContainerStyle={styles.body}>
        {FOOD_GROUPS.map((group) => (
          <View key={group} style={styles.group}>
            <Text
              style={[
                styles.groupLabel,
                group === 'suplementos' && styles.groupLabelDanger,
              ]}
            >
              {FOOD_GROUP_LABELS[group]}
            </Text>
            {suggestions[group].map((item) => (
              <FoodRow
                key={item.id}
                item={item}
                onToggle={() => toggleFood(group, item.id)}
                onEditQuantity={(q) => updateFoodQuantity(group, item.id, q)}
              />
            ))}
            <Pressable
              onPress={() => openAddFoodSheet(group)}
              style={styles.addLinkRow}
            >
              <Plus size={s(13)} color={colors.textSecondary} />
              <Text style={styles.addLink}>Agregar alimento</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>

      {/* Footer fijo inferior con botones uno al lado del otro */}
      <View style={styles.footer}>
        <Button
          title={savingDraft ? 'Guardando…' : 'Guardar borrador'}
          variant="secondary"
          onPress={handleSaveDraft}
          loading={savingDraft}
          style={styles.footerBtnSide}
        />
        <Button
          title="Asignar comidas (Paso 3) →"
          onPress={handleContinueToAssign}
          style={styles.footerBtnMain}
        />
      </View>

      <AddFoodSheet
        key={addFoodSheetNonce}
        visible={addFoodGroup != null}
        initialGroup={addFoodGroup ?? 'carbohidratos'}
        onClose={() => setAddFoodGroup(null)}
        onAdd={addFood}
      />
    </View>
  );
}

function FoodRow({
  item,
  onToggle,
  onEditQuantity,
}: {
  item: FoodItem;
  onToggle: () => void;
  onEditQuantity: (quantity: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.quantity);

  function commit() {
    setEditing(false);
    if (draft.trim().length > 0) onEditQuantity(draft.trim());
    else setDraft(item.quantity);
  }

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onToggle}
        style={[styles.checkbox, item.checked && styles.checkboxChecked]}
      >
        {item.checked && <Check size={s(10)} color={colors.navy} strokeWidth={3} />}
      </Pressable>
      <Text style={styles.rowName}>{item.name}</Text>
      {editing ? (
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onBlur={commit}
          onSubmitEditing={commit}
          autoFocus
          style={styles.quantityInput}
        />
      ) : (
        <Pressable onPress={() => setEditing(true)} style={styles.quantityChip}>
          <Text style={styles.quantityText}>{item.quantity}</Text>
          <Pencil size={s(10)} color={colors.onNavyMuted} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { padding: s(16), gap: s(9), paddingBottom: s(32) },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    paddingHorizontal: s(16),
    paddingTop: s(10),
    paddingBottom: s(16),
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerBtnSide: {
    flex: 1,
  },
  footerBtnMain: {
    flex: 1.4,
  },
  group: { gap: s(5) },
  groupLabel: {
    fontFamily: fonts.headingSemi,
    fontSize: fontSizes.label,
    color: colors.success,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  groupLabelDanger: { color: colors.danger },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    paddingVertical: s(7),
    paddingHorizontal: s(9),
  },
  checkbox: {
    width: s(16),
    height: s(16),
    borderRadius: s(4),
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxChecked: { backgroundColor: colors.lime, borderColor: colors.lime },
  rowName: { flex: 1, fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.text },
  quantityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(4),
    backgroundColor: colors.background,
    borderRadius: s(6),
    paddingVertical: s(2),
    paddingHorizontal: s(6),
  },
  quantityText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
  },
  quantityInput: {
    width: s(70),
    backgroundColor: colors.background,
    borderRadius: s(6),
    paddingVertical: s(2),
    paddingHorizontal: s(6),
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.text,
  },
  addLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: s(4),
    paddingVertical: s(2),
  },
  addLink: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
  },
  error: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.danger },
});


