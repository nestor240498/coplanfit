// Supabase Edge Function: lee un informe antropométrico en PDF (p. ej. ISAKmetry, perfil ISAK restringido)
// y devuelve las medidas en bruto para que el entrenador las revise antes de guardar. El PDF no se guarda.
//
// Despliegue:
//   supabase functions deploy extract-anthropometry-report --no-verify-jwt
// Secret requerido: GEMINI_API_KEY. Cuenta 1 generación (kind 'medicion', migración 017).
//
// Las claves de `sites` son las columnas de `measurements` (src/features/anthropometry/engine/sites.ts).

import { createClient } from 'npm:@supabase/supabase-js@^2.45.0';

import { callGemini, geminiFailureMessage } from '../_shared/gemini.ts';
import { checkAiQuota, recordAiGeneration } from '../_shared/quota.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Clave → descripción para el modelo (unidades del informe original)
const SITES: Record<string, string> = {
  weight_kg: 'Masa corporal / peso (kg)',
  height_cm: 'Talla / estatura (cm)',
  sitting_height_cm: 'Talla sentado (cm)',
  arm_span_cm: 'Envergadura de brazos (cm)',
  triceps_mm: 'Pliegue tríceps (mm)',
  subscapular_mm: 'Pliegue subescapular (mm)',
  biceps_mm: 'Pliegue bíceps (mm)',
  suprailiac_mm: 'Pliegue cresta ilíaca, también llamado suprailíaco o ileocrestal (mm)',
  supraspinal_mm: 'Pliegue supraespinal (mm)',
  abdominal_mm: 'Pliegue abdominal (mm)',
  thigh_mm: 'Pliegue muslo anterior / muslo frontal (mm)',
  calf_mm: 'Pliegue pierna medial / pantorrilla (mm)',
  arm_right_cm: 'Perímetro brazo relajado (cm)',
  arm_flexed_right_cm: 'Perímetro brazo flexionado y contraído (cm)',
  waist_cm: 'Perímetro cintura (cm)',
  hip_cm: 'Perímetro cadera / glúteo (cm)',
  thigh_right_cm: 'Perímetro muslo medio (cm)',
  calf_right_cm: 'Perímetro pierna / pantorrilla (cm)',
  humerus_breadth_cm: 'Diámetro húmero / biepicondilar del húmero (cm)',
  wrist_breadth_cm: 'Diámetro biestiloideo / muñeca (cm)',
  femur_breadth_cm: 'Diámetro fémur / bicondilar del fémur (cm)',
};

const REPORTED: Record<string, string> = {
  fat_pct: '% de grasa (masa grasa en %)',
  fat_kg: 'Masa grasa (kg)',
  adipose_kg: 'Tejido adiposo (kg)',
  muscle_kg: 'Tejido muscular / masa muscular (kg)',
  bone_kg: 'Tejido óseo / masa ósea (kg)',
  residual_kg: 'Tejido residual (kg)',
  endo: 'Endomorfia',
  meso: 'Mesomorfia',
  ecto: 'Ectomorfia',
  sum6: 'Sumatorio de 6 pliegues (mm)',
  sum8: 'Sumatorio de 8 pliegues (mm)',
};

const numberProps = (keys: Record<string, string>) =>
  Object.fromEntries(Object.keys(keys).map((k) => [k, { type: 'NUMBER', nullable: true }]));

const responseSchema = {
  type: 'OBJECT',
  properties: {
    measured_on: { type: 'STRING', nullable: true, description: 'Fecha de la evaluación en formato YYYY-MM-DD' },
    evaluator: { type: 'STRING', nullable: true },
    sites: { type: 'OBJECT', properties: numberProps(SITES) },
    reported: { type: 'OBJECT', properties: numberProps(REPORTED) },
  },
  required: ['sites'],
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// 5 MB de PDF ≈ 6,7 millones de caracteres en base64
const MAX_BASE64 = 7_000_000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Falta autenticación.' }, 401);
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return json({ error: 'Sesión no válida.' }, 401);

    const { clientId, pdfBase64 } = (await req.json()) as { clientId?: string; pdfBase64?: string };
    if (!clientId || !pdfBase64) return json({ error: 'Falta el cliente o el archivo.' }, 400);
    if (pdfBase64.length > MAX_BASE64) return json({ error: 'El PDF pesa demasiado: el máximo es 5 MB.' }, 413);

    // RLS: solo se puede leer para un cliente propio
    const { data: client, error: clientError } = await supabase.from('clients').select('id').eq('id', clientId).maybeSingle();
    if (clientError || !client) return json({ error: 'No se encontró el cliente.' }, 404);

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) return json({ error: 'Falta configurar el secret GEMINI_API_KEY.' }, 500);

    const blocked = await checkAiQuota(supabase, 'Mientras tanto puedes copiar los valores a mano.');
    if (blocked) return json(blocked.body, blocked.status);

    const prompt = `Eres un antropometrista ISAK. Extrae los datos de este informe antropométrico (por ejemplo, de ISAKmetry).

Reglas:
- "sites": el valor MEDIDO (columna «Resultados»), en las unidades indicadas. No uses las puntuaciones Z ni valores corregidos.
${Object.entries(SITES).map(([k, v]) => `  - ${k}: ${v}`).join('\n')}
- Si una medida no aparece en el informe, pon null. Nunca inventes ni calcules valores.
- "reported": los resultados calculados que muestre el informe, si aparecen; si no, null.
${Object.entries(REPORTED).map(([k, v]) => `  - ${k}: ${v}`).join('\n')}
- "measured_on": la fecha de la evaluación convertida a YYYY-MM-DD (los informes en español usan día-mes-año).
- "evaluator": quién realizó la evaluación, si aparece.
- Usa punto decimal en los números (14,22 → 14.22).`;

    const result = await callGemini(geminiApiKey, {
      contents: [
        {
          role: 'user',
          parts: [{ inline_data: { mime_type: 'application/pdf', data: pdfBase64 } }, { text: prompt }],
        },
      ],
      generationConfig: { responseMimeType: 'application/json', responseSchema, temperature: 0 },
    });
    if (!result.ok) {
      console.error('extract-anthropometry-report sin respuesta de Gemini:', result.detail);
      return json(
        { error: geminiFailureMessage(result, 'Prueba de nuevo en un minuto o copia los valores a mano.'), detail: result.detail },
        result.transient ? 503 : 502
      );
    }

    const parsed = JSON.parse(result.text);
    await recordAiGeneration(supabase, 'medicion', clientId);
    return json({
      measured_on: typeof parsed.measured_on === 'string' ? parsed.measured_on : null,
      evaluator: typeof parsed.evaluator === 'string' ? parsed.evaluator.slice(0, 120) : null,
      sites: parsed.sites ?? {},
      reported: parsed.reported ?? null,
    });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
