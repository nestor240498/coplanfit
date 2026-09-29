-- ⚠️ SOLO PARA UNA BASE DE DATOS NUEVA. No ejecutar en producción: borra y vuelve a crear los
--    ejercicios oficiales con IDs nuevos, lo que rompe las rutinas, variantes (parent_id) y los datos
--    añadidos por las migraciones 008–010. Ojo: la clasificación de oficiales de migration_008 va por
--    los IDs de producción, así que en una base nueva hay que clasificarlos desde la app.
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
  '[]'::jsonb,
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
  '[]'::jsonb,
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
  '[]'::jsonb,
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
  '[]'::jsonb,
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
  '[]'::jsonb,
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
  '[]'::jsonb,
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
  '[]'::jsonb,
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
  '[]'::jsonb,
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
  '[]'::jsonb,
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
  '[]'::jsonb,
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
  '[]'::jsonb,
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
  '[]'::jsonb,
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
  '[]'::jsonb,
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
  '[]'::jsonb,
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
  '[]'::jsonb,
  false
);
