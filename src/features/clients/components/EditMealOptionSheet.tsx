import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Check, Pencil, Sparkles, X } from 'lucide-react-native';

import { usePlanBuilderStore } from '@/features/clients/planBuilderStore';
import {
  FOOD_GROUP_LABELS,
  FOOD_GROUPS,
  FoodItem,
} from '@/features/clients/planBuilderTypes';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

type Props = {
  visible: boolean;
  onClose: () => void;
  mealName: string;
  optionKey: 'option1' | 'option2';
  initialText: string;
  onSave: (updatedText: string) => void;
};

export function EditMealOptionSheet({
  visible,
  onClose,
  mealName,
  optionKey,
  initialText,
  onSave,
}: Props) {
  const { suggestions } = usePlanBuilderStore();
  const allActiveFoods = FOOD_GROUPS.flatMap((g) => suggestions[g]);

  const [selectedFoodIds, setSelectedFoodIds] = useState<string[]>(() => {
    return allActiveFoods
      .filter((food) => {
        const text = initialText.toLowerCase();
        return (
          text.includes(food.name.toLowerCase()) ||
          text.includes(food.name.slice(0, 5).toLowerCase())
        );
      })
      .map((f) => f.id);
  });

  const [customText, setCustomText] = useState(initialText);
  const [isManualEdit, setIsManualEdit] = useState(false);

  const optionTitle = optionKey === 'option1' ? 'Opción 1' : 'Opción 2';

  // Reconstruye el texto a partir de los IDs seleccionados
  function buildTextFromSelected(ids: string[]): string {
    const allFoods = FOOD_GROUPS.flatMap((g) => suggestions[g]);
    const items = ids
      .map((id) => allFoods.find((f) => f.id === id))
      .filter((f): f is FoodItem => f != null);

    return items.map((f) => `${f.name} (${f.quantity})`).join(' + ');
  }

  function handleToggleFood(food: FoodItem) {
    let nextIds: string[];
    if (selectedFoodIds.includes(food.id)) {
      nextIds = selectedFoodIds.filter((id) => id !== food.id);
    } else {
      nextIds = [...selectedFoodIds, food.id];
    }

    setSelectedFoodIds(nextIds);

    // Si no está en modo manual estricto, sincroniza el texto automáticamente
    if (!isManualEdit) {
      setCustomText(buildTextFromSelected(nextIds));
    }
  }

  function handleSave() {
    onSave(customText.trim());
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheetContainer}>
          {/* Header del Sheet */}
          <View style={styles.header}>
            <View style={styles.headerTitles}>
              <Text style={styles.sheetTitle}>
                {mealName} · {optionTitle}
              </Text>
              <Text style={styles.sheetSubtitle}>
                Selecciona los alimentos para esta opción
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <X size={s(18)} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Vista previa / Input del texto resultante */}
          <View style={styles.previewBox}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewLabel}>FÓRMULA / TEXTO DE LA OPCIÓN</Text>
              <Pressable
                onPress={() => setIsManualEdit((v) => !v)}
                style={styles.manualEditToggle}
              >
                {isManualEdit ? (
                  <Sparkles size={s(11)} color={colors.navy} />
                ) : (
                  <Pencil size={s(11)} color={colors.navy} />
                )}
                <Text style={styles.manualEditText}>
                  {isManualEdit ? 'Modo asistido' : 'Editar manualmente'}
                </Text>
              </Pressable>
            </View>

            {isManualEdit ? (
              <TextInput
                value={customText}
                onChangeText={setCustomText}
                placeholder="Escribe la combinación personalizada…"
                placeholderTextColor={colors.textMuted}
                multiline
                style={styles.textInputActive}
                autoFocus
              />
            ) : (
              <Text
                style={[
                  styles.previewText,
                  customText.length === 0 && styles.previewTextEmpty,
                ]}
              >
                {customText.length > 0
                  ? customText
                  : 'Ningún alimento seleccionado todavía (marca las opciones abajo)'}
              </Text>
            )}
          </View>

          {/* Checklist agrupado por categorías */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {FOOD_GROUPS.map((group) => {
              const groupFoods = suggestions[group].filter((f) => f.checked);
              if (groupFoods.length === 0) return null;

              return (
                <View key={group} style={styles.groupSection}>
                  <Text
                    style={[
                      styles.groupLabel,
                      group === 'suplementos' && styles.groupLabelDanger,
                    ]}
                  >
                    {FOOD_GROUP_LABELS[group]}
                  </Text>

                  {groupFoods.map((food) => {
                    const isSelected = selectedFoodIds.includes(food.id);
                    return (
                      <Pressable
                        key={food.id}
                        onPress={() => handleToggleFood(food)}
                        style={[
                          styles.foodRow,
                          isSelected && styles.foodRowSelected,
                        ]}
                      >
                        <View
                          style={[
                            styles.checkbox,
                            isSelected && styles.checkboxChecked,
                          ]}
                        >
                          {isSelected && (
                            <Check size={s(10)} color={colors.navy} strokeWidth={3} />
                          )}
                        </View>
                        <Text style={styles.foodName}>{food.name}</Text>
                        <View style={styles.quantityChip}>
                          <Text style={styles.quantityText}>{food.quantity}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              );
            })}
          </ScrollView>

          {/* Footer con acciones */}
          <View style={styles.footer}>
            <Pressable onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={handleSave} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>Guardar opción</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(18, 32, 61, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.modal,
    borderTopRightRadius: radius.modal,
    paddingTop: s(16),
    paddingHorizontal: s(16),
    paddingBottom: s(24),
    maxHeight: '85%',
    gap: s(10),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: s(6),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitles: { flex: 1 },
  sheetTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.base,
    color: colors.navy,
  },
  sheetSubtitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: s(28),
    height: s(28),
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: s(18),
    color: colors.textSecondary,
    fontFamily: fonts.bodyBold,
  },
  previewBox: {
    backgroundColor: '#F7F8FA',
    borderRadius: radius.card,
    padding: s(10),
    gap: s(6),
    borderWidth: 1,
    borderColor: '#DDE2EA',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: s(9),
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  manualEditToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(4),
    paddingVertical: s(3),
    paddingHorizontal: s(8),
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  manualEditText: {
    fontFamily: fonts.bodySemi,
    fontSize: s(9),
    color: colors.navy,
  },
  previewText: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.xs,
    color: colors.text,
    lineHeight: s(16),
  },
  previewTextEmpty: {
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  textInputActive: {
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.lime,
    padding: s(8),
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.text,
    minHeight: s(42),
    textAlignVertical: 'top',
  },
  scrollArea: {
    maxHeight: s(260),
  },
  scrollContent: {
    gap: s(10),
    paddingVertical: s(4),
  },
  groupSection: {
    gap: s(5),
  },
  groupLabel: {
    fontFamily: fonts.headingSemi,
    fontSize: s(10),
    color: colors.success,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  groupLabelDanger: {
    color: colors.danger,
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    paddingVertical: s(7),
    paddingHorizontal: s(9),
    borderWidth: 1,
    borderColor: '#EEF0F4',
  },
  foodRowSelected: {
    borderColor: colors.lime,
    backgroundColor: '#F9FCF5',
  },
  checkbox: {
    width: s(16),
    height: s(16),
    borderRadius: s(4),
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxChecked: {
    backgroundColor: colors.lime,
    borderColor: colors.lime,
  },
  checkMark: {
    color: colors.navy,
    fontFamily: fonts.bodyBold,
    fontSize: s(10),
    fontWeight: '800',
  },
  foodName: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.xs,
    color: colors.text,
  },
  quantityChip: {
    backgroundColor: colors.background,
    borderRadius: s(4),
    paddingVertical: s(2),
    paddingHorizontal: s(6),
  },
  quantityText: {
    fontFamily: fonts.bodyBold,
    fontSize: s(9),
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    gap: s(8),
    marginTop: s(4),
  },
  cancelBtn: {
    flex: 1,
    height: s(36),
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: s(10),
    color: colors.textSecondary,
  },
  saveBtn: {
    flex: 1.5,
    height: s(36),
    borderRadius: radius.button,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: s(10),
    color: colors.navy,
  },
});


