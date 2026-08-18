export type MealType = 'comida' | 'merienda';

export type MealSlot = {
  id: string;
  name: string;
  /** "8:00am" — texto ya formateado, como lo muestra el mockup */
  time: string;
  type: MealType;
};

export const SUPPLEMENT_SCHEDULES = [
  'Cualquier hora',
  'En ayunas',
  'Antes de entrenar',
  'Después de entrenar',
  'Después de una comida',
  'Después de cierta hora',
] as const;

export type SupplementSchedule = (typeof SUPPLEMENT_SCHEDULES)[number];

export type Supplement = {
  id: string;
  name: string;
  dose: string;
  schedule: SupplementSchedule;
  /** Detalle libre cuando el horario necesita precisión ("después de almuerzo", "después de 6pm") */
  scheduleDetail?: string;
};

export const FOOD_GROUPS = ['carbohidratos', 'proteinas', 'vegetales', 'frutas', 'grasas', 'lacteos'] as const;
export type FoodGroup = (typeof FOOD_GROUPS)[number];

export const FOOD_GROUP_LABELS: Record<FoodGroup, string> = {
  carbohidratos: 'Carbohidratos',
  proteinas: 'Proteínas',
  vegetales: 'Vegetales',
  frutas: 'Frutas',
  grasas: 'Grasas',
  lacteos: 'Lácteos',
};

export type FoodItem = {
  id: string;
  name: string;
  quantity: string;
  checked: boolean;
  reason?: string;
};

export type FoodSuggestions = Record<FoodGroup, FoodItem[]>;

export function emptySuggestions(): FoodSuggestions {
  return { carbohidratos: [], proteinas: [], vegetales: [], frutas: [], grasas: [], lacteos: [] };
}

export type MealAssignment = {
  option1: string;
  option2: string;
};

export type MealAssignments = Record<string, MealAssignment>;


