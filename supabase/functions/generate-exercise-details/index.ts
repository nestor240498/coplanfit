import { createClient } from 'npm:@supabase/supabase-js@^2.45.0';

import { callGemini, geminiFailureMessage } from '../_shared/gemini.ts';
import { checkAiQuota, recordAiGeneration } from '../_shared/quota.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const geminiSchema = {
  type: 'OBJECT',
  properties: {
    instructions: { type: 'STRING' },
    tips: { type: 'STRING' },
    pattern: {
      type: 'STRING',
      enum: [
        'squat',
        'press_horizontal',
        'cable_fly',
        'press_vertical',
        'pull_vertical',
        'pull_horizontal',
        'arm_flexion',
        'arm_extension',
        'lateral_raise',
        'hinge',
        'core',
      ],
    },
    steps: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          step: { type: 'NUMBER' },
          title: { type: 'STRING' },
          description: { type: 'STRING' },
        },
        required: ['step', 'title', 'description'],
      },
    },
  },
  required: ['instructions', 'tips', 'pattern', 'steps'],
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Solo entrenadores con sesión: evita que se use la cuota de Gemini desde fuera de la app
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader ?? '' } },
    });
    const { data: userData } = await supabase.auth.getUser();
    if (!authHeader || !userData.user) {
      return new Response(JSON.stringify({ error: 'Sesión no válida.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const {
      name,
      muscle_group,
      equipment,
      difficulty,
      current_instructions,
      current_tips,
      custom_steps,
    } = body;

    // Técnica pedida dentro de «Completar datos con IA»: ya contó con la clasificación
    const bundled = body.bundled === true;
    const generate_instructions = body.generate_instructions !== false;
    const generate_tips = body.generate_tips !== false;

    if (!name) {
      return new Response(JSON.stringify({ error: 'El nombre del ejercicio es requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY no está configurada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let parsed: any = {
      instructions: current_instructions || '',
      tips: current_tips || '',
      pattern: 'squat',
      steps: [],
    };

    // Si se requiere generar texto (instrucciones o tips), consultamos a Gemini
    if (generate_instructions || generate_tips) {
      const stepsContext = Array.isArray(custom_steps) && custom_steps.filter(Boolean).length > 0
        ? `- Pasos definidos por el entrenador:\n${custom_steps.map((st: string, i: number) => `  Paso ${i + 1}: ${st}`).join('\n')}`
        : '';

      const contextAddition = [
        current_instructions ? `- Instrucciones previas del entrenador: "${current_instructions}"` : '',
        current_tips ? `- Consejos previos del entrenador: "${current_tips}"` : '',
        stepsContext,
      ].filter(Boolean).join('\n');

      const prompt = `Eres un entrenador personal de élite. Tu objetivo es explicar este ejercicio de forma clara, directa, motivadora y fácil de entender para cualquier persona (evita palabras médicas complejas como "húmero", "aducción coronal", "valgo", "glenohumeral"; usa lenguaje cotidiano como "pecho", "brazos", "espalda recta", "baja despacio", "aprieta al subir").
- Ejercicio: "${name}"
- Grupo Muscular Principal: "${muscle_group || 'General'}"
- Equipamiento: "${equipment || 'Libre'}"
- Nivel de Dificultad: "${difficulty || 'intermedio'}"
${contextAddition ? `${contextAddition}\n(Toma en cuenta las notas del entrenador)` : ''}

Genera una respuesta en JSON estricto con:
1. "instructions": 3 pasos claros y breves separados por números: 1. Posición inicial: ... 2. Bajada o fase negativa: ... 3. Subida o contracción: ... (máximo 1 o 2 frases por paso, directo al grano).
2. "tips": Consejo o error común clave en 1 o 2 frases cortas y sencillas.
3. "pattern": Patrón motor ('squat', 'press_horizontal', 'cable_fly', 'press_vertical', 'pull_vertical', 'pull_horizontal', 'arm_flexion', 'arm_extension', 'lateral_raise', 'hinge', 'core').
4. "steps": Array de 3 pasos sencillos y concisos:
   - Paso 1: { "step": 1, "title": "Posición Inicial", "description": "Frase corta y clara del setup inicial." }
   - Paso 2: { "step": 2, "title": "Descenso Controlado", "description": "Frase corta de cómo bajar despacio." }
   - Paso 3: { "step": 3, "title": "Subida y Contracción", "description": "Frase corta de cómo empujar/tirar y apretar el músculo." }`;

      const geminiPayload = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: geminiSchema,
          temperature: 0.2,
        },
      };

      const blocked = await checkAiQuota(supabase, 'Mientras tanto puedes escribir la técnica a mano.', bundled);
      if (blocked) {
        return new Response(JSON.stringify(blocked.body), {
          status: blocked.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const result = await callGemini(geminiApiKey, geminiPayload);
      if (!result.ok) {
        console.error('generate-exercise-details sin respuesta de Gemini:', result.detail);
        return new Response(
          JSON.stringify({
            error: geminiFailureMessage(result, 'Prueba de nuevo en un minuto o escribe la técnica a mano.'),
            detail: result.detail,
          }),
          { status: result.transient ? 503 : 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const generatedText = result.text;
      await recordAiGeneration(supabase, 'ejercicio', null, bundled);

      if (generatedText) {
        try {
          const aiParsed = JSON.parse(generatedText);
          if (generate_instructions) {
            parsed.instructions = aiParsed.instructions || '';
            parsed.steps = Array.isArray(aiParsed.steps) ? aiParsed.steps : [];
          }
          if (generate_tips) {
            parsed.tips = aiParsed.tips || '';
          }
          parsed.pattern = aiParsed.pattern || 'squat';
        } catch (e) {
          console.error('Error parseando JSON de Gemini:', e);
        }
      }
    }

    const finalResponse = {
      instructions: parsed.instructions,
      tips: parsed.tips,
      pattern: parsed.pattern || 'squat',
      steps: Array.isArray(parsed.steps) ? parsed.steps : [],
      // Ya no se generan imágenes con IA: las fotos o el vídeo los aporta el entrenador
      images: [],
    };

    return new Response(JSON.stringify(finalResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
