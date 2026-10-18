import { ChevronDown, ChevronUp, ClipboardCheck, FileUp } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { DatePickerSheet } from '@/features/clients/components/DatePickerSheet';
import type { Client, Sex } from '@/features/clients/types';
import { SelectField, SingleChoice } from '@/features/workouts/components/ExerciseFormControls';
import { ageAt, formatDateShort, localDateIso } from '@/lib/format';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes, lineHeights } from '@/theme/typography';

import {
  DW_MIN_AGE,
  defaultFatEquation,
  FAT_EQUATION_LABELS,
  type FatEquation,
  GROUP_LABELS,
  GROUP_ORDER,
  ISAK_SITES,
  JACKSON_POLLOCK_7_SITES,
  jacksonPollock3Sites,
  SITE_BY_ID,
  type SessionMode,
  type SessionOrder,
  type SessionProfile,
  type SiteGroup,
  type SiteId,
} from '../engine';

export type SetupResult = {
  profile: SessionProfile;
  measuredOn: string;
  mode: SessionMode;
  order: SessionOrder;
  sites: SiteId[];
  fatEquation: FatEquation;
  voice: boolean;
};

type Props = {
  profile: SessionProfile;
  client: Client;
  onUpdateClient: (patch: { sex?: Sex; birth_date?: string | null; age?: number | null }) => Promise<void>;
  onStart: (result: SetupResult) => void;
  onImportPdf?: () => void;
  importingPdf?: boolean;
};

/** Configuración de la evaluación: datos del cliente que piden las ecuaciones, modo, orden y ecuación. */
export function SessionSetup({ profile, client, onUpdateClient, onStart, onImportPdf, importingPdf }: Props) {
  const today = localDateIso();
  const isIsak = profile === 'isak';
  const [measuredOn, setMeasuredOn] = useState(today);
  const [mode, setMode] = useState<SessionMode>('guided');
  const [order, setOrder] = useState<SessionOrder>('rounds');
  const [groups, setGroups] = useState<SiteGroup[]>([...GROUP_ORDER]);
  const [voice, setVoice] = useState(true);
  const [method, setMethod] = useState<'jp3' | 'jp7'>('jp3');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [editingClientData, setEditingClientData] = useState(false);
  const [birthPickerOpen, setBirthPickerOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [pickerNonce, setPickerNonce] = useState(0);

  const age = ageAt(client.birth_date, measuredOn) ?? client.age;
  const [isakEquation, setIsakEquation] = useState<FatEquation>(defaultFatEquation(age));

  const fatOptions = (['dw_siri', 'faulkner', 'carter', 'slaughter'] as FatEquation[])
    .filter((eq) => (eq === 'slaughter' ? age == null || age < 18 : eq === 'dw_siri' ? age == null || age >= DW_MIN_AGE : true))
    .map((eq) => ({ id: eq, label: FAT_EQUATION_LABELS[eq] }));

  const sites: SiteId[] = isIsak
    ? ISAK_SITES.filter((site) => groups.includes(site.group)).map((site) => site.id)
    : ['weight_kg', 'height_cm', ...(method === 'jp3' ? jacksonPollock3Sites(client.sex ?? 'hombre') : JACKSON_POLLOCK_7_SITES)];
  const fatEquation: FatEquation = isIsak ? isakEquation : method;
  const canStart = Boolean(client.sex) && sites.length > 0;
  const dataComplete = Boolean(client.sex) && age != null;
  const showClientEditor = !dataComplete || editingClientData;

  function toggleGroup(group: SiteGroup) {
    setGroups((prev) => (prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]));
  }

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <ClipboardCheck size={22} color={colors.navy} />
          <Text style={styles.introText}>
            {isIsak
              ? 'Perfil ISAK restringido: 21 medidas del lado derecho. Cada punto se mide dos veces y, si no coinciden, se pide una tercera.'
              : 'Pliegues cutáneos de Jackson-Pollock: la suma de pliegues y la edad dan la densidad corporal y el % de grasa.'}
          </Text>
        </View>

        {showClientEditor ? (
          <>
            <Text style={styles.sectionLabel}>Datos que piden las ecuaciones</Text>
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Sexo</Text>
              <SingleChoice<Sex>
                options={[
                  { id: 'hombre', label: 'Hombre' },
                  { id: 'mujer', label: 'Mujer' },
                ]}
                value={client.sex ?? null}
                onChange={(sex) => onUpdateClient({ sex })}
              />
              {!client.sex && <Text style={styles.required}>Obligatorio para calcular el % de grasa y la masa muscular.</Text>}

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setPickerNonce((n) => n + 1);
                  setBirthPickerOpen(true);
                }}
                style={styles.row}
              >
                <Text style={styles.fieldLabel}>Fecha de nacimiento</Text>
                <Text style={styles.rowValue}>
                  {client.birth_date ? `${formatDateShort(client.birth_date)} · ${age} años` : age != null ? `${age} años (añadir fecha)` : 'Añadir ▾'}
                </Text>
              </Pressable>
              {age == null && <Text style={styles.required}>Sin edad no se puede calcular el % de grasa ni la masa muscular.</Text>}
              {dataComplete && <Button title="Listo" variant="secondary" onPress={() => setEditingClientData(false)} />}
            </View>
          </>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => setEditingClientData(true)} style={styles.clientSummary}>
            <View style={styles.flex}>
              <Text style={styles.summaryTitle}>
                {client.sex === 'mujer' ? 'Mujer' : 'Hombre'} · {age} años
              </Text>
              <Text style={styles.hint}>Tomado de la ficha del cliente.</Text>
            </View>
            <Text style={styles.changeText}>Cambiar</Text>
          </Pressable>
        )}

        {!isIsak && (
          <>
            <Text style={styles.sectionLabel}>Método</Text>
            <View style={styles.card}>
              <SingleChoice<'jp3' | 'jp7'>
                options={[
                  { id: 'jp3', label: '3 pliegues' },
                  { id: 'jp7', label: '7 pliegues' },
                ]}
                value={method}
                onChange={setMethod}
              />
              <Text style={styles.hint}>
                {method === 'jp3'
                  ? 'Rápido: 3 pliegues que cambian según el sexo.'
                  : 'Más preciso: 7 pliegues, los mismos para todos.'}
              </Text>
              <Text style={styles.hint}>
                Se miden masa, talla y: {sites.filter((id) => SITE_BY_ID[id].unit === 'mm').map((id) => SITE_BY_ID[id].short.toLowerCase()).join(', ')}.
              </Text>
            </View>
          </>
        )}

        <Text style={styles.sectionLabel}>Evaluación</Text>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Cómo vas a anotar</Text>
          <SingleChoice<SessionMode>
            options={[
              { id: 'guided', label: 'Midiendo ahora' },
              { id: 'transcribe', label: 'Copiar de papel' },
            ]}
            value={mode}
            onChange={setMode}
          />
          <Text style={styles.hint}>
            {mode === 'guided'
              ? 'Te guía punto por punto y compara las lecturas al momento.'
              : 'Una sola lectura por punto, para pasar una evaluación ya hecha.'}
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setPickerNonce((n) => n + 1);
              setDatePickerOpen(true);
            }}
            style={styles.row}
          >
            <Text style={styles.fieldLabel}>Fecha de la medición</Text>
            <Text style={styles.rowValue}>{measuredOn === today ? 'Hoy' : formatDateShort(measuredOn)}</Text>
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: advancedOpen }}
          onPress={() => setAdvancedOpen((v) => !v)}
          style={styles.advancedToggle}
        >
          <Text style={styles.advancedText}>Más opciones</Text>
          {advancedOpen ? <ChevronUp size={18} color={colors.navy} /> : <ChevronDown size={18} color={colors.navy} />}
        </Pressable>

        {advancedOpen && (
          <View style={styles.card}>
            {mode === 'guided' && (
              <>
                <Text style={styles.fieldLabel}>Orden de toma</Text>
                <SingleChoice<SessionOrder>
                  options={[
                    { id: 'rounds', label: 'Por rondas' },
                    { id: 'consecutive', label: 'Dos seguidas' },
                  ]}
                  value={order}
                  onChange={setOrder}
                />
                <Text style={styles.hint}>
                  {order === 'rounds'
                    ? 'Recomendado por ISAK: todos los puntos una vez y luego la segunda vuelta, para que la piel se recupere.'
                    : 'Cada punto dos veces seguidas antes de pasar al siguiente.'}
                </Text>
              </>
            )}

            {isIsak && (
              <>
                <Text style={styles.fieldLabel}>Qué medir</Text>
                <View style={styles.groups}>
                  {GROUP_ORDER.map((group) => {
                    const selected = groups.includes(group);
                    const count = ISAK_SITES.filter((site) => site.group === group).length;
                    return (
                      <Pressable
                        key={group}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selected }}
                        onPress={() => toggleGroup(group)}
                        style={[styles.groupChip, selected && styles.groupChipSelected]}
                      >
                        <Text style={[styles.groupChipText, selected && styles.groupChipTextSelected]}>
                          {GROUP_LABELS[group]} ({count})
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <SelectField<FatEquation>
                  label="Ecuación de % grasa"
                  options={fatOptions}
                  value={isakEquation}
                  onChange={setIsakEquation}
                  sheetTitle="Ecuación de % grasa"
                />
                {client.sport ? (
                  <Text style={styles.hint}>Practica {client.sport}: con deportistas puedes usar Faulkner o Carter.</Text>
                ) : null}
              </>
            )}

            {mode === 'guided' && (
              <View style={styles.switchRow}>
                <View style={styles.flex}>
                  <Text style={styles.fieldLabel}>Anunciar en voz alta</Text>
                  <Text style={styles.hint}>Dice qué punto y qué medida toca, para no mirar la pantalla.</Text>
                </View>
                <Switch
                  value={voice}
                  onValueChange={setVoice}
                  trackColor={{ true: colors.lime, false: colors.border }}
                  accessibilityLabel="Anunciar en voz alta"
                />
              </View>
            )}
          </View>
        )}

        {isIsak && onImportPdf ? (
          <Pressable accessibilityRole="button" onPress={onImportPdf} disabled={importingPdf} style={styles.importRow}>
            <FileUp size={20} color={colors.navy} />
            <View style={styles.flex}>
              <Text style={styles.importTitle}>{importingPdf ? 'Leyendo el informe…' : 'Importar un informe PDF de ISAKmetry'}</Text>
              <Text style={styles.hint}>La IA (Google Gemini) lee el PDF y tú revisas las medidas antes de guardar. Gasta 1 generación.</Text>
            </View>
          </Pressable>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={canStart ? `Empezar (${sites.length} medidas)` : 'Indica el sexo para empezar'}
          onPress={() => onStart({ profile, measuredOn, mode, order, sites, fatEquation, voice })}
          disabled={!canStart}
        />
      </View>

      <DatePickerSheet
        key={`birth-${pickerNonce}`}
        visible={birthPickerOpen}
        initialDateIso={client.birth_date ?? null}
        onClose={() => setBirthPickerOpen(false)}
        onSelectDate={(iso) => {
          setBirthPickerOpen(false);
          onUpdateClient({ birth_date: iso, age: iso ? ageAt(iso) : client.age });
        }}
      />
      <DatePickerSheet
        key={`measured-${pickerNonce}`}
        visible={datePickerOpen}
        initialDateIso={measuredOn}
        onClose={() => setDatePickerOpen(false)}
        onSelectDate={(iso) => {
          setDatePickerOpen(false);
          // Nunca una fecha futura
          if (iso) setMeasuredOn(iso > today ? today : iso);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { padding: s(16), gap: s(10), paddingBottom: s(24) },
  intro: {
    flexDirection: 'row',
    gap: s(10),
    padding: s(12),
    borderRadius: radius.card,
    backgroundColor: colors.successBg,
  },
  introText: { flex: 1, fontFamily: fonts.body, fontSize: fontSizes.xs, lineHeight: lineHeights.xs, color: colors.text },
  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: s(6),
  },
  card: {
    gap: s(10),
    padding: s(14),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  fieldLabel: { fontFamily: fonts.bodySemi, fontSize: fontSizes.sm, color: colors.text },
  required: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.xs, color: colors.danger },
  hint: { fontFamily: fonts.body, fontSize: fontSizes.xs, lineHeight: lineHeights.xs, color: colors.textSecondary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(10),
    minHeight: 48,
  },
  rowValue: { flexShrink: 1, textAlign: 'right', fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.navy },
  clientSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    minHeight: 56,
    padding: s(14),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  summaryTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.base, color: colors.navy },
  changeText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.navy },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: s(4),
  },
  advancedText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.navy },
  groups: { flexDirection: 'row', flexWrap: 'wrap', gap: s(8) },
  groupChip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: s(12),
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  groupChipSelected: { backgroundColor: colors.navy, borderColor: colors.navy },
  groupChipText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textSecondary },
  groupChipTextSelected: { fontFamily: fonts.bodyBold, color: colors.surface },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: s(12) },
  importRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
    minHeight: 64,
    padding: s(14),
    borderRadius: radius.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.navy,
  },
  importTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.navy },
  footer: {
    padding: s(14),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
