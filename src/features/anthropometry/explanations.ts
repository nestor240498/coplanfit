/** Explicaciones en lenguaje llano de cada sección del análisis ISAK («¿Qué significa?»). */
export type ExplanationId =
  | 'resumen'
  | 'composicion'
  | 'tejidos'
  | 'distribucion'
  | 'somatotipo'
  | 'phantom'
  | 'proporcionalidad'
  | 'salud'
  | 'sumatorios'
  | 'indices'
  | 'calidad'
  | 'ecuaciones';

export const EXPLANATIONS: Record<ExplanationId, { title: string; body: string[] }> = {
  resumen: {
    title: 'Resumen',
    body: [
      'Las cifras clave de la evaluación y cómo han cambiado desde la anterior.',
      'La suma de pliegues es la forma más fiable de seguir la grasa entre evaluaciones: no depende de ninguna fórmula.',
    ],
  },
  composicion: {
    title: 'Masa grasa y masa libre de grasa',
    body: [
      'Divide el peso en dos partes: la grasa y todo lo demás (músculo, hueso, agua, órganos).',
      'El % de grasa se estima a partir de los pliegues con la ecuación indicada. Distintas ecuaciones dan cifras algo distintas: compara siempre con la misma.',
    ],
  },
  tejidos: {
    title: 'Composición por tejidos',
    body: [
      'Reparte el peso en cuatro tejidos: adiposo (la grasa con su agua y tejido de sostén), muscular (músculo esquelético), óseo y residual (órganos y vísceras).',
      'El tejido adiposo siempre pesa más que la «masa grasa» de arriba porque no es solo grasa pura.',
      'Fórmulas: Kerr (adiposo), Lee 2000 (muscular) y Rocha (óseo); el residual es lo que queda hasta el peso total.',
    ],
  },
  distribucion: {
    title: 'Distribución',
    body: [
      'Adiposa: qué parte de la grasa subcutánea está en la zona superior (brazo y espalda), central (abdomen y cadera) o inferior (piernas), según los pliegues.',
      'Muscular: cómo se reparte el músculo entre brazo, muslo y pierna, usando los perímetros corregidos por el pliegue.',
    ],
  },
  somatotipo: {
    title: 'Somatotipo',
    body: [
      'Describe la forma del cuerpo con tres números: endomorfia (adiposidad relativa), mesomorfia (desarrollo músculo-esquelético) y ectomorfia (linealidad, cuánto «estirado» es el cuerpo).',
      'Cada número va de 0,5 a 7 o más. El punto en la somatocarta muestra cuál domina; los puntos grises son las evaluaciones anteriores.',
    ],
  },
  phantom: {
    title: 'Proporcionalidad (Phantom)',
    body: [
      'Compara cada medida con la de un modelo humano de referencia ajustado a la misma talla.',
      '0 significa igual que la referencia; la franja gris (±1) es lo habitual. Positivo: mayor de lo esperado para su talla; negativo: menor.',
      'Es útil para ver qué zonas destacan, no para decir si algo está bien o mal.',
    ],
  },
  proporcionalidad: {
    title: 'Proporciones del cuerpo',
    body: [
      'Índice córmico: qué parte de la talla corresponde al tronco (tronco corto, medio o largo).',
      'Índice de Manouvrier: longitud de las piernas en relación con el tronco.',
      'Envergadura relativa: brazos en cruz frente a la talla. Mayor que 1 es frecuente en deportes de alcance.',
    ],
  },
  salud: {
    title: 'Índices de salud',
    body: [
      'Relacionan la cintura con la cadera, la talla y el peso. Una cintura grande indica más grasa abdominal, la más ligada a riesgo cardiometabólico.',
      'Cintura/talla: por debajo de 0,5 es bajo riesgo. Cintura/cadera (OMS): riesgo desde 0,90 en hombres y 0,85 en mujeres. Conicidad (Pitanga y Lessa): desde 1,25 en hombres y 1,18 en mujeres.',
      'El IMC no distingue músculo de grasa: en personas musculadas puede salir alto sin exceso de grasa.',
    ],
  },
  sumatorios: {
    title: 'Sumatorios y perímetros corregidos',
    body: [
      'Σ6 y Σ8 son la suma de 6 u 8 pliegues: si bajan, hay menos grasa subcutánea, sin depender de ninguna fórmula.',
      'Los perímetros corregidos restan el grosor del pliegue al perímetro: se acercan al perímetro del músculo.',
    ],
  },
  indices: {
    title: 'Índices de tejidos',
    body: [
      'Adiposo-muscular: cuántos kilos de tejido adiposo «carga» cada kilo de músculo. Cuanto menor, más eficiente al moverse.',
      'Músculo-óseo: kilos de músculo por cada kilo de hueso; indica cuánto músculo tiene para su estructura.',
    ],
  },
  calidad: {
    title: 'Calidad de la toma',
    body: [
      'El error técnico de medida (ETM) compara la 1.ª y la 2.ª lectura de cada punto. Cuanto más bajo, más fiable la evaluación.',
      'Referencias ISAK: bueno hasta 5 % en pliegues y 1 % en el resto de medidas.',
    ],
  },
  ecuaciones: {
    title: 'Otras ecuaciones',
    body: [
      'El % de grasa con cada ecuación disponible para estos pliegues. Durnin-Womersley es la recomendada para adultos; Faulkner y Carter, para deportistas; Slaughter, para menores de 18.',
    ],
  },
};
