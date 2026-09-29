// Supabase Edge Function: propuesta de rutina de entrenamiento con Google Gemini.
// La IA SOLO puede elegir ejercicios del banco del entrenador: la app envía el catálogo ya filtrado
// para el cliente (equipo disponible y sin contraindicaciones) y aquí se comprueba que cada id existe
// y es visible para el usuario (RLS). El esquema de respuesta restringe exercise_id a esos ids.
//
// Despliegue: supabase functions deploy generate-workout-suggestions --no-verify-jwt
// Secret requerido: GEMINI_API_KEY.

import { createClient } from 'npm:@supabase/supabase-js@^2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type CatalogItem = {
  id: string;
  name: string;
  muscle_group: string;
  secondary_muscles?: string[];
  movement_pattern?: string | null;
  exercise_type?: string | null;
  equipment: string;
  laterality?: string;
  metric?: string;
};

type RequestBody = {
  clientId: string;
  days: { index: number; day_name: string; focus?: string; muscles?: string[] }[];
  catalog: CatalogItem[];
  exercisesPerDay: number;
  allowSupersets: boolean;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function responseSchema(exerciseIds: string[]) {
  return {
    type: 'OBJECT',
    properties: {
      days: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            day_index: { type: 'INTEGER' },
            blocks: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  type: { type: 'STRING', enum: ['single', 'superset'] },
                  sets: { type: 'INTEGER' },
                  rest_seconds: { type: 'INTEGER' },
                  exercises: {
                    type: 'ARRAY',
                    items: {
                      type: 'OBJECT',
                      properties: {
                        exercise_id: { type: 'STRING', enum: exerciseIds },
                        reps: { type: 'STRING' },
                        weight: { type: 'STRING' },
                        rir: { type: 'STRING' },
                        notes: { type: 'STRING' },
                      },
                      required: ['exercise_id', 'reps'],
                    },
                  },
                },
                required: ['type', 'sets', 'rest_seconds', 'exercises'],
              },
            },
          },
          required: ['day_index', 'blocks'],
        },
      },
    },
    required: ['days'],
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Falta autenticación.' }, 401);

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GEMINY_API_KEY');
    if (!geminiApiKey) return json({ error: 'Falta configurar el secret GEMINI_API_KEY en Supabase.' }, 500);

    // Cliente con el JWT del entrenador (no service role) para que RLS aplique
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return json({ error: 'Sesión no válida.' }, 401);

    const body = (await req.json()) as RequestBody;
    const exercisesPerDay = Math.min(Math.max(Math.round(body.exercisesPerDay || 6), 1), 12);
    const catalogIds = [...new Set((body.catalog ?? []).map((c) => c.id))].slice(0, 400);

    const [
      { data: client, error: clientError },
      { data: tags, error: tagsError },
      { data: latestMeasurement },
      { data: visibleExercises, error: exercisesError },
    ] = await Promise.all([
      supabase.from('clients').select('*').eq('id', body.clientId).single(),
      supabase.from('client_tags').select('kind, label').eq('client_id', body.clientId),
      supabase
        .from('measurements')
        .select('weight_kg, height_cm, body_fat_pct')
        .eq('client_id', body.clientId)
        .order('measured_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      catalogIds.length
        ? supabase.from('exercises').select('id').in('id', catalogIds).is('archived_at', null)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (clientError) return json({ error: 'No se encontró el cliente.' }, 404);
    if (tagsError) throw new Error(tagsError.message);
    if (exercisesError) throw new Error(exercisesError.message);

    // Solo ejercicios que existen y que este usuario puede ver
    const allowed = new Set((visibleExercises ?? []).map((e: { id: string }) => e.id));
    const catalog = (body.catalog ?? []).filter((c) => allowed.has(c.id));
    if (catalog.length === 0) {
      return json({ error: 'El banco no tiene ejercicios que este cliente pueda hacer con su equipo.' }, 400);
    }

    const conditions = (tags ?? []).filter((t) => t.kind === 'condicion').map((t) => t.label);
    const m = latestMeasurement;

    const catalogLines = catalog
      .map(
        (c) =>
          `${c.id} | ${c.name} | músculo: ${c.muscle_group}${
            c.secondary_muscles?.length ? ` (+${c.secondary_muscles.join(', ')})` : ''
          } | patrón: ${c.movement_pattern ?? '-'} | tipo: ${c.exercise_type ?? '-'} | mide: ${c.metric ?? 'reps_peso'} | ${
            c.laterality ?? 'bilateral'
          }`
      )
      .join('\n');

    const dayLines = body.days
      .map(
        (d) =>
          `- day_index ${d.index}: "${d.day_name}"${d.focus ? ` — ${d.focus}` : ''}${
            d.muscles?.length ? ` — músculos: ${d.muscles.join(', ')}` : ''
          }`
      )
      .join('\n');

    const prompt = `Eres un entrenador personal experto. Diseña la rutina semanal de este cliente usando EXCLUSIVAMENTE ejercicios del catálogo (por su id).

CLIENTE:
- Objetivo: ${client.training_goal || client.goal || 'hipertrofia'}
- Nivel: ${client.training_level || 'intermedio'}
- Duración de sesión: ${client.session_duration_min ? `${client.session_duration_min} min` : 'no indicada'}
- Notas: ${client.training_notes || 'ninguna'}
- Medidas: peso ${m?.weight_kg ?? 'N/A'} kg, estatura ${m?.height_cm ?? 'N/A'} cm, grasa ${m?.body_fat_pct ?? 'N/A'} %
- Condiciones médicas: ${conditions.length ? conditions.join(', ') : 'ninguna'} (el catálogo ya excluye los ejercicios contraindicados)

DÍAS:
${dayLines}

CATÁLOGO (id | nombre | datos):
${catalogLines}

REGLAS:
1. Cada día lleva EXACTAMENTE ${exercisesPerDay} ejercicios en total (cada ejercicio de una superserie cuenta). Si el catálogo no tiene suficientes para los músculos del día, usa menos: nunca inventes.
2. ${
      body.allowSupersets
        ? 'Puedes usar como máximo 1 superserie de 2 ejercicios por día (bloque "superset"), preferiblemente con accesorios.'
        : 'No uses superseries: todos los bloques son "single" con 1 ejercicio.'
    }
3. Un bloque "single" tiene exactamente 1 ejercicio. No repitas un ejercicio dentro del mismo día.
4. Prioriza los músculos indicados en cada día; primero los multiarticulares (tipo fuerza), luego los accesorios.
5. "reps" según cómo se mide: reps_peso/reps/reps_asistencia → rango como "8-10"; tiempo → segundos como "30 s"; distancia → metros como "200 m". En ejercicios unilaterales o alternados las reps son por lado.
6. "weight": carga orientativa coherente con el nivel ("20 kg", "14 kg por mancuerna"); vacío si se hace con peso corporal, por tiempo o por distancia.
7. "rir": repeticiones en reserva como "1-2"; "notes": una indicación breve opcional para este cliente.
8. Descanso en segundos: 90-180 en multiarticulares pesados, 60-90 en accesorios.`;

    const payload = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema(catalog.map((c) => c.id)),
        temperature: 0.3,
      },
    };

    let lastError = '';
    let parsed: { days?: { day_index: number; blocks: any[] }[] } | null = null;
    for (const model of ['gemini-3.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash']) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
        );
        if (!res.ok) {
          lastError = `[${model}] ${res.status}: ${await res.text()}`;
          continue;
        }
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          parsed = JSON.parse(text);
          break;
        }
        lastError = `[${model}] respuesta vacía`;
      } catch (err) {
        lastError = `[${model}] ${(err as Error).message}`;
      }
    }
    if (!parsed?.days) {
      console.error('generate-workout-suggestions sin respuesta de Gemini:', lastError);
      return json({ error: 'La IA no respondió. Se usará la propuesta automática con tu banco.' }, 502);
    }

    // Validación final: solo ids del catálogo permitido, sin repetir dentro del día
    const allowedIds = new Set(catalog.map((c) => c.id));
    const days = parsed.days.map((day) => {
      const seen = new Set<string>();
      const blocks = (day.blocks ?? [])
        .map((block) => ({
          ...block,
          exercises: (block.exercises ?? []).filter((ex: { exercise_id: string }) => {
            if (!allowedIds.has(ex.exercise_id) || seen.has(ex.exercise_id)) return false;
            seen.add(ex.exercise_id);
            return true;
          }),
        }))
        .filter((block) => block.exercises.length > 0)
        .map((block) => ({ ...block, type: block.exercises.length > 1 && body.allowSupersets ? 'superset' : 'single' }))
        // Un "single" con varios ejercicios (o superseries no permitidas) se separa en bloques individuales
        .flatMap((block) =>
          block.type === 'single' && block.exercises.length > 1
            ? block.exercises.map((ex: unknown) => ({ ...block, exercises: [ex] }))
            : [block]
        );
      return { day_index: day.day_index, blocks };
    });

    return json({ success: true, data: { days } });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
