import { useRouter } from 'expo-router';
import { ClipboardList, Download, ShieldCheck, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { toast } from '@/components/ui/Toast';
import { friendlyError } from '@/lib/errors';
import { shareTextFile } from '@/lib/exportFile';
import { calculateAge, formatDateShort } from '@/lib/format';
import { hapticSelection } from '@/lib/motion';
import { formatPhone } from '@/lib/phone';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes, lineHeights } from '@/theme/typography';

import { CONSENT_METHODS, Client, type ConsentMethod, Sex } from '../types';
import { deleteClientAndData, exportClientData } from '../dataRights';
import { buildClientReportHtml } from '../clientReportPdf';
import { DocumentToDeliver } from '../sentLogRepository';
import { ConsentSheet } from './ConsentSheet';
import { DatePickerSheet } from './DatePickerSheet';
import { IncludePhotosToggle } from './IncludePhotosToggle';
import { PhoneSheet } from './PhoneSheet';
import { SendDocumentSheet } from './SendDocumentSheet';
import { SentHistory } from './SentHistory';

type Props = {
  client: Client;
  latestMeasurementLabel: string | null;
  onUpdateClient: (patch: {
    birth_date?: string | null;
    age?: number | null;
    notes?: string;
    phone?: string | null;
    sex?: Sex | null;
    sport?: string | null;
    consent_at?: string | null;
    consent_method?: ConsentMethod | null;
  }) => Promise<void>;
  onViewAnthropometry: () => void;
  /** La última medición tiene fotos de progreso (muestra el interruptor en el informe). */
  latestHasPhotos: boolean;
  /** Cambia cada vez que se envía algo al cliente. */
  sentRefreshKey: number;
  onSent: () => void;
};

export function DatosTab({
  client,
  latestMeasurementLabel,
  onUpdateClient,
  onViewAnthropometry,
  latestHasPhotos,
  sentRefreshKey,
  onSent,
}: Props) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [phoneSheetOpen, setPhoneSheetOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportPhotos, setReportPhotos] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [consentNonce, setConsentNonce] = useState(0);
  const [exporting, setExporting] = useState(false);
  const router = useRouter();

  const consentLabel = client.consent_at
    ? `${formatDateShort(client.consent_at)} · ${CONSENT_METHODS.find((m) => m.id === client.consent_method)?.label ?? ''}`.replace(/ · $/, '')
    : null;

  async function handleExport() {
    setExporting(true);
    try {
      const data = await exportClientData(client.id);
      const safeName = client.full_name.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'cliente';
      await shareTextFile(`datos-${safeName}.json`, 'application/json', JSON.stringify(data, null, 2));
    } catch (e) {
      toast({ message: friendlyError(e), tone: 'danger' });
    } finally {
      setExporting(false);
    }
  }

  function handleDelete() {
    Alert.alert(
      `¿Eliminar a ${client.full_name}?`,
      'Se borran para siempre su ficha, mediciones, fotos, planes, rutinas y el registro de envíos. No se puede deshacer. Si quieres conservar una copia, descárgala antes.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar todo',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteClientAndData(client.id);
              toast({ message: 'Cliente eliminado con todos sus datos.', tone: 'success' });
              router.dismissTo('/');
            } catch (e) {
              Alert.alert('No se pudo eliminar', friendlyError(e));
            }
          },
        },
      ]
    );
  }

  const reportDocument: DocumentToDeliver = {
    clientId: client.id,
    kind: 'informe',
    label: 'Informe completo',
    buildHtml: () => buildClientReportHtml(client.id, { includePhotos: reportPhotos }),
  };
  const [notes, setNotes] = useState(client.notes ?? '');
  const [sport, setSport] = useState(client.sport ?? '');

  function handleSexChange(sex: Sex) {
    if (sex === client.sex) return;
    hapticSelection();
    onUpdateClient({ sex });
  }

  function handleSportBlur() {
    const value = sport.trim();
    if (value !== (client.sport ?? '')) onUpdateClient({ sport: value || null });
  }

  const computedAge =
    (client.birth_date ? calculateAge(client.birth_date) : null) ?? client.age;

  async function handleSelectBirthDate(isoDate: string | null) {
    const age = isoDate ? calculateAge(isoDate) : null;
    await onUpdateClient({ birth_date: isoDate, age });
  }

  function handleNotesBlur() {
    if (notes !== (client.notes ?? '')) {
      onUpdateClient({ notes });
    }
  }

  const birthDateLabel = client.birth_date
    ? formatDateShort(client.birth_date)
    : 'Elegir ▾';

  return (
    <View style={styles.container}>
      {/* Informe completo: todo lo del cliente en un solo PDF */}
      <Pressable accessibilityRole="button" onPress={() => setReportOpen(true)} style={styles.reportCard}>
        <ClipboardList size={s(20)} color={colors.navy} />
        <View style={styles.reportTexts}>
          <Text style={styles.reportTitle}>Informe completo</Text>
          <Text style={styles.reportText}>
            Datos, medidas, plan y rutina en un PDF.
          </Text>
        </View>
        <Text style={styles.reportAction}>Enviar ›</Text>
      </Pressable>

      {/* Teléfono para WhatsApp */}
      <Pressable
        onPress={() => setPhoneSheetOpen(true)}
        style={styles.fieldRow}
        accessibilityRole="button"
        accessibilityLabel="Editar teléfono del cliente"
      >
        <Text style={styles.fieldLabel}>Teléfono (WhatsApp)</Text>
        <Text style={styles.fieldValue}>{client.phone ? formatPhone(client.phone) : 'Añadir ▾'}</Text>
      </Pressable>

      {/* Selector interactivo de Fecha de nacimiento */}
      <Pressable
        onPress={() => setDatePickerOpen(true)}
        style={styles.fieldRow}
        accessibilityRole="button"
        accessibilityLabel="Seleccionar fecha de nacimiento"
      >
        <Text style={styles.fieldLabel}>Fecha de nacimiento</Text>
        <Text style={styles.fieldValue}>{birthDateLabel}</Text>
      </Pressable>

      {/* Edad calculada informativa */}
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Edad</Text>
        <Text style={styles.infoValue}>
          {computedAge != null ? `${computedAge} años` : '—'}
        </Text>
      </View>

      {/* Sexo: lo necesitan las ecuaciones de composición corporal */}
      <View style={styles.fieldRow}>
        <View style={styles.sexTexts}>
          <Text style={styles.fieldLabel}>Sexo</Text>
          <Text style={styles.sexHint}>Para las ecuaciones</Text>
        </View>
        <View style={styles.sexOptions} accessibilityRole="radiogroup">
          {(['hombre', 'mujer'] as Sex[]).map((option) => {
            const selected = client.sex === option;
            return (
              <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => handleSexChange(option)}
                hitSlop={{ top: 7, bottom: 7 }}
                style={[styles.sexOption, selected && styles.sexOptionSelected]}
              >
                <Text style={[styles.sexOptionText, selected && styles.sexOptionTextSelected]}>
                  {option === 'hombre' ? 'Hombre' : 'Mujer'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Deporte (aparece en el informe ISAK) */}
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Deporte</Text>
        <TextInput
          value={sport}
          onChangeText={setSport}
          onEndEditing={handleSportBlur}
          placeholder="Añadir"
          placeholderTextColor={colors.textMuted}
          maxLength={80}
          style={styles.inlineInput}
          accessibilityLabel="Deporte que practica"
        />
      </View>

      {/* Notas generales */}
      <Text style={styles.groupLabel}>Notas y observaciones generales</Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        onEndEditing={handleNotesBlur}
        multiline
        placeholder="Información relevante del asesorado, horarios, estilo de vida…"
        placeholderTextColor={colors.textMuted}
        style={styles.notes}
      />

      {/* Referencia a última medición */}
      <View style={styles.latestMeasurementBox}>
        <Text style={styles.latestMeasurementText}>
          Última medición antropométrica: {latestMeasurementLabel ?? 'Sin registros'}
        </Text>
        <Pressable onPress={onViewAnthropometry} style={styles.latestMeasurementLink}>
          <Text style={styles.latestMeasurementLinkText}>Ver antropometría ›</Text>
        </Pressable>
      </View>

      <SentHistory clientId={client.id} refreshKey={sentRefreshKey} />

      {/* Privacidad: consentimiento, copia y borrado de los datos del cliente */}
      <View style={styles.privacyCard}>
        <Text style={styles.privacyTitle}>Privacidad y datos</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Consentimiento del cliente: ${consentLabel ?? 'sin registrar'}. Cambiar`}
          onPress={() => {
            setConsentNonce((n) => n + 1);
            setConsentOpen(true);
          }}
          style={styles.privacyRow}
        >
          <ShieldCheck size={18} color={consentLabel ? colors.success : colors.warning} />
          <View style={styles.privacyTexts}>
            <Text style={styles.privacyLabel}>Consentimiento para guardar y enviar sus datos</Text>
            <Text style={[styles.privacyValue, !consentLabel && styles.privacyWarn]}>{consentLabel ?? 'Sin registrar'}</Text>
          </View>
          <Text style={styles.privacyAction}>{consentLabel ? 'Cambiar' : 'Registrar'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={handleExport} disabled={exporting} style={[styles.privacyRow, styles.privacyDivider]}>
          <Download size={18} color={colors.navy} />
          <View style={styles.privacyTexts}>
            <Text style={styles.privacyLabel}>{exporting ? 'Preparando la copia…' : 'Descargar una copia de sus datos'}</Text>
            <Text style={styles.privacyValue}>Archivo JSON con todo lo guardado (sin los archivos de fotos).</Text>
          </View>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={handleDelete} style={[styles.privacyRow, styles.privacyDivider]}>
          <Trash2 size={18} color={colors.danger} />
          <View style={styles.privacyTexts}>
            <Text style={[styles.privacyLabel, styles.privacyDanger]}>Eliminar cliente y todos sus datos</Text>
            <Text style={styles.privacyValue}>Borra también las fotos. No se puede deshacer.</Text>
          </View>
        </Pressable>
      </View>

      <ConsentSheet
        key={consentNonce}
        visible={consentOpen}
        onClose={() => setConsentOpen(false)}
        current={client.consent_method ?? null}
        onSave={(method) => onUpdateClient({ consent_method: method, consent_at: method ? new Date().toISOString() : null })}
      />

      <PhoneSheet
        visible={phoneSheetOpen}
        value={client.phone}
        onClose={() => setPhoneSheetOpen(false)}
        onSave={(phone) => onUpdateClient({ phone })}
      />

      <SendDocumentSheet
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        document={reportDocument}
        clientName={client.full_name}
        clientPhone={client.phone}
        onSent={onSent}
      >
        {latestHasPhotos && <IncludePhotosToggle value={reportPhotos} onChange={setReportPhotos} />}
      </SendDocumentSheet>

      {/* Modal interactivo de selección de fecha */}
      <DatePickerSheet
        visible={datePickerOpen}
        initialDateIso={client.birth_date ?? null}
        onClose={() => setDatePickerOpen(false)}
        onSelectDate={handleSelectBirthDate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: s(16), gap: s(10) },
  privacyCard: { borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: s(14) },
  privacyTitle: { fontFamily: fonts.heading, fontSize: fontSizes.base, color: colors.navy, paddingTop: s(12), paddingBottom: s(4) },
  privacyRow: { flexDirection: 'row', alignItems: 'center', gap: s(12), minHeight: 56, paddingVertical: s(10) },
  privacyDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  privacyTexts: { flex: 1, gap: 2 },
  privacyLabel: { fontFamily: fonts.bodySemi, fontSize: fontSizes.sm, color: colors.text },
  privacyValue: { fontFamily: fonts.body, fontSize: fontSizes.xs, lineHeight: lineHeights.xs, color: colors.textSecondary },
  privacyWarn: { fontFamily: fonts.bodyBold, color: '#7A5200' },
  privacyDanger: { color: colors.danger },
  privacyAction: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.navy },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    minHeight: 56,
    paddingVertical: s(8),
    paddingHorizontal: s(12),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.lime,
    backgroundColor: colors.successBg,
  },
  reportTexts: { flex: 1, gap: s(2) },
  reportTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.navy },
  reportText: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary },
  reportAction: { fontFamily: fonts.bodyBold, fontSize: fontSizes.xs, color: colors.success },
  groupLabel: {
    fontFamily: fonts.headingSemi,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
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
  sexTexts: { flexShrink: 1, gap: 1 },
  sexHint: { fontFamily: fonts.body, fontSize: fontSizes.label, color: colors.textMuted },
  // Control segmentado: dos mitades iguales dentro de una cápsula
  sexOptions: { flexDirection: 'row', padding: 2, borderRadius: radius.chip, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  sexOption: {
    minHeight: 30,
    minWidth: s(64),
    paddingHorizontal: s(10),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.chip,
  },
  sexOptionSelected: { backgroundColor: colors.navy },
  sexOptionText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.xs, color: colors.textSecondary },
  sexOptionTextSelected: { fontFamily: fonts.bodyBold, color: colors.surface },
  inlineInput: {
    flex: 1,
    marginLeft: s(12),
    minHeight: 36,
    textAlign: 'right',
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.navy,
  },
  fieldValue: { fontFamily: fonts.bodyBold, fontSize: fontSizes.xs, color: colors.navy },
  infoRow: {
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
  infoLabel: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary },
  infoValue: { fontFamily: fonts.bodyBold, fontSize: fontSizes.xs, color: colors.navy },
  notes: {
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    padding: s(8),
    minHeight: s(60),
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.text,
    textAlignVertical: 'top',
  },
  latestMeasurementBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(6),
    marginTop: s(4),
    paddingTop: s(8),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  latestMeasurementText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textMuted,
  },
  latestMeasurementLink: {
    paddingVertical: s(2),
  },
  latestMeasurementLinkText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.navy,
  },
});
