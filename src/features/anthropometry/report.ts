import { chartColors, colors } from '@/theme/colors';
import { ageAt } from '@/lib/format';

import type { Client, Measurement } from '../clients/types';
import type { RangeBand, Segment, ZRow } from './charts/builders';
import {
  conicityLimit,
  type IsakResults,
  type MeasurementReadings,
  temByGroup,
  type TemResult,
  waistHipLimit,
} from './engine';
import { computeMeasurementResults } from './fromMeasurement';

/** Todo lo que necesitan la pantalla de análisis y el PDF ISAK de una medición. */
export type ReportContext = {
  measurement: Measurement;
  client: Client;
  results: IsakResults;
  previous: Measurement | null;
  previousResults: IsakResults | null;
  /** Evaluaciones anteriores (más antigua primero), para la somatocarta y las tendencias. */
  earlier: { measurement: Measurement; results: IsakResults }[];
  evaluationNumber: number;
  evaluationsTotal: number;
  daysSincePrevious: number | null;
  ageYears: number | null;
  tem: TemResult[];
};

function daysBetween(a: string, b: string): number {
  const [ya, ma, da] = a.split('-').map(Number);
  const [yb, mb, db] = b.split('-').map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86400000);
}

/** `history` en orden del repositorio (más reciente primero). */
export function buildReportContext(measurement: Measurement, client: Client, history: Measurement[]): ReportContext {
  const index = history.findIndex((m) => m.id === measurement.id);
  const older = index >= 0 ? history.slice(index + 1) : history.filter((m) => m.measured_at < measurement.measured_at);
  const previous = older[0] ?? null;
  const readings = measurement.readings as MeasurementReadings | null | undefined;
  return {
    measurement,
    client,
    results: computeMeasurementResults(measurement, client),
    previous,
    previousResults: previous ? computeMeasurementResults(previous, client) : null,
    earlier: [...older]
      .reverse()
      .map((m) => ({ measurement: m, results: computeMeasurementResults(m, client) })),
    evaluationNumber: older.length + 1,
    evaluationsTotal: history.length || 1,
    daysSincePrevious: previous ? daysBetween(previous.measured_at, measurement.measured_at) : null,
    ageYears: ageAt(client.birth_date, measurement.measured_at) ?? client.age,
    tem: readings?.mode === 'guided' ? temByGroup(readings.sites ?? {}) : [],
  };
}

/** Segmentos de la barra de 4 tejidos (vacío si no se puede calcular). */
export function tissueSegments(results: IsakResults): Segment[] {
  const { adipose, muscle, bone, residual } = results;
  if (!adipose.ok || !muscle.ok || !bone.ok || !residual.ok) return [];
  return [
    { label: 'Muscular', value: muscle.value.kg, color: chartColors.muscle },
    { label: 'Adiposo', value: adipose.value.kg, color: chartColors.adipose },
    { label: 'Óseo', value: bone.value.kg, color: chartColors.bone },
    { label: 'Residual', value: residual.value.kg, color: chartColors.residual },
  ];
}

/** Filas Phantom con el valor de la evaluación anterior. */
export function phantomZRows(results: IsakResults, previousResults: IsakResults | null, groups?: string[]): ZRow[] {
  return results.phantom
    .filter((row) => (!groups || groups.includes(row.group)) && (row.z != null || previousResults?.phantom.find((p) => p.id === row.id)?.z != null))
    .map((row) => ({
      label: row.label,
      group: row.group,
      z: row.z,
      prevZ: previousResults?.phantom.find((p) => p.id === row.id)?.z ?? null,
    }));
}

const GOOD = '#BFE3A1';
const WARN = '#F6D58A';
const BAD = '#F2B3A6';

/** Bandas de color de los índices de salud (con el sexo cuando el umbral depende de él). */
export const RANGES = {
  bmi: { min: 15, max: 40, bands: [
    { from: 15, to: 18.5, color: WARN, label: 'Bajo' },
    { from: 18.5, to: 25, color: GOOD, label: 'Normal' },
    { from: 25, to: 30, color: WARN, label: 'Sobrepeso' },
    { from: 30, to: 40, color: BAD, label: 'Obesidad' },
  ] as RangeBand[] },
  whtr: { min: 0.35, max: 0.75, bands: [
    { from: 0.35, to: 0.5, color: GOOD, label: 'Bajo' },
    { from: 0.5, to: 0.6, color: WARN, label: 'Aumentado' },
    { from: 0.6, to: 0.75, color: BAD, label: 'Alto' },
  ] as RangeBand[] },
  muscleBone: { min: 2, max: 3.6, bands: [
    { from: 2, to: 2.34, color: chartColors.ordinal[0], label: 'Muy bajo' },
    { from: 2.34, to: 2.44, color: chartColors.ordinal[1] },
    { from: 2.44, to: 3.11, color: chartColors.ordinal[2], label: 'Medio' },
    { from: 3.11, to: 3.29, color: chartColors.ordinal[3] },
    { from: 3.29, to: 3.6, color: chartColors.ordinal[4], label: 'Muy alto' },
  ] as RangeBand[] },
};

export function whrRange(sex: 'hombre' | 'mujer'): { min: number; max: number; bands: RangeBand[] } {
  const limit = waistHipLimit(sex);
  return { min: 0.6, max: 1.15, bands: [
    { from: 0.6, to: limit, color: GOOD, label: 'Bajo riesgo' },
    { from: limit, to: 1.15, color: BAD, label: 'Riesgo' },
  ] };
}

export function conicityRange(sex: 'hombre' | 'mujer'): { min: number; max: number; bands: RangeBand[] } {
  const limit = conicityLimit(sex);
  return { min: 1, max: 1.5, bands: [
    { from: 1, to: limit, color: GOOD, label: 'Bajo riesgo' },
    { from: limit, to: 1.5, color: BAD, label: 'Riesgo' },
  ] };
}

export const DISTRIBUTION_COLORS = [chartColors.ordinal[1], chartColors.ordinal[2], chartColors.ordinal[4]];

/** Color de texto de un tono. */
export function toneColor(tone: 'good' | 'neutral' | 'warn' | 'bad'): string {
  return tone === 'good' ? colors.success : tone === 'bad' ? colors.danger : tone === 'warn' ? '#7A5200' : colors.textSecondary;
}
