// Supabase Edge Function: genera sugerencias de alimentos con Google Gemini para el
// Constructor de plan. Corre server-side para no exponer GEMINI_API_KEY al cliente.
//
// Despliegue (una sola vez):
//   supabase functions deploy generate-plan-suggestions --no-verify-jwt
//   supabase secrets set GEMINI_API_KEY=AIzaSy...
//
// --no-verify-jwt es necesario: sin él, el gateway de Supabase exige un JWT
// válido en TODAS las peticiones, incluido el preflight OPTIONS del navegador
// (que nunca lleva Authorization) — eso lo rechaza con 401 antes de que este
// código corra, y el navegador lo reporta como "CORS error". La verificación
// de sesión ya la hace este código más abajo (con el JWT real del POST), así
// que desactivar la verificación automática del gateway es seguro acá.
//
// El cliente llama esto vía supabase.functions.invoke(), que reenvía el JWT
// del entrenador logueado — por eso acá se usa ese JWT (no la service role)
// para que RLS siga garantizando que solo puede pedir sugerencias de sus propios clientes.

import { createClient } from 'npm:@supabase/supabase-js@^2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const geminiResponseSchema = {
  type: 'OBJECT',
  properties: {
    carbohidratos: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          quantity: { type: 'STRING' },
          reason: { type: 'STRING' },
        },
        required: ['name', 'quantity'],
      },
    },
    proteinas: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          quantity: { type: 'STRING' },
          reason: { type: 'STRING' },
        },
        required: ['name', 'quantity'],
      },
    },
    vegetales: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          quantity: { type: 'STRING' },
          reason: { type: 'STRING' },
        },
        required: ['name', 'quantity'],
      },
    },
    frutas: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          quantity: { type: 'STRING' },
          reason: { type: 'STRING' },
        },
        required: ['name', 'quantity'],
      },
    },
    grasas: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          quantity: { type: 'STRING' },
          reason: { type: 'STRING' },
        },
        required: ['name', 'quantity'],
      },
    },
    lacteos: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          quantity: { type: 'STRING' },
          reason: { type: 'STRING' },
        },
        required: ['name', 'quantity'],
      },
    },
  },
  required: ['carbohidratos', 'proteinas', 'vegetales', 'frutas', 'grasas', 'lacteos'],
};

type RequestBody = {
  clientId: string;
  mealSlots: { name: string; time: string; type: string }[];
  waterLiters: string;
  supplements: { name: string; dose: string; schedule: string; scheduleDetail?: string }[];
  aiNote: string;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as RequestBody;
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Falta autenticación.');

    // Cliente con el JWT del entrenador (no service role) para que RLS aplique.
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const [
      { data: client, error: clientError },
      { data: tags, error: tagsError },
      { data: latestMeasurement, error: measurementError },
    ] = await Promise.all([
      supabase.from('clients').select('full_name, goal, notes, medical_notes, age').eq('id', body.clientId).single(),
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

    const allergies = (tags ?? []).filter((t) => t.kind === 'alergia').map((t) => t.label);
    const conditions = (tags ?? []).filter((t) => t.kind === 'condicion').map((t) => t.label);
    const avoid = (tags ?? []).filter((t) => t.kind === 'evita').map((t) => t.label);

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GEMINY_API_KEY');
    if (!geminiApiKey) {
      throw new Error('Falta configurar el secret GEMINI_API_KEY en Supabase.');
    }

    const m = latestMeasurement;
    const anthropometryParts: string[] = [];
    if (m) {
      if (m.weight_kg) anthropometryParts.push(`Peso: ${m.weight_kg} kg`);
      if (m.height_cm) anthropometryParts.push(`Estatura: ${m.height_cm} cm`);
      if (m.body_fat_pct) anthropometryParts.push(`% Grasa: ${m.body_fat_pct}%`);
      if (m.muscle_mass_pct) anthropometryParts.push(`% Masa Muscular: ${m.muscle_mass_pct}%`);
      if (m.bmi) anthropometryParts.push(`IMC: ${m.bmi}`);
      if (m.bmr_kcal) anthropometryParts.push(`Metabolismo basal (BMR): ${m.bmr_kcal} kcal`);
      if (m.visceral_fat) anthropometryParts.push(`Grasa visceral: nivel ${m.visceral_fat}`);
      if (m.waist_cm) anthropometryParts.push(`Cintura: ${m.waist_cm} cm`);
      if (m.hip_cm) anthropometryParts.push(`Cadera: ${m.hip_cm} cm`);
      if (m.waist_hip_ratio) anthropometryParts.push(`Ratio Cintura/Cadera: ${m.waist_hip_ratio}`);
      if (m.chest_cm) anthropometryParts.push(`Pecho: ${m.chest_cm} cm`);
      if (m.arm_right_cm || m.arm_left_cm) anthropometryParts.push(`Bíceps: Der ${m.arm_right_cm ?? '—'} cm / Izq ${m.arm_left_cm ?? '—'} cm`);
      if (m.thigh_right_cm || m.thigh_left_cm) anthropometryParts.push(`Muslo: Der ${m.thigh_right_cm ?? '—'} cm / Izq ${m.thigh_left_cm ?? '—'} cm`);
      if (m.triceps_mm || m.abdominal_mm || m.subscapular_mm) {
        anthropometryParts.push(`Pliegues: Tríceps ${m.triceps_mm ?? '—'}mm, Abdominal ${m.abdominal_mm ?? '—'}mm, Subescapular ${m.subscapular_mm ?? '—'}mm`);
      }
    }

    const anthropometryText = anthropometryParts.length > 0
      ? `Mediciones antropométricas y físicas actuales: ${anthropometryParts.join(', ')}.`
      : 'Sin mediciones físicas registradas.';

    const prompt = `Eres un asistente experto en nutrición deportiva para un entrenador personal que arma planes nutricionales precisos. Genera sugerencias de alimentos y suplementos para este cliente, agrupadas por categoría.

Cliente: ${client.full_name}${client.age != null ? `, ${client.age} años` : ''}
Objetivo: ${client.goal ?? 'no especificado'}
${anthropometryText}
${allergies.length > 0 ? `Alergias (NUNCA sugerir ni incluir): ${allergies.join(', ')}` : 'Sin alergias registradas.'}
${conditions.length > 0 ? `Condiciones médicas relevantes: ${conditions.join(', ')}` : ''}
${avoid.length > 0 ? `Alimentos a evitar (no sugerir): ${avoid.join(', ')}` : ''}
${client.notes ? `Notas del entrenador: ${client.notes}` : ''}
${client.medical_notes ? `Notas médicas: ${client.medical_notes}` : ''}

Comidas del día configuradas: ${
      body.mealSlots.length > 0 ? body.mealSlots.map((m) => `${m.name} (${m.time})`).join(', ') : 'sin configurar'
    }
Hidratación mínima: ${body.waterLiters || 'sin especificar'} L/día
Suplementación base ya definida por el entrenador: ${
      body.supplements.length > 0
        ? body.supplements.map((s) => `${s.name} — ${s.dose} — ${s.scheduleDetail ?? s.schedule}`).join('; ')
        : 'ninguna'
    }
Nota adicional del entrenador para esta generación: ${body.aiNote || 'ninguna'}

REGLAS ESTRICTAS DE CANTIDADES Y UNIDADES (MUY IMPORTANTE):
1. NO USES 'tazas', 'vasos' ni medidas caseras ambiguas.
2. Para carnes, pescados, vegetales, carbohidratos y sólidos: usa siempre gramos exactos (ej. "150g", "120g", "80g", "200g").
3. Para huevos o claras: exprésalos SIEMPRE por cantidad de unidades, NUNCA en mililitros ni gramos (ej. "3 claras", "2 huevos enteros", "1 huevo entero + 3 claras", "4 claras").
4. Para frutas: usa unidades o gramos (ej. "1 und mediana", "150g").
5. Para aceites o frutos secos: usa gramos (ej. "10g", "15g", "25g").
6. Para lácteos: usa gramos (ej. "150g yogurt griego", "30g queso bajo en grasa") o mililitros para leche (ej. "200ml").
7. Solo genera alimentos para las 6 categorías: carbohidratos, proteinas, vegetales, frutas, grasas y lacteos (los suplementos ya fueron configurados en el Paso 1).

VOCABULARIO Y LOCALIZACIÓN (ESPAÑOL LATINOAMÉRICA / VENEZUELA):
- Usa "Batata" (NUNCA digas "Camote" ni "Boniato").
- Usa "Aguacate" (no "Palta").
- Usa "Auyama" o "Calabaza".
- Usa "Plátano" / "Cambur" según corresponda.
- Usa términos comunes, naturales y ampliamente conocidos en el fitness de la región.

CANTIDAD DE SUGERENCIAS:
Para cada uno de los 6 grupos (carbohidratos, proteinas, vegetales, frutas, grasas, lacteos) sugiere entre 3 y 5 opciones variadas y concretas con sus cantidades claras. Si alguna alergia o intolerancia (como intolerancia a la lactosa) obliga a evitar un alimento típico, sugiere una alternativa segura (ej. lácteos sin lactosa, bebidas vegetales) y explica el motivo brevemente en "reason".`;

    const geminiPayload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: geminiResponseSchema,
        temperature: 0.7,
      },
    };

    // Intentar primero con gemini-3.5-flash, fallback a gemini-flash-latest
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
      throw new Error(`Gemini no devolvió sugerencias válidas: ${lastError}`);
    }

    return new Response(generatedText, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

