import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertTriangle,
  Check,
  Droplets,
  GripVertical,
  Pill,
  Plus,
  Trash2,
  Users,
  Utensils,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppBackground } from '@/components/ui/AppBackground';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AddMealSheet } from '@/features/clients/components/AddMealSheet';
import { AddSupplementSheet } from '@/features/clients/components/AddSupplementSheet';
import { AiPreloaderModal } from '@/features/clients/components/AiPreloaderModal';
import { PlanStepper } from '@/features/clients/components/PlanStepper';
import { usePlanBuilderStore } from '@/features/clients/planBuilderStore';
import { Supplement } from '@/features/clients/planBuilderTypes';
import { getClient } from '@/features/clients/repository';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

function scheduleSummary(sup: Supplement): string {
  if (sup.scheduleDetail && sup.scheduleDetail.trim().length > 0) {
    return sup.scheduleDetail.trim();
  }
  return sup.schedule;
}

// Wrapper nativo Web para soportar HTML5 Drag & Drop al 100%
function DraggableRowWrapper({
  children,
  index,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  style,
}: {
  children: React.ReactNode;
  index: number;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (idx: number, e: any) => void;
  onDragOver: (idx: number, e: any) => void;
  onDragLeave: (idx: number) => void;
  onDrop: (idx: number, e: any) => void;
  onDragEnd: () => void;
  style?: any;
}) {
  if (Platform.OS === 'web') {
    return (
      <div
        draggable
        onDragStart={(e) => onDragStart(index, e)}
        onDragOver={(e) => onDragOver(index, e)}
        onDragLeave={() => onDragLeave(index)}
        onDrop={(e) => onDrop(index, e)}
        onDragEnd={onDragEnd}
        style={{
          cursor: 'grab',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          backgroundColor: '#FFFFFF',
          borderRadius: 8,
          padding: '6px 8px',
          border: isDragOver ? '2px solid #8BC53F' : '1px solid #DDE2EA',
          opacity: isDragging ? 0.4 : 1,
          transition: 'border 0.15s ease, opacity 0.15s ease',
          boxSizing: 'border-box',
          width: '100%',
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <View
      style={[
        styles.row,
        isDragging && styles.rowDragging,
        isDragOver && styles.rowDragOver,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export default function PlanBuilderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [clientName, setClientName] = useState('');
  const [mealSheetOpen, setMealSheetOpen] = useState(false);
  const [editingSupplement, setEditingSupplement] = useState<Supplement | null | undefined>(undefined);
  const [supplementSheetNonce, setSupplementSheetNonce] = useState(0);
  const [noSupplements, setNoSupplements] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);

  // Estados para Drag & Drop visual
  const [draggingMealIdx, setDraggingMealIdx] = useState<number | null>(null);
  const [dragOverMealIdx, setDragOverMealIdx] = useState<number | null>(null);

  const [draggingSupIdx, setDraggingSupIdx] = useState<number | null>(null);
  const [dragOverSupIdx, setDragOverSupIdx] = useState<number | null>(null);

  function openSupplementSheet(sup: Supplement | null) {
    setEditingSupplement(sup);
    setSupplementSheetNonce((n) => n + 1);
  }

  const {
    mealSlots,
    waterLiters,
    supplements,
    aiNote,
    generating,
    generateError,
    initBuilderForNewPlan,
    addMealSlot,
    removeMealSlot,
    moveMealSlot,
    setWaterLiters,
    addSupplement,
    updateSupplement,
    removeSupplement,
    moveSupplement,
    setAiNote,
    generateSuggestions,
    saveDraftToDb,
  } = usePlanBuilderStore();

  useEffect(() => {
    initBuilderForNewPlan(id);
    getClient(id).then((c) => setClientName(c.full_name)).catch(() => {});
  }, [id, initBuilderForNewPlan]);

  async function handleSaveDraft() {
    setSavingDraft(true);
    try {
      await saveDraftToDb(1);
      router.push(`/client/${id}`);
    } catch (e) {
      setValidationError((e as Error).message);
      setSavingDraft(false);
    }
  }

  async function handleGenerate() {
    if (mealSlots.length === 0) {
      setValidationError('Debes configurar al menos una comida del día.');
      return;
    }
    const waterNum = Number(waterLiters.replace(',', '.'));
    if (!waterLiters.trim() || Number.isNaN(waterNum) || waterNum <= 0) {
      setValidationError('Debes ingresar los litros de agua objetivo (ej: 2.5).');
      return;
    }
    if (!noSupplements && supplements.length === 0) {
      setValidationError('Agrega al menos un suplemento o marca la casilla si el cliente no toma suplementos.');
      return;
    }

    setValidationError(null);

    try {
      await saveDraftToDb(1);
    } catch {
      // Si falla guardar borrador en BD no bloqueamos la generación con IA
    }

    await generateSuggestions();
    if (usePlanBuilderStore.getState().generateError == null) {
      router.push(`/client/${id}/plans/assistant`);
    }
  }

  return (
    <View style={styles.screen}>
      <AppBackground />
      <ScreenHeader
        title="Constructor de plan"
        subtitle={`${clientName} · Configuración base`}
        showBack
        showHome
        breadcrumbs={[
          { label: 'Clientes', href: '/', icon: Users },
          { label: clientName || 'Cliente', href: `/client/${id}` },
          { label: 'Paso 1: Configuración' },
        ]}
      />
      <PlanStepper currentStep={1} clientId={id} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Utensils size={s(14)} color={colors.navy} />
            <Text style={styles.sectionLabel}>
              Comidas del día <Text style={styles.requiredStar}>*</Text>
            </Text>
          </View>
          <Text style={styles.sectionCount}>{mealSlots.length}</Text>
        </View>
        {mealSlots.map((slot, index) => {
          const isDragging = draggingMealIdx === index;
          const isDragOver = dragOverMealIdx === index;
          return (
            <DraggableRowWrapper
              key={slot.id}
              index={index}
              isDragging={isDragging}
              isDragOver={isDragOver}
              onDragStart={(idx, e) => {
                e.dataTransfer?.setData('text/plain', String(idx));
                setDraggingMealIdx(idx);
              }}
              onDragOver={(idx, e) => {
                e.preventDefault();
                if (dragOverMealIdx !== idx) setDragOverMealIdx(idx);
              }}
              onDragLeave={(idx) => {
                if (dragOverMealIdx === idx) setDragOverMealIdx(null);
              }}
              onDragEnd={() => {
                setDraggingMealIdx(null);
                setDragOverMealIdx(null);
              }}
              onDrop={(idx, e) => {
                e.preventDefault();
                const fromStr = e.dataTransfer?.getData('text/plain');
                const fromIdx = fromStr ? parseInt(fromStr, 10) : draggingMealIdx;
                if (fromIdx !== null && !isNaN(fromIdx) && fromIdx !== idx) {
                  moveMealSlot(fromIdx, idx);
                }
                setDraggingMealIdx(null);
                setDragOverMealIdx(null);
              }}
            >
              <View style={styles.dragHandleCol}>
                <GripVertical size={s(14)} color={colors.textMuted} />
              </View>
              <Text style={styles.rowName}>{slot.name}</Text>
              <View style={styles.timeBadge}>
                <Text style={styles.timeBadgeText}>{slot.time}</Text>
              </View>
              <Pressable accessibilityLabel={`Quitar ${slot.name}`} onPress={() => removeMealSlot(slot.id)} hitSlop={8}>
                <Trash2 size={s(13)} color={colors.textMuted} />
              </Pressable>
            </DraggableRowWrapper>
          );
        })}
        <Pressable onPress={() => setMealSheetOpen(true)} style={styles.dashedRow}>
          <Plus size={s(13)} color={colors.textSecondary} />
          <Text style={styles.dashedRowText}>Agregar comida</Text>
        </Pressable>

        <View style={styles.sectionTitleRow}>
          <Droplets size={s(14)} color="#38BDF8" />
          <Text style={[styles.sectionLabel, styles.sectionSpacing]}>
            Hidratación <Text style={styles.requiredStar}>*</Text>
          </Text>
        </View>
        <View style={styles.waterRow}>
          <View style={styles.waterBox}>
            <TextInput
              value={waterLiters}
              onChangeText={(v) => {
                setWaterLiters(v.replace(/[^0-9.,]/g, ''));
                if (validationError) setValidationError(null);
              }}
              keyboardType="decimal-pad"
              placeholder="—"
              placeholderTextColor={colors.textMuted}
              style={styles.waterInput}
            />
            <Text style={styles.waterSuffix}>L</Text>
          </View>
        </View>

        <View style={[styles.sectionHeader, styles.sectionSpacing]}>
          <View style={styles.sectionTitleRow}>
            <Pill size={s(14)} color="#F87171" />
            <Text style={styles.sectionLabel}>
              Suplementación <Text style={styles.requiredStar}>*</Text>
            </Text>
          </View>
          <Text style={styles.sectionCount}>{supplements.length}</Text>
        </View>
        
        <Pressable
          onPress={() => {
            setNoSupplements((v) => !v);
            if (validationError) setValidationError(null);
          }}
          style={styles.noSupRow}
        >
          <View style={[styles.checkbox, noSupplements && styles.checkboxChecked]}>
            {noSupplements && <Check size={s(10)} color={colors.navy} strokeWidth={3} />}
          </View>
          <Text style={styles.noSupText}>El cliente no toma suplementos actualmente</Text>
        </Pressable>

        {!noSupplements && (
          <>
            {supplements.map((sup, index) => {
              const isDragging = draggingSupIdx === index;
              const isDragOver = dragOverSupIdx === index;
              return (
                <DraggableRowWrapper
                  key={sup.id}
                  index={index}
                  isDragging={isDragging}
                  isDragOver={isDragOver}
                  onDragStart={(idx, e) => {
                    e.dataTransfer?.setData('text/plain', String(idx));
                    setDraggingSupIdx(idx);
                  }}
                  onDragOver={(idx, e) => {
                    e.preventDefault();
                    if (dragOverSupIdx !== idx) setDragOverSupIdx(idx);
                  }}
                  onDragLeave={(idx) => {
                    if (dragOverSupIdx === idx) setDragOverSupIdx(null);
                  }}
                  onDragEnd={() => {
                    setDraggingSupIdx(null);
                    setDragOverSupIdx(null);
                  }}
                  onDrop={(idx, e) => {
                    e.preventDefault();
                    const fromStr = e.dataTransfer?.getData('text/plain');
                    const fromIdx = fromStr ? parseInt(fromStr, 10) : draggingSupIdx;
                    if (fromIdx !== null && !isNaN(fromIdx) && fromIdx !== idx) {
                      moveSupplement(fromIdx, idx);
                    }
                    setDraggingSupIdx(null);
                    setDragOverSupIdx(null);
                  }}
                >
                  <View style={styles.dragHandleCol}>
                    <GripVertical size={s(14)} color={colors.textMuted} />
                  </View>
                  <Pressable onPress={() => openSupplementSheet(sup)} style={styles.rowInfo}>
                    <Text style={styles.rowName}>{sup.name}</Text>
                    <Text style={styles.rowMeta}>{sup.dose} · {scheduleSummary(sup)}</Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`Quitar ${sup.name}`}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      removeSupplement(sup.id);
                    }}
                    hitSlop={8}
                  >
                    <Trash2 size={s(13)} color={colors.textMuted} />
                  </Pressable>
                </DraggableRowWrapper>
              );
            })}
            <Pressable onPress={() => openSupplementSheet(null)} style={styles.dashedRow}>
              <Plus size={s(13)} color={colors.textSecondary} />
              <Text style={styles.dashedRowText}>Agregar suplemento</Text>
            </Pressable>
          </>
        )}

        <Text style={[styles.sectionLabel, styles.sectionSpacing]}>Nota adicional para la IA</Text>
        <TextInput
          value={aiNote}
          onChangeText={setAiNote}
          multiline
          numberOfLines={3}
          placeholder="Ej: prefiere pollo sobre pescado, evitar lácteos esta semana…"
          placeholderTextColor={colors.textMuted}
          style={styles.notes}
        />

        {validationError != null && (
          <View style={styles.validationBox}>
            <AlertTriangle size={s(14)} color={colors.danger} />
            <Text style={styles.validationText}>{validationError}</Text>
          </View>
        )}

        {generateError != null && <Text style={styles.error}>{generateError}</Text>}
      </ScrollView>

      {/* Footer fijo con botones uno al lado del otro */}
      <View style={styles.footer}>
        <Button
          title={savingDraft ? 'Guardando…' : 'Guardar borrador'}
          variant="secondary"
          onPress={handleSaveDraft}
          loading={savingDraft}
          style={styles.footerBtnSide}
        />
        <Button
          title={generating ? 'Generando…' : 'Generar IA \n(Paso 2) →'}
          onPress={handleGenerate}
          loading={generating}
          style={styles.footerBtnMain}
        />
      </View>

      <AddMealSheet visible={mealSheetOpen} onClose={() => setMealSheetOpen(false)} onAdd={addMealSlot} />
      <AddSupplementSheet
        key={supplementSheetNonce}
        visible={editingSupplement !== undefined}
        editing={editingSupplement ?? null}
        onClose={() => setEditingSupplement(undefined)}
        onSave={(sup) => (editingSupplement ? updateSupplement(sup) : addSupplement(sup))}
        onDelete={removeSupplement}
      />
      <AiPreloaderModal visible={generating} clientName={clientName} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { padding: s(16), gap: s(6) },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: s(6) },
  sectionSpacing: { marginTop: s(6) },
  sectionLabel: {
    fontFamily: fonts.headingSemi,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  sectionCount: { fontFamily: fonts.body, fontSize: fontSizes.label, color: colors.textMuted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    paddingVertical: s(6),
    paddingHorizontal: s(8),
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowName: { flex: 1, fontFamily: fonts.bodySemi, fontSize: fontSizes.xs, color: colors.text },
  timeBadge: { width: s(62), backgroundColor: colors.background, borderRadius: s(6), paddingVertical: s(4), paddingHorizontal: s(6) },
  timeBadgeText: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary, textAlign: 'center' },
  scheduleBadge: { maxWidth: s(110), backgroundColor: colors.background, borderRadius: s(6), paddingVertical: s(4), paddingHorizontal: s(6) },
  scheduleBadgeText: { fontFamily: fonts.body, fontSize: fontSizes.label, color: colors.textSecondary, textAlign: 'center' },
  dashedRow: {
    flexDirection: 'row',
    gap: s(6),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#C7CEDB',
    borderRadius: radius.input,
    paddingVertical: s(6),
  },
  dashedRowText: { fontFamily: fonts.bodySemi, fontSize: fontSizes.xs, color: colors.textSecondary },
  waterRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    padding: s(8),
    borderWidth: 1,
    borderColor: colors.border,
  },
  waterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: s(4),
  },
  waterInput: { fontFamily: fonts.bodyBold, fontSize: fontSizes.xs, color: colors.text, width: s(30), padding: 0, textAlign: 'right' },
  waterSuffix: { fontFamily: fonts.bodyBold, fontSize: fontSizes.xs, color: colors.textSecondary },
  notes: {
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    padding: s(8),
    minHeight: s(42),
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.text,
    textAlignVertical: 'top',
  },
  error: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.danger },
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
  dragHandleCol: {
    paddingHorizontal: s(2),
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'grab' as any,
  },
  rowDragging: {
    opacity: 0.45,
    transform: [{ scale: 0.98 }],
  },
  rowDragOver: {
    borderColor: colors.lime,
    borderWidth: 1.5,
    backgroundColor: 'rgba(139, 197, 63, 0.08)',
  },
  rowInfo: { flex: 1, gap: 2 },
  rowMeta: { fontFamily: fonts.body, fontSize: fontSizes.label, color: colors.textSecondary },
  requiredStar: { color: colors.danger, fontFamily: fonts.bodyBold },
  noSupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    paddingVertical: s(6),
    paddingHorizontal: s(4),
  },
  noSupRowActive: {
    opacity: 0.9,
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
  checkboxChecked: {
    backgroundColor: colors.lime,
    borderColor: colors.lime,
  },
  checkboxCheck: {
    color: colors.navy,
    fontFamily: fonts.bodyBold,
    fontSize: s(10),
    fontWeight: '800',
  },
  noSupText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  validationBox: {
    backgroundColor: '#FFE4DF',
    borderRadius: radius.input,
    padding: s(8),
    borderWidth: 1,
    borderColor: 'rgba(180, 68, 46, 0.3)',
  },
  validationText: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.xs,
    color: colors.danger,
  },
});

