import { supabase } from '@/lib/supabase';

import { Measurement } from './types';

export type MeasurementInput = {
  // Composición corporal
  weight_kg?: number | null;
  height_cm?: number | null;
  body_fat_pct?: number | null;
  muscle_mass_pct?: number | null;
  visceral_fat?: number | null;
  bmr_kcal?: number | null;
  // Perímetros corporales (cm)
  neck_cm?: number | null;
  shoulders_cm?: number | null;
  chest_cm?: number | null;
  waist_cm?: number | null;
  abdomen_cm?: number | null;
  hip_cm?: number | null;
  arm_cm?: number | null;
  arm_right_cm?: number | null;
  arm_left_cm?: number | null;
  arm_flexed_right_cm?: number | null;
  arm_flexed_left_cm?: number | null;
  forearm_right_cm?: number | null;
  forearm_left_cm?: number | null;
  thigh_right_cm?: number | null;
  thigh_left_cm?: number | null;
  calf_right_cm?: number | null;
  calf_left_cm?: number | null;
  // Plicometría (mm)
  triceps_mm?: number | null;
  biceps_mm?: number | null;
  subscapular_mm?: number | null;
  suprailiac_mm?: number | null;
  supraspinal_mm?: number | null;
  abdominal_mm?: number | null;
  thigh_mm?: number | null;
  calf_mm?: number | null;
  chest_mm?: number | null;
};

export async function listMeasurements(clientId: string): Promise<Measurement[]> {
  const { data, error } = await supabase
    .from('measurements')
    .select('*')
    .eq('client_id', clientId)
    .order('measured_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Measurement[];
}

export async function getMeasurementById(id: string): Promise<Measurement> {
  const { data, error } = await supabase.from('measurements').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data as Measurement;
}

export async function getLatestMeasurement(clientId: string): Promise<Measurement | null> {
  const { data, error } = await supabase
    .from('measurements')
    .select('*')
    .eq('client_id', clientId)
    .order('measured_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Measurement | null;
}

/** Crea una nueva entrada en el histórico (append-only, nunca sobrescribe la anterior). */
export async function createMeasurement(clientId: string, input: MeasurementInput): Promise<Measurement> {
  const { data, error } = await supabase
    .from('measurements')
    .insert({ client_id: clientId, ...input })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Measurement;
}
