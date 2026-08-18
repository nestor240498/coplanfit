import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Pencil,
  Sparkles,
  Users,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppBackground } from '@/components/ui/AppBackground';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EditMealOptionSheet } from '@/features/clients/components/EditMealOptionSheet';
import { PlanStepper } from '@/features/clients/components/PlanStepper';
import { usePlanBuilderStore } from '@/features/clients/planBuilderStore';
import { createPlanVersion } from '@/features/clients/plansRepository';
import { getClient } from '@/features/clients/repository';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

type ActiveEditState = {
  slotId: string;
  mealName: string;
  optionKey: 'option1' | 'option2';
  currentText: string;
} | null;

/**
 * Paso 3 ("Asignación a comidas"): distribuye los alimentos sugeridos del Paso 2
 * en cada comida del día configurada en el Paso 1 (Opción 1 y Opción 2).
 * Abre un BottomSheet Drawer dedicado al tocar cualquier opción para seleccionar
 * alimentos por categorías con checks o editar manualmente.
 */
export default function MealAssignmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [clientName, setClientName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [savingDraft, setSavingDraft] = useState(false);

  // Estado del drawer de edición
  const [activeEdit, setActiveEdit] = useState<ActiveEditState>(null);

  const {
    mealSlots,
    waterLiters,
    supplements,
    aiNote,
    suggestions,
    mealAssignments,
    setMealAssignment,
    autoDistributeMeals,
    saveDraftToDb,
  } = usePlanBuilderStore();

  useEffect(() => {
    getClient(id).then((c) => setClientName(c.full_name));

    // Si aún no hay asignaciones creadas, generar una distribución inicial automática
    const hasAnyAssignment = Object.values(mealAssignments).some(
      (a) => a.option1.trim().length > 0 || a.option2.trim().length > 0
    );
    if (!hasAnyAssignment && mealSlots.length > 0) {
      autoDistributeMeals();
    }
  }, [id, mealSlots, mealAssignments, autoDistributeMeals]);

  function openEditDrawer(slotId: string, mealName: string, optionKey: 'option1' | 'option2') {
    const currentAssignment = mealAssignments[slotId] ?? { option1: '', option2: '' };
    setActiveEdit({
      slotId,
      mealName,
      optionKey,
      currentText: currentAssignment[optionKey] || '',
    });
  }

  async function handleSaveDraft() {
    setSavingDraft(true);
    try {
      await saveDraftToDb(3);
      router.push(`/client/${id}`);
    } catch (e) {
      setError((e as Error).message);
      setSavingDraft(false);
    }
  }

  async function handleSavePlan() {
    setSaving(true);
    setError(null);
    try {
      await createPlanVersion(id, {
        mealSlots,
        waterLiters,
        supplements,
        aiNote,
        suggestions,
        meals: mealAssignments,
      });
      router.push(`/client/${id}/plans/preview`);
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <AppBackground />
      <ScreenHeader
        title="Asignar comidas"
        subtitle={`${clientName} · menú diario`}
        showBack
        showHome
        breadcrumbs={[
          { label: 'Clientes', href: '/', icon: Users },
          { label: clientName || 'Cliente', href: `/client/${id}` },
          { label: 'Paso 3: Asignar comidas' },
        ]}
      />
      <PlanStepper currentStep={3} clientId={id} />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View style={styles.introWrap}>
            <Text style={styles.sectionTitle}>Distribución del menú</Text>
            <Text style={styles.sectionSubtitle}>
              Toca cualquier opción para abrir el selector y ajustar alimentos.
            </Text>
          </View>
          <Pressable style={styles.autoButton} onPress={autoDistributeMeals}>
            <Sparkles size={s(13)} color={colors.navy} />
            <Text style={styles.autoButtonText}>Autocompletar</Text>
          </Pressable>
        </View>

        {mealSlots.map((slot) => {
          const assignment = mealAssignments[slot.id] ?? { option1: '', option2: '' };

          return (
            <View key={slot.id} style={styles.mealCard}>
              <View style={styles.mealCardHeader}>
                <View style={styles.mealCardTitleRow}>
                  <Text style={styles.mealName}>{slot.name}</Text>
                  <View style={styles.timeBadge}>
                    <Text style={styles.timeBadgeText}>{slot.time}</Text>
                  </View>
                </View>
                <Text style={styles.mealType}>
                  {slot.type === 'merienda' ? 'Merienda' : 'Comida principal'}
                </Text>
              </View>

              {/* Bloque Opción 1 */}
              <Pressable
                onPress={() => openEditDrawer(slot.id, slot.name, 'option1')}
                style={styles.optionCard}
              >
                <View style={styles.optionCardHeader}>
                  <Text style={styles.optionTag}>OPCIÓN 1</Text>
                  <View style={styles.editActionRow}>
                    <Pencil size={s(11)} color={colors.navy} />
                    <Text style={styles.editActionText}>Editar</Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.optionContentText,
                    assignment.option1.trim().length === 0 && styles.optionContentEmpty,
                  ]}
                >
                  {assignment.option1.trim() || 'Sin asignar (toca para seleccionar)'}
                </Text>
              </Pressable>

              {/* Bloque Opción 2 */}
              <Pressable
                onPress={() => openEditDrawer(slot.id, slot.name, 'option2')}
                style={styles.optionCard}
              >
                <View style={styles.optionCardHeader}>
                  <Text style={styles.optionTag}>OPCIÓN 2</Text>
                  <View style={styles.editActionRow}>
                    <Pencil size={s(11)} color={colors.navy} />
                    <Text style={styles.editActionText}>Editar</Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.optionContentText,
                    assignment.option2.trim().length === 0 && styles.optionContentEmpty,
                  ]}
                >
                  {assignment.option2.trim() || 'Sin asignar (toca para seleccionar)'}
                </Text>
              </Pressable>
            </View>
          );
        })}

        {error != null && <Text style={styles.error}>{error}</Text>}
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
          title={saving ? 'Guardando…' : 'Guardar \n(Ver vista previa)'}
          onPress={handleSavePlan}
          loading={saving}
          style={styles.footerBtnMain}
        />
      </View>

      {/* Drawer BottomSheet para editar la opción seleccionada */}
      {activeEdit && (
        <EditMealOptionSheet
          visible={activeEdit !== null}
          mealName={activeEdit.mealName}
          optionKey={activeEdit.optionKey}
          initialText={activeEdit.currentText}
          onClose={() => setActiveEdit(null)}
          onSave={(updatedText) => {
            setMealAssignment(activeEdit.slotId, activeEdit.optionKey, updatedText);
            setActiveEdit(null);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: {
    paddingHorizontal: s(16),
    paddingBottom: s(30),
    gap: s(10),
  },
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: s(2),
    gap: s(8),
    paddingHorizontal: s(8),
    paddingVertical: s(8),
  },
  introWrap: { flex: 1
     },
  sectionTitle: {
    fontFamily: fonts.headingSemi,
    fontSize: fontSizes.sm,
    color: colors.navy,
  },
  sectionSubtitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  autoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(4),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.lime,
    borderRadius: radius.input,
    paddingVertical: s(6),
    paddingHorizontal: s(10),
  },
  autoButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.navy,
  },
  mealCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: s(12),
    borderWidth: 1,
    borderColor: colors.border,
    gap: s(8),
    marginBottom: s(5)
  },
  mealCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: s(6),
  },
  mealCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
  },
  mealName: {
    fontFamily: fonts.headingSemi,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  timeBadge: {
    backgroundColor: colors.background,
    borderRadius: s(4),
    paddingVertical: s(2),
    paddingHorizontal: s(6),
  },
  timeBadgeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
  },
  mealType: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  optionCard: {
    backgroundColor: '#F7F8FA',
    borderRadius: radius.input,
    padding: s(10),
    gap: s(4),
    borderWidth: 1,
    borderColor: '#E4E7ED',
  },
  optionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionTag: {
    fontFamily: fonts.bodyBold,
    fontSize: s(9),
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  editActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(4),
  },
  editActionText: {
    fontFamily: fonts.bodySemi,
    fontSize: s(9),
    color: colors.navy,
  },
  optionContentText: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.xs,
    color: colors.text,
    lineHeight: s(16),
  },
  optionContentEmpty: {
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  error: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.danger },
});


