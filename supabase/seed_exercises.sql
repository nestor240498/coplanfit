-- CoplanFit — Seeder de Banco de Ejercicios Oficiales con Carrusel de Fotos de Pasos (JSONB)
-- Ejecuta este script en el SQL Editor de tu proyecto en Supabase (https://supabase.com/dashboard/project/nrdpvbfoatubnhxdpdoo/sql)

-- 1. Asegurar columnas images e image_url en la tabla exercises
alter table public.exercises
add column if not exists images jsonb default '[]',
add column if not exists image_url text;

-- 2. Limpiar ejercicios oficiales existentes para evitar duplicados al resembrar
delete from public.exercises where is_custom = false;

-- 3. Insertar ejercicios oficiales del catálogo CoplanFit
insert into public.exercises (name, muscle_group, secondary_muscles, equipment, difficulty, instructions, tips, images, is_custom)
values
-- PECHO
(
  'Press de banca plano con barra',
  'pecho',
  array['triceps', 'hombros'],
  'barra',
  'intermedio',
  '1. Posición inicial: Acuéstate en el banco plano, apoya los pies firmemente en el suelo y retrae las escápulas. Sujeta la barra con agarre prono un poco más ancho que los hombros.\n\n2. Fase excéntrica: Inhala y desciende la barra de forma controlada hacia la parte media del esternón, manteniendo los codos a 45-60° del torso.\n\n3. Fase concéntrica: Empuja con fuerza exhalando el aire hasta la extensión completa de los brazos sin bloquear codos bruscamente.',
  'Mantén los omóplatos retraídos y pegados al banco durante todo el levantamiento para proteger el manguito rotador.',
  '[
    "https://image.pollinations.ai/prompt/hyperrealistic%20fitness%20photography%2C%20athletic%20trainer%20demonstrating%20step%201%20setup%20of%20barbell%20bench%20press%20on%20flat%20bench%2C%20dark%20gym%2C%204k?width=600&height=450&nologo=true",
    "https://image.pollinations.ai/prompt/hyperrealistic%20fitness%20photography%2C%20athletic%20trainer%20demonstrating%20step%202%20eccentric%20lowering%20barbell%20to%20chest%2C%20dark%20gym%2C%204k?width=600&height=450&nologo=true",
    "https://image.pollinations.ai/prompt/hyperrealistic%20fitness%20photography%2C%20athletic%20trainer%20demonstrating%20step%203%20concentric%20press%20up%20lockout%2C%20dark%20gym%2C%204k?width=600&height=450&nologo=true"
  ]'::jsonb,
  false
),
(
  'Press inclinado con mancuernas',
  'pecho',
  array['hombros', 'triceps'],
  'mancuernas',
  'intermedio',
  '1. Posición inicial: En banco inclinado a 30-45°, sostén un par de mancuernas a la altura de los hombros con las escápulas retraídas.\n\n2. Fase excéntrica: Desciende las mancuernas en un arco suave sintiendo el estiramiento en la porción superior del pectoral.\n\n3. Fase concéntrica: Empuja verticalmente convergiendo ligeramente las mancuernas arriba sin chocarlas.',
  'Ideal para enfatizar la porción clavicular (haz superior) del pectoral.',
  '[
    "https://image.pollinations.ai/prompt/fitness%20athlete%20step%201%20setup%20incline%20dumbbell%20press%20in%20gym%2C%204k?width=600&height=450&nologo=true",
    "https://image.pollinations.ai/prompt/fitness%20athlete%20step%202%20lowering%20dumbbells%20incline%20bench%2C%204k?width=600&height=450&nologo=true",
    "https://image.pollinations.ai/prompt/fitness%20athlete%20step%203%20pressing%20dumbbells%20up%20incline%2C%204k?width=600&height=450&nologo=true"
  ]'::jsonb,
  false
),
(
  'Cruces de poleas en polea media / alta',
  'pecho',
  array['hombros'],
  'polea',
  'intermedio',
  '1. Posición inicial: Colócate en el centro de la estación de poleas con un pie adelantado, torso ligeramente inclinado y codos con ligera flexión fija.\n\n2. Fase excéntrica: Abre los brazos controlando la resistencia hasta sentir el estiramiento pectoral.\n\n3. Fase concéntrica: Junta los agarres frente al pecho contrayendo el pectoral al máximo 1 segundo.',
  'Mantén la flexión de los codos constante; no conviertas el cruce en un press.',
  '[
    "https://image.pollinations.ai/prompt/fitness%20athlete%20step%201%20cable%20crossover%20setup%2C%20gym%2C%204k?width=600&height=450&nologo=true",
    "https://image.pollinations.ai/prompt/fitness%20athlete%20step%202%20cable%20fly%20opening%20arms%2C%20gym%2C%204k?width=600&height=450&nologo=true",
    "https://image.pollinations.ai/prompt/fitness%20athlete%20step%203%20cable%20fly%20peak%20contraction%2C%20gym%2C%204k?width=600&height=450&nologo=true"
  ]'::jsonb,
  false
),

-- ESPALDA
(
  'Dominadas pronas',
  'espalda',
  array['biceps', 'hombros'],
  'peso_corporal',
  'avanzado',
  '1. Posición inicial: Cuélgate de la barra con agarre prono más ancho que los hombros.\n\n2. Fase concéntrica: Inicia deprimiendo las escápulas y tira con los dorsales llevando el pecho hacia la barra.\n\n3. Fase excéntrica: Desciende de forma controlada hasta la extensión completa de brazos.',
  'Evita el balanceo (kipping); busca una trayectoria vertical limpia y controlada.',
  '[
    "https://image.pollinations.ai/prompt/fitness%20athlete%20step%201%20pullup%20hanging%20setup%2C%20gym%2C%204k?width=600&height=450&nologo=true",
    "https://image.pollinations.ai/prompt/fitness%20athlete%20step%202%20pullup%20pulling%20chest%20to%20bar%2C%20gym%2C%204k?width=600&height=450&nologo=true",
    "https://image.pollinations.ai/prompt/fitness%20athlete%20step%203%20pullup%20controlled%20lowering%2C%20gym%2C%204k?width=600&height=450&nologo=true"
  ]'::jsonb,
  false
),
(
  'Jalón al pecho en polea alta',
  'espalda',
  array['biceps'],
  'polea',
  'principiante',
  '1. Posición inicial: Siéntate ajustando los cojines a los muslos, sujeta la barra con agarre prono ancho.\n\n2. Fase concéntrica: Tira de la barra hacia la clavícula llevando los codos hacia abajo y atrás.\n\n3. Fase excéntrica: Regresa el peso resistiendo la tracción hasta el estiramiento completo.',
  'Mantén el torso erguido con leve inclinación (10-15°); no uses el impulso lumbar.',
  '[
    "https://image.pollinations.ai/prompt/fitness%20athlete%20step%201%20lat%20pulldown%20grip%20setup%2C%20gym%2C%204k?width=600&height=450&nologo=true",
    "https://image.pollinations.ai/prompt/fitness%20athlete%20step%202%20lat%20pulldown%20pulling%20to%20chest%2C%20gym%2C%204k?width=600&height=450&nologo=true",
    "https://image.pollinations.ai/prompt/fitness%20athlete%20step%203%20lat%20pulldown%20return%20stretch%2C%20gym%2C%204k?width=600&height=450&nologo=true"
  ]'::jsonb,
  false
),
(
  'Remo con barra inclinado (90° o 45°)',
  'espalda',
  array['biceps', 'isquiotibiales'],
  'barra',
  'intermedio',
  '1. Posición inicial: De pie, flexiona caderas a 45° con la espalda neutra y sujeta la barra con agarre prono.\n\n2. Fase concéntrica: Tira de la barra hacia el ombligo manteniendo los codos cerca del cuerpo.\n\n3. Fase excéntrica: Baja la barra de forma controlada sin arquear la espalda.',
  'Excelente para grosor y densidad de dorsales, romboides y trapecio medio.',
  '[
    "https://image.pollinations.ai/prompt/fitness%20athlete%20step%201%20barbell%20bent%20over%20row%20hinge%20setup%2C%20gym%2C%204k?width=600&height=450&nologo=true",
    "https://image.pollinations.ai/prompt/fitness%20athlete%20step%202%20barbell%20row%20pulling%20to%20navel%2C%20gym%2C%204k?width=600&height=450&nologo=true",
    "https://image.pollinations.ai/prompt/fitness%20athlete%20step%203%20barbell%20row%20controlled%20lowering%2C%20gym%2C%204k?width=600&height=450&nologo=true"
  ]'::jsonb,
  false
),

-- CUÁDRICEPS & PIERNAS
(
  'Sentadilla trasera con barra (Back Squat)',
  'cuadriceps',
  array['gluteos', 'core'],
  'barra',
  'avanzado',
  '1. Posición inicial: Apoya la barra sobre los trapecios, pies a la anchura de hombros con ligera apertura de puntas.\n\n2. Fase excéntrica: Inicia flexionando cadera y rodillas al unísono hasta romper el paralelo (90°).\n\n3. Fase concéntrica: Empuja con fuerza distribuyendo el peso en todo el pie hasta la posición erguida.',
  'Mantén la presión intraabdominal (maniobra de Valsalva) para proteger la columna lumbar.',
  '[
    "https://image.pollinations.ai/prompt/fitness%20athlete%20step%201%20barbell%20back%20squat%20setup%2C%20gym%2C%204k?width=600&height=450&nologo=true",
    "https://image.pollinations.ai/prompt/fitness%20athlete%20step%202%20deep%20squat%20bottom%20parallel%2C%20gym%2C%204k?width=600&height=450&nologo=true",
    "https://image.pollinations.ai/prompt/fitness%20athlete%20step%203%20squat%20drive%20up%20standing%2C%20gym%2C%204k?width=600&height=450&nologo=true"
  ]'::jsonb,
  false
),
(
  'Prensa de piernas 45°',
  'cuadriceps',
  array['gluteos'],
  'maquina',
  'principiante',
  '1. Posición inicial: Siéntate en la máquina con la espalda y glúteos bien apoyados, pies al ancho de hombros en la plataforma.\n\n2. Fase excéntrica: Desbloquea los seguros y desciende la plataforma hasta formar 90° en las rodillas.\n\n3. Fase concéntrica: Empuja con toda la planta del pie extendiendo las piernas sin bloquear rodillas.',
  'Nunca permitas que la pelvis se despegue del respaldo en el punto más bajo (guiño de glúteo).',
  '[
    "https://image.pollinations.ai/prompt/fitness%20athlete%20step%201%20leg%20press%2045%20setup%2C%20gym%2C%204k?width=600&height=450&nologo=true",
    "https://image.pollinations.ai/prompt/fitness%20athlete%20step%202%20leg%20press%20knees%20bent%2090%20degrees%2C%20gym%2C%204k?width=600&height=450&nologo=true",
    "https://image.pollinations.ai/prompt/fitness%20athlete%20step%203%20leg%20press%20pushing%20up%2C%20gym%2C%204k?width=600&height=450&nologo=true"
  ]'::jsonb,
  false
),
(
  'Zancadas estáticas o búlgaras',
  'cuadriceps',
  array['gluteos', 'isquiotibiales'],
  'mancuernas',
  'intermedio',
  '1. Posición inicial: Un pie apoyado en el banco trasero y el otro adelantado en el suelo con torso erguido.\n\n2. Fase excéntrica: Desciende verticalmente hasta que el muslo delantero quede paralelo al suelo.\n\n3. Fase concéntrica: Empuja con el talón de la pierna delantera hasta la posición inicial.',
  'El mejor ejercicio unilateral para hipertrofia de cuádriceps y estabilidad de glúteo medio.',
  '[
    "https://image.pollinations.ai/prompt/fitness%20athlete%20step%201%20bulgarian%20split%20squat%20rear%20foot%20elevated%2C%20gym%2C%204k?width=600&height=450&nologo=true",
    "https://image.pollinations.ai/prompt/fitness%20athlete%20step%202%20bulgarian%20split%20squat%20deep%20lunge%2C%20gym%2C%204k?width=600&height=450&nologo=true",
    "https://image.pollinations.ai/prompt/fitness%20athlete%20step%203%20bulgarian%20split%20squat%20drive%20up%2C%20gym%2C%204k?width=600&height=450&nologo=true"
  ]'::jsonb,
  false
),

-- ISQUIOSURALES & GLÚTEOS
(
  'Peso muerto rumano con mancuernas o barra',
  'isquiotibiales',
  array['gluteos', 'core'],
  'mancuernas',
  'intermedio',
  '1. Posición inicial: De pie con la carga frente a los muslos y rodillas con micro-flexión fija.\n\n2. Fase excéntrica: Empuja la cadera hacia atrás en bisagra manteniendo la carga rozando las piernas hasta sentir estiramiento en los femorales.\n\n3. Fase concéntrica: Extiende la cadera hacia adelante contrayendo glúteos fuertemente arriba.',
  'El movimiento es una bisagra de cadera hacia atrás, no una flexión de rodillas ni de columna.',
  '[
    "https://image.pollinations.ai/prompt/fitness%20athlete%20step%201%20romanian%20deadlift%20standing%20setup%2C%20gym%2C%204k?width=600&height=450&nologo=true",
    "https://image.pollinations.ai/prompt/fitness%20athlete%20step%202%20romanian%20deadlift%20hip%20hinge%20stretch%2C%20gym%2C%204k?width=600&height=450&nologo=true",
    "https://image.pollinations.ai/prompt/fitness%20athlete%20step%203%20romanian%20deadlift%20lockout%20glutes%2C%20gym%2C%204k?width=600&height=450&nologo=true"
  ]'::jsonb,
  false
),
(
  'Hip Thrust con barra',
  'gluteos',
  array['isquiotibiales'],
  'barra',
  'intermedio',
  '1. Posición inicial: Escápulas apoyadas en el borde del banco, barra con almohadilla sobre la pelvis y pies a 90° al elevar.\n\n2. Fase concéntrica: Eleva la cadera empujando con los talones hasta alinear rodilla, cadera y hombro en línea recta.\n\n3. Fase excéntrica: Desciende la pelvis de forma controlada manteniendo la mirada al frente.',
  'Mantén el mentón pegado al pecho y aprieta los glúteos 2 segundos en el punto más alto.',
  '[
    "https://image.pollinations.ai/prompt/fitness%20athlete%20step%201%20barbell%20hip%20thrust%20setup%20on%20bench%2C%20gym%2C%204k?width=600&height=450&nologo=true",
    "https://image.pollinations.ai/prompt/fitness%20athlete%20step%202%20hip%20thrust%20bridge%20lockout%2C%20gym%2C%204k?width=600&height=450&nologo=true",
    "https://image.pollinations.ai/prompt/fitness%20athlete%20step%203%20hip%20thrust%20controlled%20lower%2C%20gym%2C%204k?width=600&height=450&nologo=true"
  ]'::jsonb,
  false
),

-- HOMBROS
(
  'Press militar con mancuernas o barra',
  'hombros',
  array['triceps'],
  'mancuernas',
  'intermedio',
  '1. Posición inicial: Sentado o de pie, mancuernas a la altura de las orejas con codos apuntando ligeramente hacia adelante.\n\n2. Fase concéntrica: Empuja la carga verticalmente sobre la cabeza hasta extender los brazos.\n\n3. Fase excéntrica: Desciende controlando el peso hasta la altura de la mandíbula.',
  'Evita arquear excesivamente la espalda baja; mantén el abdomen contraído firmemente.',
  '[
    "https://image.pollinations.ai/prompt/fitness%20athlete%20step%201%20overhead%20press%20rack%20position%2C%20gym%2C%204k?width=600&height=450&nologo=true",
    "https://image.pollinations.ai/prompt/fitness%20athlete%20step%202%20overhead%20press%20pressing%20up%2C%20gym%2C%204k?width=600&height=450&nologo=true",
    "https://image.pollinations.ai/prompt/fitness%20athlete%20step%203%20overhead%20press%20top%20lockout%2C%20gym%2C%204k?width=600&height=450&nologo=true"
  ]'::jsonb,
  false
),
(
  'Elevaciones laterales con mancuernas',
  'hombros',
  array['espalda'],
  'mancuernas',
  'principiante',
  '1. Posición inicial: De pie con mancuernas a los lados y ligera inclinación del torso hacia adelante.\n\n2. Fase concéntrica: Eleva los brazos lateralmente conduciendo con los codos hasta la altura de los hombros.\n\n3. Fase excéntrica: Baja las mancuernas lentamente resistiendo la gravedad.',
  'Imagina que viertes agua con una jarra en el punto alto para enfatizar el deltoides lateral.',
  '[
    "https://image.pollinations.ai/prompt/fitness%20athlete%20step%201%20dumbbell%20lateral%20raise%20standing%20sides%2C%20gym%2C%204k?width=600&height=450&nologo=true",
    "https://image.pollinations.ai/prompt/fitness%20athlete%20step%202%20lateral%20raise%20arms%20abducted%20shoulder%20level%2C%20gym%2C%204k?width=600&height=450&nologo=true",
    "https://image.pollinations.ai/prompt/fitness%20athlete%20step%203%20lateral%20raise%20slow%20descent%2C%20gym%2C%204k?width=600&height=450&nologo=true"
  ]'::jsonb,
  false
),

-- BÍCEPS & TRÍCEPS
(
  'Curl de bíceps con barra Z',
  'biceps',
  array['biceps'],
  'barra',
  'principiante',
  '1. Posición inicial: De pie con agarre supino en los ángulos de la barra Z, codos pegados a los costados.\n\n2. Fase concéntrica: Flexiona los codos subiendo la barra hacia los hombros sin adelantar los codos.\n\n3. Fase excéntrica: Desciende la barra extendiendo los brazos por completo en 2-3 segundos.',
  'La barra Z reduce la tensión en las muñecas en comparación con la barra recta.',
  '[
    "https://image.pollinations.ai/prompt/fitness%20athlete%20step%201%20ez%20bar%20bicep%20curl%20setup%2C%20gym%2C%204k?width=600&height=450&nologo=true",
    "https://image.pollinations.ai/prompt/fitness%20athlete%20step%202%20bicep%20curl%20top%20peak%20contraction%2C%20gym%2C%204k?width=600&height=450&nologo=true",
    "https://image.pollinations.ai/prompt/fitness%20athlete%20step%203%20bicep%20curl%20slow%20eccentric%20descent%2C%20gym%2C%204k?width=600&height=450&nologo=true"
  ]'::jsonb,
  false
),
(
  'Extensión de tríceps en polea con cuerda',
  'triceps',
  array[]::text[],
  'polea',
  'principiante',
  '1. Posición inicial: Frente a la polea alta, sujeta la cuerda con codos pegados a las costillas y torso inclinado 10°.\n\n2. Fase concéntrica: Extiende los antebrazos hacia abajo separando los extremos de la cuerda al final.\n\n3. Fase excéntrica: Flexiona los antebrazos hasta los 90° manteniendo los codos inmóviles.',
  'No muevas los codos hacia adelante y atrás; el único punto de pivote debe ser la articulación del codo.',
  '[
    "https://image.pollinations.ai/prompt/fitness%20athlete%20step%201%20tricep%20rope%20pushdown%20setup%2C%20gym%2C%204k?width=600&height=450&nologo=true",
    "https://image.pollinations.ai/prompt/fitness%20athlete%20step%202%20tricep%20pushdown%20extension%20lockout%2C%20gym%2C%204k?width=600&height=450&nologo=true",
    "https://image.pollinations.ai/prompt/fitness%20athlete%20step%203%20tricep%20pushdown%2090%20degree%20return%2C%20gym%2C%204k?width=600&height=450&nologo=true"
  ]'::jsonb,
  false
);
