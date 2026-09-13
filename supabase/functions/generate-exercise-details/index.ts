import { createClient } from 'npm:@supabase/supabase-js@^2.45.0';

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

/**
 * Genera la URL de ilustración de silueta anatómica y biomecánica en alta definición
 */
function buildStepAiImageUrl(exerciseName: string, stepTitle: string, stepNumber: number, muscleGroup: string, stepDetails?: string): string {
  const seed = Math.floor(Math.random() * 900000) + 100000;
  const contextDesc = stepDetails ? `, execution action: ${stepDetails.slice(0, 100)}` : '';
  const prompt = `3d medical fitness anatomy illustration, dark metallic human silhouette demonstrating step ${stepNumber} ${stepTitle} of ${exerciseName} exercise${contextDesc}, glowing neon lime green ${muscleGroup} muscles #8BC53F, clean dark obsidian background, studio lighting, smooth 3d render, blender octane, anatomically correct, high definition, 8k`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=flux&width=720&height=480&seed=${seed}&nologo=true&enhance=true`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
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

    const generate_instructions = body.generate_instructions !== false;
    const generate_tips = body.generate_tips !== false;
    const generate_images = body.generate_images !== false;

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

      const models = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash'];
      let generatedText: string | null = null;
      let lastError = '';

      // Auto-discovery de modelos activos
      try {
        const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`;
        const listRes = await fetch(listUrl);
        if (listRes.ok) {
          const listData = await listRes.json();
          const available = (listData.models || [])
            .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
            .map((m: any) => m.name.replace('models/', ''));

          if (available.length > 0) {
            available.sort((a: string, b: string) => (a.includes('flash') ? -1 : 1));
            models.unshift(...available);
          }
        }
      } catch {
        // continuar con estática
      }

      const uniqueModels = [...new Set(models)];

      for (const model of uniqueModels) {
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

    // Si se generan imágenes
    let stepsWithAiImages: any[] = [];
    if (generate_images) {
      const validCustomSteps = Array.isArray(custom_steps) ? custom_steps.filter(Boolean) : [];

      if (validCustomSteps.length > 0) {
        stepsWithAiImages = validCustomSteps.map((stText: string, i: number) => ({
          step: i + 1,
          title: `Paso ${i + 1}`,
          description: stText,
          image_url: buildStepAiImageUrl(name, `Paso ${i + 1}`, i + 1, muscle_group || 'fitness', stText),
        }));
      } else if (Array.isArray(parsed.steps) && parsed.steps.length > 0) {
        stepsWithAiImages = parsed.steps.map((st: any, i: number) => ({
          step: st.step || i + 1,
          title: st.title || `Paso ${i + 1}`,
          description: st.description || '',
          image_url: buildStepAiImageUrl(name, st.title || `Paso ${i + 1}`, st.step || i + 1, muscle_group || 'fitness', st.description),
        }));
      } else if (parsed.instructions && parsed.instructions.trim()) {
        // Extraer fases desde el texto de instrucciones
        const rawFases = parsed.instructions
          .split(/(?=\d+[\.\)]|\u2705|\u25AA|\bFase\b)/i)
          .map((p: string) => p.trim())
          .filter(Boolean);

        const fases = rawFases.length >= 2 ? rawFases : [
          'Posición inicial y setup',
          'Fase excéntrica y descenso controlado',
          'Fase concéntrica y contracción máxima',
        ];

        stepsWithAiImages = fases.map((faseText: string, i: number) => ({
          step: i + 1,
          title: `Paso ${i + 1}`,
          description: faseText,
          image_url: buildStepAiImageUrl(name, `Paso ${i + 1}`, i + 1, muscle_group || 'fitness', faseText),
        }));
      } else {
        stepsWithAiImages = [
          { step: 1, title: 'Posición Inicial & Setup', description: 'Posición inicial y ajuste postural', image_url: buildStepAiImageUrl(name, 'Posición Inicial & Setup', 1, muscle_group || 'fitness') },
          { step: 2, title: 'Fase Excéntrica (Bajada)', description: 'Descenso controlado en 2-3 segundos', image_url: buildStepAiImageUrl(name, 'Fase Excéntrica', 2, muscle_group || 'fitness') },
          { step: 3, title: 'Fase Concéntrica (Empuje)', description: 'Contracción muscular y exhalación', image_url: buildStepAiImageUrl(name, 'Fase Concéntrica', 3, muscle_group || 'fitness') },
        ];
      }
    }

    const finalResponse = {
      instructions: parsed.instructions,
      tips: parsed.tips,
      pattern: parsed.pattern || 'squat',
      steps: stepsWithAiImages,
      images: stepsWithAiImages.map((s) => s.image_url).filter(Boolean),
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
