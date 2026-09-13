// Supabase Edge Function: Generación de rutinas de entrenamiento con Google Gemini
// Sigue la arquitectura idéntica y eficiente de generate-plan-suggestions.

import { createClient } from 'npm:@supabase/supabase-js@^2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const geminiWorkoutSchema = {
  type: 'OBJECT',
  properties: {
    days: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          day_name: { type: 'STRING' },
          focus: { type: 'STRING' },
          blocks: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                type: { type: 'STRING', enum: ['single', 'superset'] },
                title: { type: 'STRING' },
                sets: { type: 'NUMBER' },
                rest_seconds: { type: 'NUMBER' },
                exercise: {
                  type: 'OBJECT',
                  properties: {
                    name: { type: 'STRING' },
                    reps: { type: 'STRING' },
                    weight: { type: 'STRING' },
                    notes: { type: 'STRING' },
                  },
                },
                exercises: {
                  type: 'ARRAY',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      name: { type: 'STRING' },
                      reps: { type: 'STRING' },
                      weight: { type: 'STRING' },
                      notes: { type: 'STRING' },
                    },
                    required: ['name', 'reps'],
                  },
                },
              },
              required: ['type', 'sets', 'rest_seconds'],
            },
          },
        },
        required: ['day_name', 'blocks'],
      },
    },
  },
  required: ['days'],
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Falta autenticación.');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GEMINY_API_KEY');

    if (!geminiApiKey) {
      throw new Error('Falta configurar el secret GEMINI_API_KEY en Supabase.');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const [
      { data: client, error: clientError },
      { data: tags, error: tagsError },
      { data: latestMeasurement, error: measurementError },
    ] = await Promise.all([
      supabase.from('clients').select('*').eq('id', body.clientId).single(),
      supabase.from('client_tags').select('kind, label').eq('client_id', body.clientId),
      supabase
        .from('measurements')
        .select('weight_kg, height_cm, body_fat_pct, bmi')
        .eq('client_id', body.clientId)
        .order('measured_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (clientError) throw new Error(clientError.message);
    if (tagsError) throw new Error(tagsError.message);
    if (measurementError) throw new Error(measurementError.message);

    const conditions = (tags ?? []).filter((t) => t.kind === 'condicion').map((t) => t.label);

    const prompt = `Eres un entrenador personal y fisiólogo del ejercicio de élite en CoplanFit. Genera la propuesta de rutina de entrenamiento en formato JSON.

CLIENTE:
- Nombre: ${client.full_name || `${client.first_name || ''} ${client.last_name || ''}`}
- Objetivo: ${client.training_goal || client.goal || 'Hipertrofia y fuerza'}
- Nivel de experiencia: ${client.training_level || 'Intermedio'}
- Equipamiento disponible: ${client.equipment_access || 'Gimnasio comercial completo'}
- Frecuencia semanal: ${client.days_per_week || 4} días por semana
- Notas / Preferencias: ${client.training_notes || client.notes || 'Ninguna'}
- Medidas antropométricas: Peso ${latestMeasurement?.weight_kg || 'N/A'} kg, Estatura ${latestMeasurement?.height_cm || 'N/A'} cm, Grasa corporal ${latestMeasurement?.body_fat_pct || 'N/A'}%
- Condiciones médicas / Lesiones: ${conditions.length > 0 ? conditions.join(', ') : 'Ninguna'}

DÍAS A COMPLETAR:
${JSON.stringify((body.scheduleDays || []).map((d: any) => ({ day_name: d.day_name, focus: d.focus })), null, 2)}

REGLAS DE ENTRENAMIENTO:
1. Para cada día, genera EXACTAMENTE 6 ejercicios en total (4 bloques individuales 'single' y 1 bloque superserie 'superset' de 2 ejercicios).
2. Si el día es "Empuje" (Push): SOLO Pecho, Hombro anterior/lateral y Tríceps.
3. Si el día es "Tirón" (Pull): SOLO Espalda, Deltoides posterior y Bíceps.
4. Si el día es "Pierna" (Legs): SOLO Cuádriceps, Isquios, Glúteos y Gemelos.
5. Adapta según lesiones:
   - Si hay molestia o lesión lumbar/hernia: evita sentadilla libre pesada o peso muerto con barra; usa prensa, sentadilla búlgara o máquinas.
   - Si hay molestia de hombro: evita press trasnuca o fondos profundos.
6. Proporciona repeticiones sugeridas (ej: '8-10', '10-12', '12-15'), peso estimado coherente para el nivel (ej: '60 kg', '14 kg', '30 kg') y descanso en segundos (ej: 90, 120).`;

    const geminiPayload = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: geminiWorkoutSchema,
        temperature: 0.3,
      },
    };

    const models = ['gemini-3.5-flash', 'gemini-flash-latest', 'gemini-3.7-flash'];
    let lastError = '';
    let generatedText = null;

    for (const model of models) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
        const aiRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(geminiPayload),
        });

        if (!aiRes.ok) {
          const errorText = await aiRes.text();
          lastError = `[${model}] Error ${aiRes.status}: ${errorText}`;
          continue;
        }

        const aiData = await aiRes.json();
        const text = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          generatedText = text;
          break;
        }
      } catch (err) {
        lastError = (err as Error).message;
      }
    }

    if (!generatedText) {
      throw new Error(`Gemini no devolvió una respuesta válida: ${lastError}`);
    }

    const parsed = JSON.parse(generatedText);

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
