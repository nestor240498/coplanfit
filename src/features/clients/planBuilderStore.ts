import { create } from 'zustand';

import { supabase } from '@/lib/supabase';

import {
  emptySuggestions,
  FOOD_GROUPS,
  FoodGroup,
  FoodItem,
  FoodSuggestions,
  MealAssignments,
  MealSlot,
  Supplement,
} from './planBuilderTypes';
import {
  getLatestPlanVersion,
  getPlanDraft,
  PlanVersionData,
  savePlanDraft,
} from './plansRepository';

/** Forma cruda que devuelve la Edge Function: por grupo, {name, quantity, reason?} sin id/checked. */
type RawSuggestions = Record<FoodGroup, { name: string; quantity: string; reason?: string }[]>;

function toFoodSuggestions(raw: RawSuggestions): FoodSuggestions {
  const result = emptySuggestions();
  for (const group of FOOD_GROUPS) {
    result[group] = (raw[group] ?? []).map((item, i) => ({
      id: `ai-${group}-${i}-${Date.now()}`,
      name: item.name,
      quantity: item.quantity,
      reason: item.reason,
      checked: true,
    }));
  }
  return result;
}

type PlanBuilderState = {
  clientId: string | null;
  mealSlots: MealSlot[];
  waterLiters: string;
  supplements: Supplement[];
  aiNote: string;
  suggestions: FoodSuggestions;
  mealAssignments: MealAssignments;
  generating: boolean;
  generateError: string | null;

  /** Reinicia el estado si se entra al constructor de otro cliente. */
  ensureClient: (clientId: string) => void;
  initBuilderForNewPlan: (clientId: string) => Promise<void>;
  loadDraft: (clientId: string, draftData: PlanVersionData) => void;
  saveDraftToDb: (stepNumber: 1 | 2 | 3) => Promise<void>;

  addMealSlot: (slot: MealSlot) => void;
  removeMealSlot: (id: string) => void;
  moveMealSlot: (fromIndex: number, toIndex: number) => void;
  setMealSlots: (slots: MealSlot[]) => void;
  setWaterLiters: (v: string) => void;

  addSupplement: (supplement: Supplement) => void;
  updateSupplement: (supplement: Supplement) => void;
  removeSupplement: (id: string) => void;
  moveSupplement: (fromIndex: number, toIndex: number) => void;
  setSupplements: (supplements: Supplement[]) => void;

  setAiNote: (v: string) => void;

  generateSuggestions: () => Promise<void>;

  toggleFood: (group: FoodGroup, id: string) => void;
  updateFoodQuantity: (group: FoodGroup, id: string, quantity: string) => void;
  addFood: (group: FoodGroup, item: Omit<FoodItem, 'id' | 'checked'>) => void;

  setMealAssignment: (slotId: string, option: 'option1' | 'option2', value: string) => void;
  appendFoodToOption: (slotId: string, option: 'option1' | 'option2', foodText: string) => void;
  autoDistributeMeals: () => void;

  reset: () => void;
};

const initialSlice = {
  mealSlots: [] as MealSlot[],
  waterLiters: '',
  supplements: [] as Supplement[],
  aiNote: '',
  suggestions: emptySuggestions(),
  mealAssignments: {} as MealAssignments,
  generating: false,
  generateError: null as string | null,
};

export const usePlanBuilderStore = create<PlanBuilderState>((set, get) => ({
  clientId: null,
  ...initialSlice,

  ensureClient: (clientId) => {
    if (get().clientId !== clientId) {
      set({ clientId, ...initialSlice, suggestions: emptySuggestions(), mealAssignments: {} });
    }
  },

  initBuilderForNewPlan: async (clientId) => {
    // Si ya estamos trabajando en el mismo cliente y ya tiene slots cargados en memoria, no pisar
    if (get().clientId === clientId && (get().mealSlots.length > 0 || get().waterLiters !== '')) {
      return;
    }

    // 1. Revisar si hay un borrador guardado en BD
    const draft = await getPlanDraft(clientId).catch(() => null);
    if (draft?.data) {
      get().loadDraft(clientId, draft.data);
      return;
    }

    // 2. Si no hay borrador, cargar la configuración base del último plan vigente o anterior
    const latestPlan = await getLatestPlanVersion(clientId).catch(() => null);
    if (latestPlan?.data) {
      const prev = latestPlan.data;
      set({
        clientId,
        mealSlots: Array.isArray(prev.mealSlots) ? prev.mealSlots.map((slot) => ({ ...slot })) : [],
        waterLiters: prev.waterLiters ?? '',
        supplements: Array.isArray(prev.supplements) ? prev.supplements.map((sup) => ({ ...sup })) : [],
        aiNote: prev.aiNote ?? '',
        suggestions: emptySuggestions(),
        mealAssignments: {},
        generating: false,
        generateError: null,
      });
      return;
    }

    // 3. Si no tiene ningún plan previo, iniciar completamente vacío
    set({
      clientId,
      ...initialSlice,
      suggestions: emptySuggestions(),
      mealAssignments: {},
    });
  },

  loadDraft: (clientId, draftData) => {
    const defaultSug = emptySuggestions();
    const suggestions: FoodSuggestions = {
      carbohidratos: draftData.suggestions?.carbohidratos ?? defaultSug.carbohidratos,
      proteinas: draftData.suggestions?.proteinas ?? defaultSug.proteinas,
      vegetales: draftData.suggestions?.vegetales ?? defaultSug.vegetales,
      frutas: draftData.suggestions?.frutas ?? defaultSug.frutas,
      grasas: draftData.suggestions?.grasas ?? defaultSug.grasas,
      lacteos: draftData.suggestions?.lacteos ?? defaultSug.lacteos,
    };

    set({
      clientId,
      mealSlots: draftData.mealSlots ?? [],
      waterLiters: draftData.waterLiters ?? '',
      supplements: draftData.supplements ?? [],
      aiNote: draftData.aiNote ?? '',
      suggestions,
      mealAssignments: draftData.meals ?? {},
    });
  },

  saveDraftToDb: async (stepNumber) => {
    const { clientId, mealSlots, waterLiters, supplements, aiNote, suggestions, mealAssignments } =
      get();
    if (!clientId) return;

    await savePlanDraft(clientId, {
      mealSlots,
      waterLiters,
      supplements,
      aiNote,
      suggestions,
      meals: mealAssignments,
      savedStep: stepNumber,
    });
  },


  addMealSlot: (slot) =>
    set((s) => ({
      mealSlots: [...s.mealSlots, slot],
      mealAssignments: {
        ...s.mealAssignments,
        [slot.id]: s.mealAssignments[slot.id] ?? { option1: '', option2: '' },
      },
    })),
  removeMealSlot: (id) =>
    set((s) => {
      const nextAssignments = { ...s.mealAssignments };
      delete nextAssignments[id];
      return {
        mealSlots: s.mealSlots.filter((m) => m.id !== id),
        mealAssignments: nextAssignments,
      };
    }),
  setMealSlots: (mealSlots) => set({ mealSlots }),
  moveMealSlot: (fromIndex, toIndex) =>
    set((s) => {
      if (fromIndex < 0 || fromIndex >= s.mealSlots.length || toIndex < 0 || toIndex >= s.mealSlots.length) return s;
      const next = [...s.mealSlots];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return { mealSlots: next };
    }),
  setWaterLiters: (v) => set({ waterLiters: v }),

  addSupplement: (supplement) => set((s) => ({ supplements: [...s.supplements, supplement] })),
  updateSupplement: (supplement) =>
    set((s) => ({ supplements: s.supplements.map((sup) => (sup.id === supplement.id ? supplement : sup)) })),
  removeSupplement: (id) => set((s) => ({ supplements: s.supplements.filter((sup) => sup.id !== id) })),
  setSupplements: (supplements) => set({ supplements }),
  moveSupplement: (fromIndex, toIndex) =>
    set((s) => {
      if (fromIndex < 0 || fromIndex >= s.supplements.length || toIndex < 0 || toIndex >= s.supplements.length) return s;
      const next = [...s.supplements];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return { supplements: next };
    }),

  setAiNote: (v) => set({ aiNote: v }),

  generateSuggestions: async () => {
    const { clientId, mealSlots, waterLiters, supplements, aiNote } = get();
    if (clientId == null) return;
    set({ generating: true, generateError: null });
    try {
      const { data, error } = await supabase.functions.invoke('generate-plan-suggestions', {
        body: { clientId, mealSlots, waterLiters, supplements, aiNote },
      });
      if (error) throw new Error(error.message);
      const suggestions = toFoodSuggestions(data as RawSuggestions);
      set({ suggestions, generating: false });
    } catch (e) {
      set({ generateError: (e as Error).message, generating: false });
    }
  },

  toggleFood: (group, id) =>
    set((s) => ({
      suggestions: {
        ...s.suggestions,
        [group]: (s.suggestions[group] ?? []).map((f) => (f.id === id ? { ...f, checked: !f.checked } : f)),
      },
    })),

  updateFoodQuantity: (group, id, quantity) =>
    set((s) => ({
      suggestions: {
        ...s.suggestions,
        [group]: (s.suggestions[group] ?? []).map((f) => (f.id === id ? { ...f, quantity } : f)),
      },
    })),

  addFood: (group, item) =>
    set((s) => ({
      suggestions: {
        ...s.suggestions,
        [group]: [...(s.suggestions[group] ?? []), { ...item, id: `local-${Date.now()}`, checked: true }],
      },
    })),

  setMealAssignment: (slotId, option, value) =>
    set((s) => ({
      mealAssignments: {
        ...s.mealAssignments,
        [slotId]: {
          option1: s.mealAssignments[slotId]?.option1 ?? '',
          option2: s.mealAssignments[slotId]?.option2 ?? '',
          [option]: value,
        },
      },
    })),

  appendFoodToOption: (slotId, option, foodText) =>
    set((s) => {
      const current = s.mealAssignments[slotId]?.[option] ?? '';
      const updated = current.trim().length > 0 ? `${current.trim()} + ${foodText.trim()}` : foodText.trim();
      return {
        mealAssignments: {
          ...s.mealAssignments,
          [slotId]: {
            option1: s.mealAssignments[slotId]?.option1 ?? '',
            option2: s.mealAssignments[slotId]?.option2 ?? '',
            [option]: updated,
          },
        },
      };
    }),

  autoDistributeMeals: () => {
    const { mealSlots, suggestions } = get();
    const checkedProteins = (suggestions?.proteinas ?? []).filter((f) => f.checked);
    const checkedCarbs = (suggestions?.carbohidratos ?? []).filter((f) => f.checked);
    const checkedVegs = (suggestions?.vegetales ?? []).filter((f) => f.checked);
    const checkedFruits = (suggestions?.frutas ?? []).filter((f) => f.checked);
    const checkedFats = (suggestions?.grasas ?? []).filter((f) => f.checked);

    function getItem(arr: FoodItem[], idx: number): FoodItem | undefined {
      if (!arr || arr.length === 0) return undefined;
      return arr[idx % arr.length];
    }

    const newAssignments: MealAssignments = {};

    mealSlots.forEach((slot, index) => {
      const p1 = getItem(checkedProteins, index);
      const p2 = getItem(checkedProteins, index + 1);
      const c1 = getItem(checkedCarbs, index);
      const c2 = getItem(checkedCarbs, index + 1);
      const v1 = getItem(checkedVegs, index);
      const v2 = getItem(checkedVegs, index + 1);
      const fr1 = getItem(checkedFruits, index);
      const f1 = getItem(checkedFats, index);

      if (slot.type === 'merienda') {
        const op1Parts = [
          p1 ? `${p1.name} (${p1.quantity})` : '',
          fr1 ? `${fr1.name} (${fr1.quantity})` : '',
          f1 ? `${f1.name} (${f1.quantity})` : '',
        ].filter(Boolean);

        const op2Parts = [
          c1 ? `${c1.name} (${c1.quantity})` : '',
          p2 ? `${p2.name} (${p2.quantity})` : '',
        ].filter(Boolean);

        newAssignments[slot.id] = {
          option1: op1Parts.join(' + ') || 'Opción ligera 1',
          option2: op2Parts.join(' + ') || 'Opción ligera 2',
        };
      } else {
        const op1Parts = [
          p1 ? `${p1.name} (${p1.quantity})` : '',
          c1 ? `${c1.name} (${c1.quantity})` : '',
          v1 ? `${v1.name} (${v1.quantity})` : '',
        ].filter(Boolean);

        const op2Parts = [
          p2 ? `${p2.name} (${p2.quantity})` : '',
          c2 ? `${c2.name} (${c2.quantity})` : '',
          v2 ? `${v2.name} (${v2.quantity})` : '',
        ].filter(Boolean);

        newAssignments[slot.id] = {
          option1: op1Parts.join(' + ') || 'Opción principal 1',
          option2: op2Parts.join(' + ') || 'Opción alternativa 2',
        };
      }
    });

    set({ mealAssignments: newAssignments });
  },

  reset: () => set({ clientId: null, ...initialSlice, suggestions: emptySuggestions(), mealAssignments: {} }),
}));

