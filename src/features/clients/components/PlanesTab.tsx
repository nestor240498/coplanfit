import { ArrowRight, Check, Clock, Download, Eye, Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AddChip, Chip } from '@/components/ui/Chip';
import { toast, toastWithUndo } from '@/components/ui/Toast';
import { getMyProfile } from '@/features/profile/repository';
import { formatDateShort, formatGoal } from '@/lib/format';
import { friendlyError } from '@/lib/errors';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes, lineHeights } from '@/theme/typography';

import { buildPlanPdfHtml } from '../planPdf';
import { getPlanVersionById, PlanVersionWithData } from '../plansRepository';
import { DocumentToDeliver } from '../sentLogRepository';
import { addTag, removeTag } from '../tagsRepository';
import { ClientTag, Goal, PlanVersion } from '../types';
import { AddTagSheet } from './AddTagSheet';
import { GoalPickerSheet } from './GoalPickerSheet';
import { SendDocumentSheet } from './SendDocumentSheet';

type Props = {
  clientId: string;
  clientName: string;
  clientGoal?: Goal | null;
  clientPhone?: string | null;
  /** Tras enviar un documento (refresca el historial de envíos). */
  onSent?: () => void;
  tags: ClientTag[];
  onReloadTags: () => void;
  onUpdateClient: (patch: { goal?: Goal }) => Promise<void>;
  versions: PlanVersion[];
  draft: PlanVersionWithData | null;
  onNewVersion: () => void;
  onResumeDraft: () => void;
  onDeleteDraft: () => void;
  onCompare: (versionIds: [string, string]) => void;
  onViewVersion: (versionId: string) => void;
};

const MAX_SELECTION = 2;

const STEP_NAMES: Record<number, string> = {
  1: 'Configuración base',
  2: 'Alimentos IA',
  3: 'Asignar comidas',
};

export function PlanesTab({
  clientId,
  clientName,
  clientGoal,
  clientPhone,
  onSent,
  tags,
  onReloadTags,
  onUpdateClient,
  versions,
  draft,
  onNewVersion,
  onResumeDraft,
  onDeleteDraft,
  onCompare,
  onViewVersion,
}: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [sendVersion, setSendVersion] = useState<PlanVersion | null>(null);
  const [goalSheetOpen, setGoalSheetOpen] = useState(false);
  const [addAvoidOpen, setAddAvoidOpen] = useState(false);
  const [avoidNonce, setAvoidNonce] = useState(0);

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_SELECTION) return prev;
      return [...prev, id];
    });
  }

  async function handleAddAvoidTag(_: string, label: string) {
    await addTag(clientId, 'evita', label);
    onReloadTags();
  }

  /** Quita el dato al momento y ofrece «Deshacer» (lo vuelve a crear con el mismo tipo y texto). */
  async function handleRemoveTag(tag: ClientTag) {
    try {
      await removeTag(tag.id);
      onReloadTags();
      toastWithUndo(`«${tag.label}» quitado de la ficha`, async () => {
        await addTag(clientId, tag.kind, tag.label);
        onReloadTags();
      });
    } catch (e) {
      toast({ message: friendlyError(e), tone: 'danger' });
    }
  }

  async function handleSelectGoal(goal: Goal) {
    await onUpdateClient({ goal });
  }

  const sendDocument: DocumentToDeliver | null = sendVersion
    ? {
        clientId,
        kind: 'plan',
        refId: sendVersion.id,
        label: `Plan nutricional v${sendVersion.version}`,
        buildHtml: async () => {
          const [fullVersion, profile] = await Promise.all([
            getPlanVersionById(sendVersion.id),
            getMyProfile().catch(() => null),
          ]);
          return buildPlanPdfHtml({
            client: { full_name: clientName, goal: clientGoal ?? null },
            profile,
            planData: fullVersion.data,
            versionNumber: sendVersion.version,
            createdAt: sendVersion.created_at,
          });
        },
      }
    : null;

  // Filtrar versiones publicadas (no borradores)
  const publishedVersions = versions.filter((v) => !draft || v.id !== draft.id);
  const avoidTags = tags.filter((t) => t.kind === 'evita');

  return (
    <View style={styles.container}>
      <View style={styles.contentWrap}>
        {/* Configuración nutricional del cliente (Objetivo y Alimentos a evitar) */}
        <Pressable onPress={() => setGoalSheetOpen(true)} style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Objetivo nutricional</Text>
          <Text style={styles.fieldValue}>{clientGoal ? formatGoal(clientGoal) : 'Elegir'} ▾</Text>
        </Pressable>

        <View style={styles.group}>
          <Text style={styles.groupLabel}>Alimentos a evitar en el plan</Text>
          <View style={styles.chipRow}>
            {avoidTags.map((tag) => (
              <Chip
                key={tag.id}
                label={tag.label}
                variant="neutral"
                onRemove={() => handleRemoveTag(tag)}
              />
            ))}
            <AddChip onPress={() => {
              setAvoidNonce((n) => n + 1);
              setAddAvoidOpen(true);
            }} accessibilityLabel="Agregar alimento a evitar" />
          </View>
        </View>

        {/* Sección descriptiva de planes */}
        <View style={styles.headerSection}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.tabHeading}>PLANES NUTRICIONALES</Text>
          </View>
          <Text style={styles.tabSubtitle}>
            Pautas de alimentación, objetivo calórico y versiones de dietas del asesorado.
          </Text>
        </View>

        {/* Tarjeta de borrador pendiente */}
        {draft && (
          <View style={styles.draftCard}>
            <View style={styles.draftHeader}>
              <View style={styles.draftTagWrap}>
                <View style={styles.draftBadgeRow}>
                  <Clock size={s(12)} color="#D48806" />
                  <Text style={styles.draftTag}>BORRADOR EN PROGRESO</Text>
                </View>
                <Text style={styles.draftStep}>
                  Paso {draft.data.savedStep ?? 1}: {STEP_NAMES[draft.data.savedStep ?? 1]}
                </Text>
              </View>
              <Text style={styles.draftDate}>Guardado {formatDateShort(draft.created_at)}</Text>
            </View>

            <View style={styles.draftActionsColumn}>
              <Pressable onPress={onResumeDraft} style={styles.resumeBtn}>
                <Text style={styles.resumeBtnText}>Continuar editando</Text>
                <ArrowRight size={s(13)} color={colors.lime} strokeWidth={2.5} />
              </Pressable>
              <Pressable onPress={onDeleteDraft} style={styles.discardBtn}>
                <Trash2 size={s(12)} color={colors.danger} />
                <Text style={styles.discardBtnText}>Descartar borrador</Text>
              </Pressable>
            </View>
          </View>
        )}


        <Pressable onPress={onNewVersion} style={styles.newVersionCta}>
          <Plus size={s(14)} color={colors.success} strokeWidth={2.5} />
          <Text style={styles.newVersionText}>Nueva versión del plan</Text>
        </Pressable>

        {publishedVersions.length === 0 ? (
          <Text style={styles.empty}>Aún no hay versiones de plan publicadas para este cliente.</Text>
        ) : (
          <>
            {selected.length > 0 && (
              <Text style={styles.hint}>
                {selected.length === 1
                  ? 'Selecciona 1 versión más para compararla'
                  : 'Máximo 2 selecciones — desmarca una para elegir otra'}
              </Text>
            )}
            {publishedVersions.map((v) => {
              const isSelected = selected.includes(v.id);
              const disabled = !isSelected && selected.length >= MAX_SELECTION;

              return (
                <View
                  key={v.id}
                  style={[styles.row, isSelected && styles.rowSelected, disabled && styles.rowDisabled]}
                >
                  {/* Checkbox para comparar */}
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityLabel={`Seleccionar versión ${v.version} para comparar`}
                    onPress={() => toggle(v.id)}
                    disabled={disabled}
                    style={styles.checkboxTouch}
                  >
                    <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                      {isSelected && <Check size={s(12)} color={colors.surface} strokeWidth={3} />}
                    </View>
                  </Pressable>

                  {/* Información de la versión */}
                  <Pressable
                    onPress={() => onViewVersion(v.id)}
                    style={styles.rowText}
                  >
                    <View style={styles.rowTitleLine}>
                      <Text style={styles.rowTitle}>Versión {v.version}</Text>
                      {v.is_current && (
                        <View style={styles.currentBadge}>
                          <Text style={styles.currentBadgeText}>Vigente</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.rowDate}>Desde {formatDateShort(v.created_at)}</Text>
                  </Pressable>

                  {/* Acciones directas: Ver (Ojo) y Descargar PDF */}
                  <View style={styles.actionButtonsRow}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Ver plan"
                      onPress={() => onViewVersion(v.id)}
                      hitSlop={8}
                      style={styles.iconBtn}
                    >
                      <Eye size={s(16)} color={colors.navy} />
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Enviar o descargar el plan v${v.version}`}
                      onPress={() => setSendVersion(v)}
                      hitSlop={8}
                      style={styles.iconBtn}
                    >
                      <Download size={s(16)} color={colors.success} />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </>
        )}
      </View>

      {selected.length > 0 && (
        <View style={styles.footerWrap}>
          <Pressable
            disabled={selected.length !== MAX_SELECTION}
            onPress={() => onCompare(selected as [string, string])}
            style={[styles.compareCta, selected.length !== MAX_SELECTION && styles.compareCtaDisabled]}
          >
            <Text style={styles.compareCtaText}>
              {selected.length === MAX_SELECTION
                ? 'Comparar 2 versiones seleccionadas'
                : `Selecciona 1 versión más (${selected.length}/${MAX_SELECTION})`}
            </Text>
          </Pressable>
        </View>
      )}

      <AddTagSheet
        key={avoidNonce}
        visible={addAvoidOpen}
        initialKind="evita"
        onClose={() => setAddAvoidOpen(false)}
        onAdd={handleAddAvoidTag}
      />

      <GoalPickerSheet
        visible={goalSheetOpen}
        value={clientGoal ?? null}
        onClose={() => setGoalSheetOpen(false)}
        onSelect={handleSelectGoal}
      />

      <SendDocumentSheet
        visible={sendVersion != null}
        onClose={() => setSendVersion(null)}
        document={sendDocument}
        clientName={clientName}
        clientPhone={clientPhone}
        onSent={onSent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: s(16),
    justifyContent: 'space-between',
    gap: s(12),
  },
  contentWrap: {
    gap: s(8),
  },
  headerSection: {
    paddingTop: s(10),
    marginTop: s(4),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: s(2),
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
  },
  tabHeading: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xs,
    color: colors.navy,
    letterSpacing: 0.5,
  },
  tabSubtitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textMuted,
    lineHeight: lineHeights.label,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    paddingVertical: s(8),
    paddingHorizontal: s(10),
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldLabel: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.text },
  fieldValue: { fontFamily: fonts.bodyBold, fontSize: fontSizes.xs, color: colors.navy },
  group: { gap: s(4) },
  groupLabel: {
    fontFamily: fonts.headingSemi,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: s(6) },
  versionsHeaderRow: {
    marginTop: s(2),
  },
  versionsHeading: {
    fontFamily: fonts.headingSemi,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  footerWrap: {
    marginTop: s(16),
    paddingBottom: s(8),
  },
  newVersionCta: {
    minHeight: 44,
    flexDirection: 'row',
    gap: s(6),
    borderRadius: radius.input,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newVersionText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.success },
  hint: { fontFamily: fonts.body, fontSize: fontSizes.label, color: colors.textMuted, marginTop: s(2) },
  empty: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: s(20),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: s(10),
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rowSelected: { borderColor: colors.lime },
  rowDisabled: { opacity: 0.5 },
  checkbox: {
    width: s(16),
    height: s(16),
    borderRadius: s(4),
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.lime,
    borderColor: colors.lime,
  },
  checkboxTouch: {
    padding: s(4),
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(4),
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: s(5),
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2, paddingVertical: s(2) },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.text },
  rowDate: { fontFamily: fonts.body, fontSize: fontSizes.label, color: colors.textMuted },
  currentBadge: {
    backgroundColor: colors.successBg,
    borderRadius: radius.chip,
    paddingVertical: 2,
    paddingHorizontal: s(8),
  },
  currentBadgeText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.label, color: colors.success },
  draftCard: {
    backgroundColor: '#FFFBE6',
    borderRadius: radius.card,
    padding: s(12),
    borderWidth: 1,
    borderColor: '#FFE58F',
    gap: s(8),
    marginTop: s(8),
    marginBottom: s(6),
  },
  draftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  draftTagWrap: { flex: 1, gap: 2 },
  draftBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(4),
  },
  draftTag: {
    fontFamily: fonts.headingSemi,
    fontSize: fontSizes.micro,
    color: '#D48806',
    letterSpacing: 0.2,
  },
  draftStep: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.navy,
  },
  draftDate: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textMuted,
  },
  draftActionsColumn: {
    gap: s(6),
    marginTop: s(4),
  },
  resumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(6),
    height: s(36),
    borderRadius: radius.input,
    backgroundColor: colors.navy,
    paddingHorizontal: s(12),
  },
  resumeBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.lime,
  },
  discardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(5),
    height: s(36),
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: '#D9D9D9',
    backgroundColor: colors.surface,
    paddingHorizontal: s(12),
  },
  discardBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.danger,
  },
  compareCta: {
    minHeight: 44,
    borderRadius: radius.button,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: s(4),
  },
  compareCtaDisabled: { opacity: 0.5 },
  compareCtaText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.navy },
});
