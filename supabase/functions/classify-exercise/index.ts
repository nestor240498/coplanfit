// Supabase Edge Function: alta rápida de ejercicios. A partir del nombre, Gemini propone la
// clasificación completa (músculos, equipo, tipo, métrica, lateralidad, patrón, dificultad),
// indicaciones breves, contraindicaciones y sinónimos. El entrenador solo confirma o corrige.
//
// Despliegue:
//   supabase functions deploy classify-exercise --no-verify-jwt
// (--no-verify-jwt por el preflight CORS en web; la sesión se valida abajo con el JWT real).
// Secret requerido: GEMINI_API_KEY.
//
// Los valores permitidos deben coincidir con src/features/workouts/types.ts.

import { createClient } from 'npm:@supabase/supabase-js@^2.45.0';

import { callGemini, geminiFailureMessage } from '../_shared/gemini.ts';
import { checkAiQuota, recordAiGeneration } from '../_shared/quota.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MUSCLES = [
  'pecho', 'espalda', 'hombros', 'biceps', 'triceps', 'cuadriceps', 'isquiotibiales', 'gluteos',
  'core', 'gemelos', 'trapecio', 'antebrazos', 'lumbar', 'aductores', 'abductores', 'cuerpo_completo',
];
const EQUIPMENT = [
  'barra', 'mancuernas', 'polea', 'maquina', 'peso_corporal', 'kettlebell', 'multipower', 'barra_z',
  'bandas', 'trx', 'landmine', 'disco', 'balon_medicinal', 'fitball', 'banco', 'cajon',
  'barra_dominadas', 'cardio', 'otro',
];
const TYPES = ['fuerza', 'aislamiento', 'cardio', 'movilidad', 'pliometria', 'calentamiento', 'rehabilitacion'];
const METRICS = ['reps_peso', 'reps', 'tiempo', 'distancia', 'reps_asistencia'];
const LATERALITIES = ['bilateral', 'unilateral', 'alternado'];
const PATTERNS = [
  'empuje_horizontal', 'empuje_vertical', 'traccion_horizontal', 'traccion_vertical', 'sentadilla',
  'bisagra', 'zancada', 'core_estabilidad', 'core_flexion', 'acarreo', 'aislamiento', 'cardio', 'movilidad',
];
const LEVELS = ['principiante', 'intermedio', 'avanzado'];

const responseSchema = {
  type: 'OBJECT',
  properties: {
    muscle_group: { type: 'STRING', enum: MUSCLES },
    secondary_muscles: { type: 'ARRAY', items: { type: 'STRING', enum: MUSCLES } },
    equipment: { type: 'STRING', enum: EQUIPMENT },
    extra_equipment: { type: 'ARRAY', items: { type: 'STRING', enum: EQUIPMENT } },
    exercise_type: { type: 'STRING', enum: TYPES },
    metric: { type: 'STRING', enum: METRICS },
    laterality: { type: 'STRING', enum: LATERALITIES },
    movement_pattern: { type: 'STRING', enum: PATTERNS },
    difficulty: { type: 'STRING', enum: LEVELS },
    cues: { type: 'ARRAY', items: { type: 'STRING' } },
    contraindications: { type: 'ARRAY', items: { type: 'STRING' } },
    aliases: { type: 'ARRAY', items: { type: 'STRING' } },
    description: { type: 'STRING' },
  },
  required: [
    'muscle_group', 'secondary_muscles', 'equipment', 'extra_equipment', 'exercise_type', 'metric',
    'laterality', 'movement_pattern', 'difficulty', 'cues', 'contraindications', 'aliases',
    'description',
  ],
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

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

    const { name } = (await req.json()) as { name?: string };
    const exerciseName = (name ?? '').trim().slice(0, 120);
    if (exerciseName.length < 3) return json({ error: 'El nombre del ejercicio es requerido.' }, 400);

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) return json({ error: 'Falta configurar el secret GEMINI_API_KEY.' }, 500);

    const prompt = `Eres un entrenador personal experto. Clasifica este ejercicio para el banco de ejercicios de una app de entrenadores hispanohablantes.
Ejercicio: "${exerciseName}"

Reglas:
- muscle_group: el músculo que más trabaja. secondary_muscles: 0 a 3 músculos que también trabajan de forma relevante (sin repetir el principal).
- equipment: el equipo principal. extra_equipment: otro equipo imprescindible (p. ej. banco o cajón), o lista vacía.
- metric: "reps_peso" si se carga peso externo; "reps" si es con peso corporal; "tiempo" para planchas, isometrías, cardio por tiempo o estiramientos; "distancia" para carreras, remo o acarreos por metros; "reps_asistencia" para dominadas o fondos asistidos.
- laterality: "unilateral" si se hace un lado cada vez; "alternado" si se alternan lados en la misma serie; si no, "bilateral".
- difficulty: nivel técnico mínimo recomendado.
- cues: 2 o 3 indicaciones de sala, de 2 a 5 palabras, en español coloquial ("pecho arriba", "codos pegados").
- contraindications: 0 a 3 condiciones o lesiones comunes con las que conviene evitarlo o adaptarlo, en pocas palabras ("hernia discal lumbar", "dolor de hombro"). Lista vacía si no aplica.
- aliases: 0 a 3 nombres alternativos habituales (en español o inglés de gimnasio), distintos del nombre dado.
- description: UNA frase de 10 a 20 palabras que diga qué es el ejercicio y qué trabaja, para alguien que no lo conoce ("Sentadilla a una pierna con el pie trasero sobre un banco; trabaja cuádriceps y glúteos."). Sin consejos técnicos ni errores a evitar.`;

    const payload = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema, temperature: 0.1 },
    };

    const blocked = await checkAiQuota(supabase, 'Mientras tanto puedes rellenar los datos a mano.');
    if (blocked) return json(blocked.body, blocked.status);

    const result = await callGemini(geminiApiKey, payload);
    if (!result.ok) {
      console.error('classify-exercise sin respuesta de Gemini:', result.detail);
      // `detail` (código y mensaje de Gemini, nunca la clave) lo muestra la app solo en desarrollo
      return json(
        {
          error: geminiFailureMessage(result, 'Prueba de nuevo en un minuto o rellena los datos a mano.'),
          detail: result.detail,
        },
        result.transient ? 503 : 502
      );
    }
    const parsed = JSON.parse(result.text);
    parsed.description = String(parsed.description ?? '').trim().slice(0, 200);
    // Cuenta 1 e incluye la redacción de la técnica que la app pide justo después
    await recordAiGeneration(supabase, 'ejercicio');
    parsed.secondary_muscles = (parsed.secondary_muscles ?? []).filter((m: string) => m !== parsed.muscle_group);
    parsed.extra_equipment = (parsed.extra_equipment ?? []).filter((e: string) => e !== parsed.equipment);
    return json(parsed);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
